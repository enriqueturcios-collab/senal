"""
Job 5 — Actualización de series históricas de tendencias.

Calcula demand_trends y national_summary para el período indicado.
Incluye el cálculo de crecimiento porcentual respecto al período anterior.
"""

from datetime import date
from typing import Any

from ..config import config
from ..db import execute, fetch_one
from ..logger import get_logger
from .base import BaseJob, JobResult
from .refresh_aggregates import _period_value

log = get_logger('update_trends')


UPDATE_TRENDS_SQL = """
INSERT INTO analytics.demand_trends (
    category_id, zone_id,
    period_type, period_value, period_start,
    demand_count, transaction_count,
    avg_budget, transaction_rate, unmet_rate,
    demand_count_prev, demand_pct_change
)
WITH current_period AS (
    SELECT
        fd.category_id,
        fd.zone_id,
        COUNT(*)                                                         AS demand_count,
        COUNT(CASE WHEN fd.was_transacted THEN 1 END)                    AS transaction_count,
        AVG(fd.budget_max)                                               AS avg_budget,
        AVG(CASE WHEN fd.was_transacted THEN 1.0 ELSE 0.0 END)          AS transaction_rate,
        AVG(CASE WHEN fd.offers_received = 0 THEN 1.0 ELSE 0.0 END)     AS unmet_rate
    FROM analytics.fact_demands fd
    WHERE fd.demand_date >= %s AND fd.demand_date < %s
    GROUP BY fd.category_id, fd.zone_id
),
previous_period AS (
    SELECT
        dt.category_id,
        dt.zone_id,
        dt.demand_count AS prev_count
    FROM analytics.demand_trends dt
    WHERE dt.period_type  = %s
      AND dt.period_value = %s
      AND dt.zone_id IS NOT DISTINCT FROM NULL  -- nacional
),
previous_zone AS (
    SELECT
        dt.category_id,
        dt.zone_id,
        dt.demand_count AS prev_count
    FROM analytics.demand_trends dt
    WHERE dt.period_type  = %s
      AND dt.period_value = %s
      AND dt.zone_id IS NOT NULL
)
SELECT
    cp.category_id,
    cp.zone_id,
    %s AS period_type,
    %s AS period_value,
    %s::date AS period_start,
    CASE WHEN cp.demand_count >= %s THEN cp.demand_count ELSE NULL END,
    CASE WHEN cp.demand_count >= %s THEN cp.transaction_count ELSE NULL END,
    CASE WHEN cp.demand_count >= %s THEN ROUND(cp.avg_budget::numeric, 2) ELSE NULL END,
    CASE WHEN cp.demand_count >= %s THEN ROUND(cp.transaction_rate::numeric, 4) ELSE NULL END,
    CASE WHEN cp.demand_count >= %s THEN ROUND(cp.unmet_rate::numeric, 4) ELSE NULL END,
    COALESCE(pz.prev_count, pp.prev_count),
    CASE
        WHEN COALESCE(pz.prev_count, pp.prev_count) > 0 AND cp.demand_count >= %s THEN
            ROUND(((cp.demand_count - COALESCE(pz.prev_count, pp.prev_count))::numeric
                    / COALESCE(pz.prev_count, pp.prev_count)) * 100, 2)
        ELSE NULL
    END
FROM current_period cp
LEFT JOIN previous_zone pp ON pp.category_id = cp.category_id AND pp.zone_id IS NULL
LEFT JOIN previous_zone pz ON pz.category_id = cp.category_id AND pz.zone_id = cp.zone_id
ON CONFLICT (category_id, zone_id, period_type, period_value) DO UPDATE SET
    demand_count      = EXCLUDED.demand_count,
    transaction_count = EXCLUDED.transaction_count,
    avg_budget        = EXCLUDED.avg_budget,
    transaction_rate  = EXCLUDED.transaction_rate,
    unmet_rate        = EXCLUDED.unmet_rate,
    demand_count_prev = EXCLUDED.demand_count_prev,
    demand_pct_change = EXCLUDED.demand_pct_change,
    calculated_at     = now()
"""

