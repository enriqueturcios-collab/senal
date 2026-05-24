"""
Job 3 — Refresco de tablas agregadas con k-anonimidad aplicada.

Llama a analytics.refresh_aggregates() para recalcular las celdas
zona × categoría × período. Aplica el umbral de k-anonimidad:
celdas con menos de k registros aparecen con demand_count = NULL
y demand_count_suppressed = true.
"""

from datetime import date
from typing import Any

from ..config import config
from ..db import call_function
from ..logger import get_logger
from .base import BaseJob, JobResult

log = get_logger('refresh_aggregates')


def _period_value(period_type: str, d: date) -> str:
    if period_type == 'month':
        return d.strftime('%Y-%m')
    if period_type == 'week':
        iso = d.isocalendar()
        return f'{iso[0]}-W{iso[1]:02d}'
    if period_type == 'quarter':
        q = (d.month - 1) // 3 + 1
        return f'{d.year}-Q{q}'
    raise ValueError(f'Unknown period_type: {period_type}')


class RefreshAggregatesJob(BaseJob):
    name = 'refresh_aggregates'

    def run(
        self,
        period_types: list[str] | None = None,
        target_date: date | None = None,
        k_threshold: int | None = None,
        **kwargs: Any,
    ) -> JobResult:

        result   = JobResult(job_name=self.name, status='completed')
        types    = period_types or ['month', 'week']
        d        = target_date or date.today()
        k        = k_threshold or config.k_anonymity_threshold
        total    = 0

        for period_type in types:
            pv = _period_value(period_type, d)
            self.log.info('refreshing_aggregates', period_type=period_type, period_value=pv, k=k)

            if not config.dry_run:
                cells = call_function(
                    'SELECT analytics.refresh_aggregates(%s, %s, %s)',
                    (period_type, pv, k),
                )
                count = cells or 0
            else:
                count = 0

            self.log.info('aggregates_refreshed', period_type=period_type, period_value=pv, cells=count)
            total += count

        result.records_loaded = total
        return result


class RefreshAggregatesRangeJob(BaseJob):
    """Refresca un rango de períodos históricos (usado en backfill)."""
    name = 'refresh_aggregates_range'

    def run(
        self,
        date_from: date,
        date_to: date,
        period_type: str = 'month',
        k_threshold: int | None = None,
        **kwargs: Any,
    ) -> JobResult:

        result = JobResult(job_name=self.name, status='completed')
        k      = k_threshold or config.k_anonymity_threshold
        total  = 0

        # Iterar meses entre date_from y date_to
        from datetime import timedelta
        current = date_from.replace(day=1)

        while current <= date_to:
            pv = _period_value(period_type, current)
            self.log.info('refreshing', period_type=period_type, period_value=pv)

            if not config.dry_run:
                cells = call_function(
                    'SELECT analytics.refresh_aggregates(%s, %s, %s)',
                    (period_type, pv, k),
                )
                total += cells or 0

            # Avanzar al siguiente mes
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

        result.records_loaded = total
        self.log.info('range_refresh_done', total_cells=total)
        return result
