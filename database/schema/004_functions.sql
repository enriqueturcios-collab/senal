-- =============================================================================
-- SEÑAL — FUNCIONES Y VISTAS ANALÍTICAS
-- Pipeline ETL, k-anonimidad, cálculo de índices.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ETL: ANONIMIZACIÓN Y CARGA AL WAREHOUSE
-- Corre nightly. Procesa demandas cerradas o expiradas del día anterior.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION analytics.etl_load_demands(
    p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '1 day',
    p_date_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    records_read    INT,
    records_loaded  INT,
    records_skipped INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_read    INT := 0;
    v_loaded  INT := 0;
    v_skipped INT := 0;
    v_job_id  BIGINT;
BEGIN
    -- Registrar inicio del job
    INSERT INTO analytics.etl_audit (job_name, period_processed, status)
    VALUES ('etl_load_demands', p_date_from::TEXT || ' to ' || p_date_to::TEXT, 'running')
    RETURNING id INTO v_job_id;

    -- Contar registros fuente
    SELECT COUNT(*) INTO v_read
    FROM app.demands d
    JOIN app.users u ON u.id = d.user_id
    WHERE d.created_at::date >= p_date_from
      AND d.created_at::date <  p_date_to
      AND d.status NOT IN ('draft')
      -- Solo incluir demandas de usuarios que consintieron el uso analítico
      AND u.consent_analytics = 'granted'
      AND u.anonymized_at IS NULL
      -- Excluir si ya fue cargado
      AND NOT EXISTS (
          SELECT 1 FROM analytics.fact_demands fd
          WHERE fd.demand_hash = encode(sha256(d.id::text::bytea), 'hex')
      );

    -- Insertar en warehouse con anonimización
    WITH source AS (
        SELECT
            d.id,
            encode(sha256(d.id::text::bytea), 'hex')        AS demand_hash,
            d.category_id,
            d.subcategory_id,
            d.zone_id,
            d.budget_min,
            d.budget_max,
            d.currency,
            CASE d.urgency
                WHEN 'low'       THEN 1
                WHEN 'medium'    THEN 2
                WHEN 'high'      THEN 3
                WHEN 'immediate' THEN 4
            END                                              AS urgency_score,
            (SELECT COUNT(*) FROM app.demand_tags dt WHERE dt.demand_id = d.id)::SMALLINT AS tag_count,
            d.offer_count,
            CASE
                WHEN d.offer_count > 0 THEN
                    EXTRACT(EPOCH FROM (
                        SELECT MIN(o.created_at) FROM app.offers o WHERE o.demand_id = d.id
                    ) - d.created_at) / 3600.0
                ELSE NULL
            END                                              AS time_to_first_offer_h,
            CASE
                WHEN d.closed_at IS NOT NULL THEN
                    EXTRACT(EPOCH FROM d.closed_at - d.created_at) / 3600.0
                ELSE NULL
            END                                              AS time_to_close_h,
            EXISTS(SELECT 1 FROM app.transactions t WHERE t.demand_id = d.id AND t.status = 'completed') AS was_transacted,
            (SELECT t.amount FROM app.transactions t WHERE t.demand_id = d.id AND t.status = 'completed' LIMIT 1) AS transaction_amount,
            (SELECT sp.verified FROM app.transactions t
             JOIN app.seller_profiles sp ON sp.user_id = t.seller_id
             WHERE t.demand_id = d.id AND t.status = 'completed' LIMIT 1) AS seller_verified,
            (SELECT sp.avg_rating FROM app.transactions t
             JOIN app.seller_profiles sp ON sp.user_id = t.seller_id
             WHERE t.demand_id = d.id AND t.status = 'completed' LIMIT 1) AS seller_avg_rating,
            d.created_at::date                               AS demand_date,
            EXTRACT(YEAR    FROM d.created_at)::SMALLINT     AS year,
            EXTRACT(QUARTER FROM d.created_at)::SMALLINT     AS quarter,
            EXTRACT(MONTH   FROM d.created_at)::SMALLINT     AS month,
            EXTRACT(WEEK    FROM d.created_at)::SMALLINT     AS week
        FROM app.demands d
        JOIN app.users u ON u.id = d.user_id
        WHERE d.created_at::date >= p_date_from
          AND d.created_at::date <  p_date_to
          AND d.status NOT IN ('draft')
          AND u.consent_analytics = 'granted'
          AND u.anonymized_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM analytics.fact_demands fd
              WHERE fd.demand_hash = encode(sha256(d.id::text::bytea), 'hex')
          )
    ),
    inserted AS (
        INSERT INTO analytics.fact_demands (
            demand_hash, category_id, subcategory_id, zone_id,
            budget_min, budget_max, currency,
            urgency_score, tag_count, offers_received,
            time_to_first_offer_h, time_to_close_h,
            was_transacted, transaction_amount,
            seller_verified, seller_avg_rating,
            demand_date, year, quarter, month, week,
            etl_job_id
        )
        SELECT
            demand_hash, category_id, subcategory_id, zone_id,
            budget_min, budget_max, currency,
            urgency_score, tag_count, offer_count,
            time_to_first_offer_h, time_to_close_h,
            was_transacted, transaction_amount,
            seller_verified, seller_avg_rating,
            demand_date, year, quarter, month, week,
            v_job_id
        FROM source
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_loaded FROM inserted;

    v_skipped := v_read - v_loaded;

    -- Actualizar registro del job
    UPDATE analytics.etl_audit
    SET
        records_read      = v_read,
        records_loaded    = v_loaded,
        records_suppressed_k_anon = v_skipped,
        records_anonymized = v_loaded,
        status            = 'completed',
        duration_ms       = EXTRACT(EPOCH FROM now() - run_at) * 1000
    WHERE id = v_job_id;

    RETURN QUERY SELECT v_read, v_loaded, v_skipped;

EXCEPTION WHEN OTHERS THEN
    UPDATE analytics.etl_audit
    SET status = 'failed', error_message = SQLERRM
    WHERE id = v_job_id;
    RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- RECALCULAR AGREGADOS — con k-anonimidad aplicada
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION analytics.refresh_aggregates(
    p_period_type  VARCHAR(10) DEFAULT 'month',
    p_period_value VARCHAR(10) DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    p_k_threshold  INT DEFAULT 5  -- umbral mínimo de k-anonimidad
)
RETURNS INT  -- número de celdas calculadas
LANGUAGE plpgsql AS $$
DECLARE
    v_period_start DATE;
    v_period_end   DATE;
    v_count        INT;
BEGIN
    -- Calcular fechas del período
    IF p_period_type = 'month' THEN
        v_period_start := TO_DATE(p_period_value, 'YYYY-MM');
        v_period_end   := v_period_start + INTERVAL '1 month';
    ELSIF p_period_type = 'week' THEN
        -- p_period_value formato '2025-W12'
        v_period_start := TO_DATE(p_period_value || ' Monday', 'IYYY-"W"IW Day');
        v_period_end   := v_period_start + INTERVAL '7 days';
    ELSIF p_period_type = 'quarter' THEN
        v_period_start := TO_DATE(SPLIT_PART(p_period_value, '-Q', 1) || '-' ||
                          ((SPLIT_PART(p_period_value, 'Q', 2)::INT - 1) * 3 + 1)::TEXT || '-01', 'YYYY-MM-DD');
        v_period_end   := v_period_start + INTERVAL '3 months';
    END IF;

    INSERT INTO analytics.agg_demand_by_zone_category (
        zone_id, category_id,
        period_type, period_value, period_start, period_end,
        demand_count, demand_count_suppressed,
        budget_p10, budget_p25, budget_p50, budget_p75, budget_p90, budget_avg,
        avg_offers_per_demand, demands_with_offers, transaction_rate,
        avg_time_to_close_h,
        unmet_demand_count, unmet_demand_rate,
        avg_urgency_score
    )
    SELECT
        fd.zone_id,
        fd.category_id,
        p_period_type,
        p_period_value,
        v_period_start,
        v_period_end,

        -- Aplicar k-anonimidad: si count < umbral, suprimir valor y marcar
        CASE WHEN COUNT(*) >= p_k_threshold THEN COUNT(*)::INT ELSE NULL END,
        COUNT(*) < p_k_threshold,

        -- Percentiles de presupuesto (solo si hay suficientes datos)
        CASE WHEN COUNT(*) >= p_k_threshold THEN PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY fd.budget_max) END,
        CASE WHEN COUNT(*) >= p_k_threshold THEN PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fd.budget_max) END,
        CASE WHEN COUNT(*) >= p_k_threshold THEN PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY fd.budget_max) END,
        CASE WHEN COUNT(*) >= p_k_threshold THEN PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fd.budget_max) END,
        CASE WHEN COUNT(*) >= p_k_threshold THEN PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY fd.budget_max) END,
        CASE WHEN COUNT(*) >= p_k_threshold THEN AVG(fd.budget_max) END,

        AVG(fd.offers_received),
        COUNT(CASE WHEN fd.offers_received > 0 THEN 1 END)::INT,
        AVG(CASE WHEN fd.was_transacted THEN 1.0 ELSE 0.0 END),
        AVG(fd.time_to_close_h),

        COUNT(CASE WHEN fd.offers_received = 0 THEN 1 END)::INT,
        AVG(CASE WHEN fd.offers_received = 0 THEN 1.0 ELSE 0.0 END),

        AVG(fd.urgency_score)

    FROM analytics.fact_demands fd
    WHERE fd.demand_date >= v_period_start
      AND fd.demand_date <  v_period_end
      AND fd.zone_id IS NOT NULL
    GROUP BY fd.zone_id, fd.category_id

    ON CONFLICT (zone_id, category_id, period_type, period_value)
    DO UPDATE SET
        demand_count            = EXCLUDED.demand_count,
        demand_count_suppressed = EXCLUDED.demand_count_suppressed,
        budget_p10              = EXCLUDED.budget_p10,
        budget_p25              = EXCLUDED.budget_p25,
        budget_p50              = EXCLUDED.budget_p50,
        budget_p75              = EXCLUDED.budget_p75,
        budget_p90              = EXCLUDED.budget_p90,
        budget_avg              = EXCLUDED.budget_avg,
        avg_offers_per_demand   = EXCLUDED.avg_offers_per_demand,
        demands_with_offers     = EXCLUDED.demands_with_offers,
        transaction_rate        = EXCLUDED.transaction_rate,
        avg_time_to_close_h     = EXCLUDED.avg_time_to_close_h,
        unmet_demand_count      = EXCLUDED.unmet_demand_count,
        unmet_demand_rate       = EXCLUDED.unmet_demand_rate,
        avg_urgency_score       = EXCLUDED.avg_urgency_score,
        calculated_at           = now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- CALCULAR ÍNDICES DE MERCADO