UPDATE_NATIONAL_SQL = """
INSERT INTO analytics.national_summary (
    period_type, period_value, period_start,
    total_demands, total_transactions,
    overall_transaction_rate, overall_unmet_rate,
    top_categories, top_zones,
    avg_budget_national, new_categories_emerging
)
WITH stats AS (
    SELECT
        COUNT(*)                                                AS total_demands,
        COUNT(CASE WHEN was_transacted THEN 1 END)              AS total_transactions,
        AVG(CASE WHEN was_transacted THEN 1.0 ELSE 0.0 END)     AS overall_transaction_rate,
        AVG(CASE WHEN offers_received = 0 THEN 1.0 ELSE 0.0 END) AS overall_unmet_rate,
        AVG(budget_max)                                         AS avg_budget
    FROM analytics.fact_demands
    WHERE demand_date >= %s AND demand_date < %s
),
top_cats AS (
    SELECT
        category_id,
        COUNT(*) AS cnt
    FROM analytics.fact_demands
    WHERE demand_date >= %s AND demand_date < %s
    GROUP BY category_id
    ORDER BY cnt DESC
    LIMIT 10
),
top_zones AS (
    SELECT
        zone_id,
        COUNT(*) AS cnt
    FROM analytics.fact_demands
    WHERE demand_date >= %s AND demand_date < %s
      AND zone_id IS NOT NULL
    GROUP BY zone_id
    ORDER BY cnt DESC
    LIMIT 10
),
total_demands_count AS (
    SELECT SUM(cnt) AS total FROM top_cats
),
emerging AS (
    SELECT COUNT(*) AS cnt
    FROM analytics.demand_trends dt
    WHERE dt.period_type  = %s
      AND dt.period_value = %s
      AND dt.demand_pct_change > 20
      AND dt.zone_id IS NULL
)
SELECT
    %s, %s, %s::date,
    s.total_demands::int,
    s.total_transactions::int,
    ROUND(s.overall_transaction_rate::numeric, 4),
    ROUND(s.overall_unmet_rate::numeric, 4),
    (SELECT json_agg(json_build_object(
        'category_id', tc.category_id,
        'category',    dc.name,
        'count',       tc.cnt,
        'share',       ROUND((tc.cnt::numeric / NULLIF(tdc.total, 0)) * 100, 2)
    )) FROM top_cats tc
     JOIN analytics.dim_categories dc ON dc.id = tc.category_id
     CROSS JOIN total_demands_count tdc),
    (SELECT json_agg(json_build_object(
        'zone_id',  tz.zone_id,
        'zone',     dz.zone_name,
        'count',    tz.cnt
    )) FROM top_zones tz
     JOIN analytics.dim_zones dz ON dz.id = tz.zone_id),
    ROUND(s.avg_budget::numeric, 2),
    (SELECT cnt FROM emerging)::int
FROM stats s
ON CONFLICT (period_type, period_value) DO UPDATE SET
    total_demands            = EXCLUDED.total_demands,
    total_transactions       = EXCLUDED.total_transactions,
    overall_transaction_rate = EXCLUDED.overall_transaction_rate,
    overall_unmet_rate       = EXCLUDED.overall_unmet_rate,
    top_categories           = EXCLUDED.top_categories,
    top_zones                = EXCLUDED.top_zones,
    avg_budget_national      = EXCLUDED.avg_budget_national,
    new_categories_emerging  = EXCLUDED.new_categories_emerging,
    calculated_at            = now()
"""


class UpdateTrendsJob(BaseJob):
    name = 'update_trends'

    def run(
        self,
        period_type: str = 'month',
        target_date: date | None = None,
        **kwargs: Any,
    ) -> JobResult:

        result = JobResult(job_name=self.name, status='completed')
        d      = target_date or date.today()
        k      = config.k_anonymity_threshold

        pv      = _period_value(period_type, d)
        p_start, p_end = _period_bounds(period_type, d)

        # Período anterior
        prev_d      = _prev_period_date(period_type, d)
        prev_pv     = _period_value(period_type, prev_d)

        self.log.info('updating_trends', period_type=period_type, period_value=pv,
                      prev=prev_pv, start=str(p_start), end=str(p_end))

        if not config.dry_run:
            execute(UPDATE_TRENDS_SQL, (
                p_start, p_end,          # current period date range
                period_type, prev_pv,    # previous period (national)
                period_type, prev_pv,    # previous period (zone)
                period_type, pv,         # output period_type, period_value
                p_start,                 # output period_start
                k, k, k, k, k, k,       # k threshold (6 uses: count, transactions, budget, tx_rate, unmet_rate, growth)
            ))

            execute(UPDATE_NATIONAL_SQL, (
                p_start, p_end,   # stats
                p_start, p_end,   # top_cats
                p_start, p_end,   # top_zones
                period_type, pv,  # emerging
                period_type, pv, p_start,  # output fields
            ))

        result.records_loaded = 1
        return result


def _period_bounds(period_type: str, d: date) -> tuple[date, date]:
    from datetime import timedelta
    if period_type == 'month':
        start = d.replace(day=1)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)
        return start, end
    if period_type == 'week':
        start = d - timedelta(days=d.weekday())
        return start, start + timedelta(days=7)
    if period_type == 'quarter':
        q_month = ((d.month - 1) // 3) * 3 + 1
        start   = d.replace(month=q_month, day=1)
        end_m   = q_month + 3
        end_y   = d.year + (1 if end_m > 12 else 0)
        end_m   = end_m - 12 if end_m > 12 else end_m
        return start, date(end_y, end_m, 1)
    raise ValueError(f'Unknown period_type: {period_type}')


def _prev_period_date(period_type: str, d: date) -> date:
    from datetime import timedelta
    if period_type == 'month':
        if d.month == 1:
            return d.replace(year=d.year - 1, month=12)
        return d.replace(month=d.month - 1)
    if period_type == 'week':
        return d - timedelta(weeks=1)
    if period_type == 'quarter':
        return d - timedelta(days=92)
    raise ValueError(f'Unknown period_type: {period_type}')
