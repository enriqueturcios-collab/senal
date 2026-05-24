"""
Job 4 — Cálculo de índices de mercado.

Normaliza los agregados en scores 0-100 y los escribe en
analytics.market_indices. Estos son los datos que consumen
los bancos a través de la API.
"""

from datetime import date
from typing import Any

from ..config import config
from ..db import call_function
from ..logger import get_logger
from .base import BaseJob, JobResult
from .refresh_aggregates import _period_value

log = get_logger('calculate_indices')


class CalculateIndicesJob(BaseJob):
    name = 'calculate_indices'

    def run(
        self,
        period_types: list[str] | None = None,
        target_date: date | None = None,
        **kwargs: Any,
    ) -> JobResult:

        result = JobResult(job_name=self.name, status='completed')
        types  = period_types or ['month', 'week']
        d      = target_date or date.today()
        total  = 0

        for period_type in types:
            pv = _period_value(period_type, d)
            self.log.info('calculating_indices', period_type=period_type, period_value=pv)

            if not config.dry_run:
                cells = call_function(
                    'SELECT analytics.calculate_market_indices(%s, %s)',
                    (period_type, pv),
                )
                count = cells or 0
            else:
                count = 0

            self.log.info('indices_calculated', period_type=period_type, period_value=pv, cells=count)
            total += count

        result.records_loaded = total
        return result


class CalculateIndicesRangeJob(BaseJob):
    name = 'calculate_indices_range'

    def run(
        self,
        date_from: date,
        date_to: date,
        period_type: str = 'month',
        **kwargs: Any,
    ) -> JobResult:

        result  = JobResult(job_name=self.name, status='completed')
        total   = 0
        current = date_from.replace(day=1)

        while current <= date_to:
            pv = _period_value(period_type, current)
            self.log.info('calculating', period_type=period_type, period_value=pv)

            if not config.dry_run:
                cells = call_function(
                    'SELECT analytics.calculate_market_indices(%s, %s)',
                    (period_type, pv),
                )
                total += cells or 0

            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

        result.records_loaded = total
        self.log.info('range_indices_done', total_cells=total)
        return result
