"""
Orchestrador principal del pipeline ETL.

Tres modos de ejecución:
  - incremental : extrae las últimas N horas → carga facts → refresca agregados
  - daily       : incremental + índices + tendencias + dimensiones
  - full_refresh: recalcula todo desde cero para un rango de fechas

Cada paso es idempotente. Puede interrumpirse y reejecutarse sin
duplicar datos ni corromperse el warehouse.
"""

from datetime import datetime, timezone, date, timedelta
from typing import Any

from .config import config
from .logger import get_logger, setup_logging
from .jobs.extract_demands import extract_demands, get_incremental_window, get_daily_window
from .jobs.load_facts import LoadFactsJob
from .jobs.refresh_aggregates import RefreshAggregatesJob, RefreshAggregatesRangeJob
from .jobs.calculate_indices import CalculateIndicesJob, CalculateIndicesRangeJob
from .jobs.update_trends import UpdateTrendsJob
from .jobs.sync_dimensions import SyncDimensionsJob
from .jobs.base import JobResult

log = get_logger('pipeline')


def run_incremental(lookback_hours: int | None = None) -> list[JobResult]:
    """
    Pipeline rápido — extrae las últimas N horas y actualiza agregados.
    Diseñado para correr cada hora.
    """
    log.info('pipeline_incremental_start')
    results: list[JobResult] = []

    date_from, date_to = get_incremental_window(lookback_hours)
    log.info('window', date_from=str(date_from), date_to=str(date_to))

    # 1. Extraer
    raw = extract_demands(date_from, date_to)
    log.info('extracted', records=len(raw))

    # 2. Anonimizar y cargar facts
    load_result = LoadFactsJob()(raw_records=raw)
    results.append(load_result)

    if load_result.records_loaded > 0:
        # 3. Refrescar agregados del período afectado (mes actual + semana actual)
        agg_result = RefreshAggregatesJob()(period_types=['month', 'week'])
        results.append(agg_result)

    log.info('pipeline_incremental_done',
             loaded=load_result.records_loaded,
             skipped=load_result.records_skipped)
    return results


def run_daily(target_date: date | None = None) -> list[JobResult]:
    """
    Pipeline completo diario.
    Diseñado para correr a las 02:00 (después del cierre del día anterior).

    Pasos:
      1. Sincronizar dimensiones
      2. Cargar demandas del día anterior
      3. Refrescar agregados (mes + semana + trimestre)
      4. Calcular índices de mercado
      5. Actualizar tendencias y resumen nacional
    """
    log.info('pipeline_daily_start')
    results: list[JobResult] = []
    d = target_date or date.today()

    # 1. Dimensiones
    dim_result = SyncDimensionsJob()()
    results.append(dim_result)

    # 2. Cargar día anterior completo
    date_from, date_to = get_daily_window()
    raw = extract_demands(date_from, date_to)
    load_result = LoadFactsJob()(raw_records=raw)
    results.append(load_result)

    # 3. Refrescar agregados (los tres períodos)
    agg_result = RefreshAggregatesJob()(
        period_types=['month', 'week', 'quarter'],
        target_date=d,
    )
    results.append(agg_result)

    # 4. Calcular índices
    idx_result = CalculateIndicesJob()(
        period_types=['month', 'week', 'quarter'],
        target_date=d,
    )
    results.append(idx_result)

    # 5. Tendencias y resumen nacional
    trend_result = UpdateTrendsJob()(period_type='month', target_date=d)
    results.append(trend_result)

    _log_summary(results, 'daily')
    return results


def run_full_refresh(
    date_from: date,
    date_to: date,
    period_type: str = 'month',
) -> list[JobResult]:
    """
    Recalcula todo el pipeline para un rango histórico.
    Útil para backfill inicial o después de cambios de algoritmo.

    ADVERTENCIA: puede tardar minutos u horas según el volumen de datos.
    """
    log.info('pipeline_full_refresh_start',
             date_from=str(date_from), date_to=str(date_to))
    results: list[JobResult] = []

    # 1. Dimensiones
    results.append(SyncDimensionsJob()())

    # 2. Cargar todos los datos históricos en chunks de 1 día
    current = date_from
    total_loaded = 0
    total_skipped = 0

    while current < date_to:
        next_day = current + timedelta(days=1)
        raw = extract_demands(
            datetime.combine(current,  datetime.min.time()).replace(tzinfo=timezone.utc),
            datetime.combine(next_day, datetime.min.time()).replace(tzinfo=timezone.utc),
        )
        if raw:
            r = LoadFactsJob()(raw_records=raw)
            total_loaded  += r.records_loaded
            total_skipped += r.records_skipped
        current = next_day

    load_summary = JobResult(job_name='load_facts_bulk', status='completed',
                              records_loaded=total_loaded, records_skipped=total_skipped)
    results.append(load_summary)
    log.info('bulk_load_done', loaded=total_loaded, skipped=total_skipped)

    # 3. Refrescar todos los agregados del rango
    agg_result = RefreshAggregatesRangeJob()(
        date_from=date_from, date_to=date_to, period_type=period_type
    )
    results.append(agg_result)

    # 4. Calcular índices para todo el rango
    idx_result = CalculateIndicesRangeJob()(
        date_from=date_from, date_to=date_to, period_type=period_type
    )
    results.append(idx_result)

    # 5. Tendencias mes a mes
    current = date_from.replace(day=1)
    while current <= date_to:
        results.append(UpdateTrendsJob()(period_type=period_type, target_date=current))
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    _log_summary(results, 'full_refresh')
    return results


def _log_summary(results: list[JobResult], pipeline_type: str) -> None:
    total_loaded  = sum(r.records_loaded  for r in results)
    total_skipped = sum(r.records_skipped for r in results)
    total_ms      = sum(r.duration_ms     for r in results)
    failed = [r.job_name for r in results if r.status == 'failed']

    log.info(
        'pipeline_done',
        pipeline=pipeline_type,
        total_loaded=total_loaded,
        total_skipped=total_skipped,
        duration_s=round(total_ms / 1000, 1),
        failed_jobs=failed or None,
    )
