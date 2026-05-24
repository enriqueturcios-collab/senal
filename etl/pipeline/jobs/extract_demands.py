"""
Job 1 — Extracción de demandas desde la capa transaccional.

Extrae demandas nuevas o actualizadas desde app.demands junto con
todos los atributos necesarios para la anonimización. La query
hace los JOINs necesarios para que el anonymizer no necesite
acceder a la base transaccional.

Solo extrae registros de usuarios con consent_analytics = 'granted'.
"""

from datetime import datetime, timezone, timedelta
from typing import Any

from ..config import config
from ..db import fetch_all, fetch_one
from ..logger import get_logger

log = get_logger('extract_demands')

# Número máximo de registros por página durante extracción
_PAGE_SIZE = config.batch_size


EXTRACT_SQL = """
SELECT
    d.id,
    d.category_id,
    d.subcategory_id,
    d.zone_id,
    d.budget_min,
    d.budget_max,
    d.currency,
    d.urgency,
    d.status,
    d.offer_count,
    d.created_at,
    d.closed_at,

    -- Consentimiento del usuario
    u.consent_analytics,
    u.anonymized_at,

    -- Conteo de tags
    (SELECT COUNT(*) FROM app.demand_tags dt WHERE dt.demand_id = d.id) AS tag_count,

    -- Tiempo a primera oferta (horas)
    CASE
        WHEN d.offer_count > 0 THEN
            EXTRACT(EPOCH FROM (
                SELECT MIN(o.created_at)
                FROM app.offers o
                WHERE o.demand_id = d.id
            ) - d.created_at) / 3600.0
        ELSE NULL
    END AS time_to_first_offer_h,

    -- Tiempo hasta cierre (horas)
    CASE
        WHEN d.closed_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM d.closed_at - d.created_at) / 3600.0
        ELSE NULL
    END AS time_to_close_h,

    -- ¿Hubo transacción?
    EXISTS(
        SELECT 1 FROM app.transactions t
        WHERE t.demand_id = d.id AND t.status = 'completed'
    ) AS was_transacted,

    -- Monto de la transacción (si hubo)
    (SELECT t.amount
     FROM app.transactions t
     WHERE t.demand_id = d.id AND t.status = 'completed'
     LIMIT 1) AS transaction_amount,

    -- Atributos del oferente ganador (sin identificador)
    (SELECT sp.verified
     FROM app.transactions t
     JOIN app.seller_profiles sp ON sp.user_id = t.seller_id
     WHERE t.demand_id = d.id AND t.status = 'completed'
     LIMIT 1) AS seller_verified,

    (SELECT sp.avg_rating
     FROM app.transactions t
     JOIN app.seller_profiles sp ON sp.user_id = t.seller_id
     WHERE t.demand_id = d.id AND t.status = 'completed'
     LIMIT 1) AS seller_avg_rating

FROM app.demands d
JOIN app.users u ON u.id = d.user_id
WHERE d.created_at >= %s
  AND d.created_at <  %s
  AND d.status    <> 'draft'
  AND u.consent_analytics = 'granted'
  AND u.anonymized_at IS NULL
  AND NOT EXISTS (
      -- Idempotencia: saltar demandas ya cargadas al warehouse
      SELECT 1 FROM analytics.fact_demands fd
      WHERE fd.demand_hash = encode(sha256(d.id::text::bytea), 'hex')
  )
ORDER BY d.created_at
LIMIT %s OFFSET %s
"""

COUNT_SQL = """
SELECT COUNT(*) AS total
FROM app.demands d
JOIN app.users u ON u.id = d.user_id
WHERE d.created_at >= %s
  AND d.created_at <  %s
  AND d.status    <> 'draft'
  AND u.consent_analytics = 'granted'
  AND u.anonymized_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM analytics.fact_demands fd
      WHERE fd.demand_hash = encode(sha256(d.id::text::bytea), 'hex')
  )
"""


def extract_demands(
    date_from: datetime,
    date_to:   datetime,
) -> list[dict[str, Any]]:
    """
    Extrae todas las demandas en el rango dado, en páginas de batch_size.
    Devuelve lista de dicts crudos listos para pasar al anonymizer.
    """
    count_row = fetch_one(COUNT_SQL, (date_from, date_to))
    total = int(count_row['total']) if count_row else 0

    if total == 0:
        log.info('extract_demands_empty', date_from=str(date_from), date_to=str(date_to))
        return []

    log.info('extract_demands_start', total=total, date_from=str(date_from), date_to=str(date_to))

    all_records: list[dict[str, Any]] = []
    offset = 0

    while offset < total:
        page = fetch_all(EXTRACT_SQL, (date_from, date_to, _PAGE_SIZE, offset))
        all_records.extend(page)
        offset += _PAGE_SIZE
        log.debug('extract_page', fetched=len(page), offset=offset, total=total)

    log.info('extract_demands_done', records=len(all_records))
    return all_records


def get_incremental_window(lookback_hours: int | None = None) -> tuple[datetime, datetime]:
    """Devuelve (date_from, date_to) para el job incremental."""
    hours = lookback_hours or config.incremental_lookback_h
    now   = datetime.now(timezone.utc)
    return now - timedelta(hours=hours), now


def get_daily_window(target_date: datetime | None = None) -> tuple[datetime, datetime]:
    """Devuelve el rango del día anterior completo."""
    today = (target_date or datetime.now(timezone.utc)).replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
    )
    return today - timedelta(days=1), today