-- Normaliza los agregados en scores 0-100
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION analytics.calculate_market_indices(
    p_period_type  VARCHAR(10) DEFAULT 'month',
    p_period_value VARCHAR(10) DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM')
)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO analytics.market_indices (
        zone_id, category_id,
        period_type, period_value, period_start, period_end,

        demand_activity_index,
        unmet_demand_index,
        market_opportunity_score,
        category_growth_score,
        local_demand_strength,

        price_acceptance_p10,
        price_acceptance_p50,
        price_acceptance_p90,

        offer_response_rate,
        transaction_confirmation_rate,

        data_confidence,
        sample_size
    )
    WITH current_period AS (
        SELECT * FROM analytics.agg_demand_by_zone_category
        WHERE period_type = p_period_type AND period_value = p_period_value
          AND demand_count_suppressed = false
    ),
    prev_period AS (
        -- Período anterior para cálculo de crecimiento
        SELECT * FROM analytics.agg_demand_by_zone_category a2
        WHERE a2.period_type = p_period_type
          AND a2.period_start = (
              SELECT period_start - (period_end - period_start)
              FROM analytics.agg_demand_by_zone_category
              WHERE period_type = p_period_type AND period_value = p_period_value
              LIMIT 1
          )
          AND a2.demand_count_suppressed = false
    ),
    -- Estadísticas nacionales para normalización
    national_stats AS (
        SELECT
            AVG(demand_count)   AS avg_demand,
            STDDEV(demand_count) AS std_demand,
            AVG(unmet_demand_rate) AS avg_unmet
        FROM current_period
    )
    SELECT
        cp.zone_id,
        cp.category_id,
        p_period_type,
        p_period_value,
        cp.period_start,
        cp.period_end,

        -- Demand Activity Index: z-score normalizado a 0-100
        LEAST(100, GREATEST(0,
            50 + 50 * (cp.demand_count - ns.avg_demand) / NULLIF(ns.std_demand, 0)
        ))::DECIMAL(5,2),

        -- Unmet Demand Index: % directo × 100
        ROUND(cp.unmet_demand_rate * 100, 2),

        -- Market Opportunity Score: combina volumen + insatisfacción + urgencia
        LEAST(100, GREATEST(0,
            0.4 * LEAST(100, 50 + 50 * (cp.demand_count - ns.avg_demand) / NULLIF(ns.std_demand, 0))
          + 0.4 * (cp.unmet_demand_rate * 100)
          + 0.2 * ((cp.avg_urgency_score - 1) / 3.0 * 100)
        ))::DECIMAL(5,2),

        -- Category Growth Score: % cambio vs período anterior
        CASE
            WHEN pp.demand_count IS NOT NULL AND pp.demand_count > 0 THEN
                ROUND(((cp.demand_count - pp.demand_count)::DECIMAL / pp.demand_count) * 100, 2)
            ELSE NULL
        END,

        -- Local Demand Strength: ratio local vs nacional
        CASE
            WHEN ns.avg_demand > 0 THEN
                LEAST(100, ROUND((cp.demand_count::DECIMAL / ns.avg_demand) * 50, 2))
            ELSE NULL
        END,

        cp.budget_p10,
        cp.budget_p50,
        cp.budget_p90,

        -- Offer Response Rate
        CASE
            WHEN cp.demand_count > 0 THEN
                ROUND(cp.demands_with_offers::DECIMAL / cp.demand_count, 4)
            ELSE NULL
        END,

        -- Transaction Confirmation Rate
        cp.transaction_rate,

        -- Confianza del dato según volumen
        CASE
            WHEN cp.demand_count >= 50 THEN 'high'
            WHEN cp.demand_count >= 15 THEN 'medium'
            ELSE 'low'
        END,
        cp.demand_count

    FROM current_period cp
    CROSS JOIN national_stats ns
    LEFT JOIN prev_period pp ON pp.zone_id = cp.zone_id AND pp.category_id = cp.category_id

    ON CONFLICT (zone_id, category_id, period_type, period_value, algorithm_version)
    DO UPDATE SET
        demand_activity_index         = EXCLUDED.demand_activity_index,
        unmet_demand_index            = EXCLUDED.unmet_demand_index,
        market_opportunity_score      = EXCLUDED.market_opportunity_score,
        category_growth_score         = EXCLUDED.category_growth_score,
        local_demand_strength         = EXCLUDED.local_demand_strength,
        price_acceptance_p10          = EXCLUDED.price_acceptance_p10,
        price_acceptance_p50          = EXCLUDED.price_acceptance_p50,
        price_acceptance_p90          = EXCLUDED.price_acceptance_p90,
        offer_response_rate           = EXCLUDED.offer_response_rate,
        transaction_confirmation_rate = EXCLUDED.transaction_confirmation_rate,
        data_confidence               = EXCLUDED.data_confidence,
        sample_size                   = EXCLUDED.sample_size,
        calculated_at                 = now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- VISTAS B2B — interfaz limpia para la capa de API
