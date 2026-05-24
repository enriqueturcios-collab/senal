#!/usr/bin/env python3
"""
Ejecución manual del pipeline ETL.

Uso:
  python scripts/run_pipeline.py incremental
  python scripts/run_pipeline.py daily
  python scripts/run_pipeline.py sync-dimensions
  python scripts/run_pipeline.py full-refresh --from 2024-01-01 --to 2025-01-01
  python scripts/run_pipeline.py scheduler      # inicia el scheduler en primer plano
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import click
from datetime import date

from pipeline.logger import setup_logging, get_logger
from pipeline.pipeline import run_incremental, run_daily, run_full_refresh

log = get_logger('run_pipeline')


@click.group()
def cli() -> None:
    setup_logging()


@cli.command()
@click.option('--lookback-hours', default=None, type=int, help='Horas hacia atrás a procesar')
def incremental(lookback_hours: int | None) -> None:
    """Pipeline incremental — últimas N horas."""
    results = run_incremental(lookback_hours)
    _print_results(results)
    sys.exit(0 if all(r.status != 'failed' for r in results) else 1)


@cli.command()
@click.option('--date', 'target_date', default=None, type=click.DateTime(formats=['%Y-%m-%d']))
def daily(target_date: date | None) -> None:
    """Pipeline diario completo."""
    d = target_date.date() if target_date else None
    results = run_daily(d)
    _print_results(results)
    sys.exit(0 if all(r.status != 'failed' for r in results) else 1)


@cli.command('full-refresh')
@click.option('--from', 'date_from', required=True, type=click.DateTime(formats=['%Y-%m-%d']))
@click.option('--to',   'date_to',   required=True, type=click.DateTime(formats=['%Y-%m-%d']))
@click.option('--period-type', default='month', type=click.Choice(['month', 'week', 'quarter']))
def full_refresh(date_from: date, date_to: date, period_type: str) -> None:
    """Recalcula todo el pipeline para un rango de fechas (backfill)."""
    results = run_full_refresh(date_from.date(), date_to.date(), period_type)
    _print_results(results)
    sys.exit(0 if all(r.status != 'failed' for r in results) else 1)


@cli.command('sync-dimensions')
def sync_dimensions() -> None:
    """Sincroniza categorías y zonas al warehouse."""
    from pipeline.jobs.sync_dimensions import SyncDimensionsJob
    result = SyncDimensionsJob()()
    _print_results([result])
    sys.exit(0 if result.status != 'failed' else 1)


@cli.command()
def scheduler() -> None:
    """Inicia el scheduler en primer plano."""
    from pipeline.scheduler import start
    start()


def _print_results(results: list) -> None:
    from tabulate import tabulate
    rows = [
        [r.job_name, r.status, r.records_read, r.records_loaded, r.records_skipped, f'{r.duration_ms}ms']
        for r in results
    ]
    click.echo('\n' + tabulate(rows, headers=['Job', 'Status', 'Read', 'Loaded', 'Skipped', 'Duration']) + '\n')


if __name__ == '__main__':
    cli()
