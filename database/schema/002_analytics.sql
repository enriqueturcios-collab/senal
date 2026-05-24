-- =============================================================================
-- SEÑAL — SCHEMA ANALÍTICO (analytics / data warehouse)
-- Datos agregados y anonimizados. Alimentado por ETL desde schema app.
-- Esta capa es la fuente de verdad para productos B2B.
-- REGLA: ningún dato aquí debe permitir reidentificar a un usuario individual.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;

-- ---------------------------------------------------------------------------
-- DIMENSIONES (tablas de referencia del warehouse)
-- ---------------------------------------------------------------------------

-- Copia plana de categorías, sin vínculo directo a app.categories
CREATE TABLE analytics.dim_categories (
    id          INT         PRIMARY KEY,
    parent_id   INT         REFERENCES analytics.dim_categories(id),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    level       SMALLINT    NOT NULL DEFAULT 0,  -- 0=root, 1=sub, 2=sub-sub
    full_path   VARCHAR(500),                    -- ej: "Productos / Libros / Ficción"
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    synced_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dim_cat_parent ON analytics.dim_categories(parent_id);
CREATE INDEX idx_dim_cat_slug   ON analytics.dim_categories(slug);

-- Jerarquía geográfica anonimizada: solo hasta nivel zona (sin lat/lng exactas)
CREATE TABLE analytics.dim_zones (
    id              INT         PRIMARY KEY,
    country_code    CHAR(2)     NOT NULL,
    country_name    VARCHAR(100) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    municipality    VARCHAR(100) NOT NULL,
    zone_name       VARCHAR(100),
    zone_type       VARCHAR(50),
    lat_centroid    DECIMAL(7,4),   -- centroide de zona, NO posición de usuario
    lng_centroid    DECIMAL(7,4),
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dim_zones_country ON analytics.dim_zones(country_code);
CREATE INDEX idx_dim_zones_dept    ON analytics.dim_zones(department_name);

-- Dimensión de tiempo (calendar table)
CREATE TABLE analytics.dim_time (
    date_key        DATE        PRIMARY KEY,
    year            SMALLINT    NOT NULL,
    quarter         SMALLINT    NOT NULL,   -- 1-4
    month           SMALLINT    NOT NULL,   -- 1-12
    month_name      VARCHAR(20) NOT NULL,
    week            SMALLINT    NOT NULL,   -- ISO week number
    day_of_week     SMALLINT    NOT NULL,   -- 1=Mon ... 7=Sun
    is_weekend      BOOLEAN     NOT NULL,
    is_holiday_gt   BOOLEAN     NOT NULL DEFAULT false  -- feriados Guatemala
);

-- Poblar dim_time para 10 años
INSERT INTO analytics.dim_time
SELECT
    d::date,
    EXTRACT(YEAR    FROM d)::SMALLINT,
    EXTRACT(QUARTER FROM d)::SMALLINT,
    EXTRACT(MONTH   FROM d)::SMALLINT,
    TO_CHAR(d, 'Month'),
    EXTRACT(WEEK    FROM d)::SMALLINT,
    EXTRACT(ISODOW  FROM d)::SMALLINT,
    EXTRACT(ISODOW  FROM d) IN (6, 7)
FROM generate_series('2024-01-01'::date, '2034-12-31'::date, '1 day') d
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- TABLA DE HECHOS — DEMANDAS ANONIMIZADAS
-- Una fila por demanda. Sin PII. ETL corre nightly.
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.fact_demands (
    -- Surrogate key del warehouse
    id                      BIGSERIAL   PRIMARY KEY,

    -- Referencia opaca — hash SHA-256 del demand id original, no reversible
    demand_hash             CHAR(64)    NOT NULL UNIQUE,

    -- Dimensiones
    category_id             INT         NOT NULL REFERENCES analytics.dim_categories(id),
    subcategory_id          INT         REFERENCES analytics.dim_categories(id),
    zone_id                 INT         REFERENCES analytics.dim_zones(id),

    -- Presupuesto (se preserva el rango; sin relación al usuario)
    budget_min              DECIMAL(12,2),
    budget_max              DECIMAL(12,2),
    currency                CHAR(3)     NOT NULL DEFAULT 'GTQ',

    -- Atributos de la demanda
    urgency_score           SMALLINT    NOT NULL,  -- 1=low 2=medium 3=high 4=immediate
    tag_count               SMALLINT    NOT NULL DEFAULT 0,

    -- Atributos de respuesta del mercado
    offers_received         SMALLINT    NOT NULL DEFAULT 0,
    time_to_first_offer_h   DECIMAL(8,2),   -- horas; NULL si no recibió oferta
    time_to_close_h         DECIMAL(8,2),   -- horas; NULL si no cerró
    was_transacted          BOOLEAN     NOT NULL DEFAULT false,
    transaction_amount      DECIMAL(12,2),  -- NULL si no hubo transacción

    -- Atributos del oferente ganador (sin identificador)
    seller_verified         BOOLEAN,        -- NULL si no hubo transacción
    seller_avg_rating       DECIMAL(3,2),

    -- Atributos de tiempo (granularidad: día)
    demand_date             DATE        NOT NULL,
    year                    SMALLINT    NOT NULL,
    quarter                 SMALLINT    NOT NULL,
    month                   SMALLINT    NOT NULL,
    week                    SMALLINT    NOT NULL,

    -- Control ETL
    etl_loaded_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    etl_job_id              BIGINT,

    CONSTRAINT chk_urgency_range CHECK (urgency_score BETWEEN 1 AND 4)
);

CREATE INDEX idx_fact_demands_category  ON analytics.fact_demands(category_id);
CREATE INDEX idx_fact_demands_zone      ON analytics.fact_demands(zone_id);
CREATE INDEX idx_fact_demands_date      ON analytics.fact_demands(demand_date DESC);
CREATE INDEX idx_fact_demands_status    ON analytics.fact_demands(was_transacted);
CREATE INDEX idx_fact_demands_cat_zone  ON analytics.fact_demands(category_id, zone_id, demand_date DESC);
CREATE INDEX idx_fact_demands_year_mo   ON analytics.fact_demands(year, month);

-- ---------------------------------------------------------------------------
-- AGREGADOS PRECALCULADOS — por zona, categoría y período
-- Refresh: diario (o cada 6h si el volumen lo requiere)
-- Aplica k-anonimidad: solo se publica si demand_count >= 5
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.agg_demand_by_zone_category (
    id                      BIGSERIAL   PRIMARY KEY,
    zone_id                 INT         NOT NULL REFERENCES analytics.dim_zones(id),
    category_id             INT         NOT NULL REFERENCES analytics.dim_categories(id),
    period_type             VARCHAR(10) NOT NULL,   -- 'week' | 'month' | 'quarter'
    period_value            VARCHAR(10) NOT NULL,   -- '2025-W12' | '2025-03' | '2025-Q1'
    period_start            DATE        NOT NULL,
    period_end              DATE        NOT NULL,

    -- Volumen (NULL si < 5 — k-anonimidad)
    demand_count            INT,
    demand_count_suppressed BOOLEAN     NOT NULL DEFAULT false,

    -- Presupuesto (percentiles)
    budget_p10              DECIMAL(12,2),
    budget_p25              DECIMAL(12,2),
    budget_p50              DECIMAL(12,2),
    budget_p75              DECIMAL(12,2),
    budget_p90              DECIMAL(12,2),
    budget_avg              DECIMAL(12,2),

    -- Comportamiento de mercado
    avg_offers_per_demand   DECIMAL(6,2),
    demands_with_offers     INT,
    transaction_rate        DECIMAL(5,4),   -- 0.0 - 1.0
    avg_time_to_close_h     DECIMAL(8,2),

    -- Demanda insatisfecha
    unmet_demand_count      INT,            -- demandas sin ninguna oferta
    unmet_demand_rate       DECIMAL(5,4),

    -- Urgencia promedio
    avg_urgency_score       DECIMAL(4,2),

    -- Control
    calculated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (zone_id, category_id, period_type, period_value)
);

CREATE INDEX idx_agg_zone_cat_period ON analytics.agg_demand_by_zone_category(category_id, zone_id, period_type, period_start DESC);
CREATE INDEX idx_agg_period_start    ON analytics.agg_demand_by_zone_category(period_start DESC);

-- ---------------------------------------------------------------------------
-- ÍNDICES DE MERCADO — el producto analítico principal
-- Calculados sobre los agregados. Versión semántica para clientes B2B.
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.market_indices (
    id                              BIGSERIAL   PRIMARY KEY,
    zone_id                         INT         NOT NULL REFERENCES analytics.dim_zones(id),
    category_id                     INT         NOT NULL REFERENCES analytics.dim_categories(id),
    period_type                     VARCHAR(10) NOT NULL,
    period_value                    VARCHAR(10) NOT NULL,
    period_start                    DATE        NOT NULL,
    period_end                      DATE        NOT NULL,

    -- Índices normalizados 0-100 salvo indicación
    demand_activity_index           DECIMAL(5,2),   -- volumen relativo de demanda activa
    unmet_demand_index              DECIMAL(5,2),   -- % demanda sin respuesta (× 100)
    market_opportunity_score        DECIMAL(5,2),   -- combinación de volumen + insatisfacción
    category_growth_score           DECIMAL(6,2),   -- cambio % vs período anterior (-100..+∞)
    local_demand_strength           DECIMAL(5,2),   -- demanda local vs media nacional
    entrepreneurial_demand_signal   DECIMAL(5,2),   -- actividad de demandantes nuevos

    -- Rangos de precio aceptados
    price_acceptance_p10            DECIMAL(12,2),
    price_acceptance_p50            DECIMAL(12,2),
    price_acceptance_p90            DECIMAL(12,2),

    -- Tasas de interacción
    offer_response_rate             DECIMAL(5,4),   -- demandas que recibieron ≥1 oferta
    transaction_confirmation_rate   DECIMAL(5,4),   -- ofertas que derivaron en transacción

    -- Señal de datos suficientes para publicar
    data_confidence                 VARCHAR(10) NOT NULL DEFAULT 'low',  -- low|medium|high
    sample_size                     INT,            -- demandas base del cálculo

    -- Versionado del algoritmo
    algorithm_version               VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    calculated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (zone_id, category_id, period_type, period_value, algorithm_version)
);

CREATE INDEX idx_indices_cat_zone    ON analytics.market_indices(category_id, zone_id, period_start DESC);
CREATE INDEX idx_indices_opportunity ON analytics.market_indices(market_opportunity_score DESC) WHERE data_confidence IN ('medium','high');

-- ---------------------------------------------------------------------------
-- SERIES HISTÓRICAS — para análisis de tendencias
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.demand_trends (
    id                  BIGSERIAL   PRIMARY KEY,
    category_id         INT         NOT NULL REFERENCES analytics.dim_categories(id),
    zone_id             INT         REFERENCES analytics.dim_zones(id),  -- NULL = nacional
    period_type         VARCHAR(10) NOT NULL,
    period_value        VARCHAR(10) NOT NULL,
    period_start        DATE        NOT NULL,

    demand_count        INT,                    -- NULL si suprimido por k-anonimidad
    transaction_count   INT,
    avg_budget          DECIMAL(12,2),
    transaction_rate    DECIMAL(5,4),
    unmet_rate          DECIMAL(5,4),

    -- Comparación período anterior
    demand_count_prev   INT,
    demand_pct_change   DECIMAL(7,2),

    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (category_id, zone_id, period_type, period_value)
);

CREATE INDEX idx_trends_cat_period ON analytics.demand_trends(category_id, period_start DESC);
CREATE INDEX idx_trends_zone       ON analytics.demand_trends(zone_id, period_start DESC);

-- ---------------------------------------------------------------------------
-- RESUMEN NACIONAL — para reportes macro y plan Research
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.national_summary (
    id                          BIGSERIAL   PRIMARY KEY,
    period_type                 VARCHAR(10) NOT NULL,
    period_value                VARCHAR(10) NOT NULL,
    period_start                DATE        NOT NULL,

    total_demands               INT         NOT NULL,
    total_transactions          INT         NOT NULL,
    overall_transaction_rate    DECIMAL(5,4),
    overall_unmet_rate          DECIMAL(5,4),
    top_categories              JSONB,      -- [{category_id, count, share}]
    top_zones                   JSONB,      -- [{zone_id, count, share}]
    avg_budget_national         DECIMAL(12,2),
    new_categories_emerging     INT,        -- categorías con crecimiento > 20% MoM
    calculated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (period_type, period_value)
);

-- ---------------------------------------------------------------------------
-- AUDITORÍA ETL
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.etl_audit (
    id                          BIGSERIAL   PRIMARY KEY,
    job_name                    VARCHAR(100) NOT NULL,
    run_at                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    period_processed            VARCHAR(20),
    records_read                INT          NOT NULL DEFAULT 0,
    records_anonymized          INT          NOT NULL DEFAULT 0,
    records_suppressed_k_anon   INT          NOT NULL DEFAULT 0,  -- suprimidos por k < 5
    records_loaded              INT          NOT NULL DEFAULT 0,
    duration_ms                 INT,
    status                      VARCHAR(20)  NOT NULL,  -- running|completed|failed
    error_message               TEXT,
    checksum                    CHAR(64)     -- SHA-256 del batch procesado
);

CREATE INDEX idx_etl_audit_job ON analytics.etl_audit(job_name, run_at DESC);