-- Solo exponen datos sin PII y con k-anonimidad ya aplicada.
-- ---------------------------------------------------------------------------

-- Vista principal para el dashboard bancario
CREATE OR REPLACE VIEW analytics.v_demand_dashboard AS
SELECT
    mi.zone_id,
    dz.department_name,
    dz.municipality,
    dz.zone_name,
    mi.category_id,
    dc.name                             AS category_name,
    dc.full_path                        AS category_path,
    mi.period_type,
    mi.period_value,
    mi.period_start,
    mi.period_end,

    mi.demand_activity_index,
    mi.unmet_demand_index,
    mi.market_opportunity_score,
    mi.category_growth_score,
    mi.local_demand_strength,

    mi.price_acceptance_p10,
    mi.price_acceptance_p50,
    mi.price_acceptance_p90,

    mi.offer_response_rate,
    mi.transaction_confirmation_rate,

    a.demand_count,
    a.avg_urgency_score,
    a.unmet_demand_count,

    mi.data_confidence,
    mi.sample_size,
    mi.calculated_at
FROM analytics.market_indices mi
JOIN analytics.dim_zones       dz ON dz.id = mi.zone_id
JOIN analytics.dim_categories  dc ON dc.id = mi.category_id
JOIN analytics.agg_demand_by_zone_category a
  ON a.zone_id      = mi.zone_id
 AND a.category_id  = mi.category_id
 AND a.period_type  = mi.period_type
 AND a.period_value = mi.period_value
