"""
Job 2 — Carga de hechos anonimizados al warehouse.

Recibe AnonymizedDemand records y los inserta en analytics.fact_demands.
ON CONFLICT DO NOTHING garantiza idempotencia: correr dos veces el mismo
rango no duplica datos.
"""

from typing import Any
from ..anonymizer import AnonymizedDemand, anonymize_batch
from ..config import config
from ..db import execute_many, fetch_one
from ..logger import get_logger
from .base import BaseJob, JobResult

log = get_logger('load_facts')

INSERT_FACT_SQL = """
INSERT INTO analytics.fact_demands (
    demand_hash, category_id, subcategory_id, zone_id,
    budget_min, budget_max, currency,
    urgency_score, tag_count, offers_received,
    time_to_first_offer_h, time_to_close_h,
    was_transacted, transaction_amount,
    seller_verified, seller_avg_rating,
    demand_date, year, quarter, month, week
) VALUES (
    %s, %s, %s, %s,
    %s, %s, %s,
    %s, %s, %s,
    %s, %s,
    %s, %s,
    %s, %s,
    %s, %s, %s, %s, %s
)
ON CONFLICT (demand_hash) DO NOTHING
"""


class LoadFactsJob(BaseJob):
    name = 'load_facts'

    def run(self, raw_records: list[dict[str, Any]], **kwargs: Any) -> JobResult:
        result = JobResult(job_name=self.name, status='completed')
        result.records_read = len(raw_records)

        if not raw_records:
            result.status = 'skipped'
            return result

        # Anonimizar
        anonymized, skipped_consent, skipped_other = anonymize_batch(raw_records)
        result.records_skipped = skipped_consent + skipped_other

        self.log.info(
            'anonymization_done',
            total=len(raw_records),
            anonymized=len(anonymized),
            skipped_consent=skipped_consent,
            skipped_other=skipped_other,
        )

        if not anonymized:
            result.status = 'skipped'
            return result

        # Insertar en batches
        tuples = [r.as_tuple() for r in anonymized]

        if not config.dry_run:
            execute_many(INSERT_FACT_SQL, tuples)

        result.records_loaded = len(anonymized)
        return result


def get_already_loaded_hashes(demand_ids: list[str]) -> set[str]:
    """Verifica qué demand_hashes ya están en el warehouse (para logging)."""
    import hashlib
    hashes = {hashlib.sha256(str(id).encode()).hexdigest() for id in demand_ids}

    if not hashes:
        return set()

    placeholders = ','.join(['%s'] * len(hashes))
    from ..db import fetch_all
    rows = fetch_all(f"""
        SELECT demand_hash FROM analytics.fact_demands
        WHERE demand_hash IN ({placeholders})
    """, tuple(hashes))

    return {row['demand_hash'] for row in rows}