WHERE a.demand_count_suppressed = false;

-- Vista de oportunidades ordenadas por score (lo que el banco ve primero)
CREATE OR REPLACE VIEW analytics.v_market_opportunities AS
SELECT
    category_path,
    department_name,
    municipality,
    zone_name,
    period_value,
    market_opportunity_score,
    demand_activity_index,
    unmet_demand_index,
    category_growth_score,
    price_acceptance_p50    AS median_price,
    transaction_confirmation_rate,
    data_confidence,
    sample_size
FROM analytics.v_demand_dashboard
WHERE data_confidence IN ('medium', 'high')
ORDER BY market_opportunity_score DESC;

-- Vista de tendencias históricas por categoría
CREATE OR REPLACE VIEW analytics.v_category_trends AS
SELECT
    dc.name         AS category_name,
    dc.full_path    AS category_path,
    dt.period_type,
    dt.period_value,
    dt.period_start,
    dt.demand_count,
    dt.transaction_count,
    dt.avg_budget,
    dt.transaction_rate,
    dt.unmet_rate,
    dt.demand_pct_change    AS growth_pct
FROM analytics.demand_trends dt
JOIN analytics.dim_categories dc ON dc.id = dt.category_id
WHERE dt.demand_count IS NOT NULL  -- excluir suprimidos por k-anonimidad
ORDER BY dc.name, dt.period_start DESC;
