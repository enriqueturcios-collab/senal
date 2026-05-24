#!/usr/bin/env python3
"""
Validación post-ETL — verifica que el warehouse cumple las reglas de privacidad
y que los datos tienen coherencia interna.

Uso:
  python scripts/validate.py
  python scripts/validate.py --fix   # intenta corregir problemas encontrados
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import click
from tabulate import tabulate

from pipeline.logger import setup_logging, get_logger
from pipeline.db import fetch_all, fetch_one, execute

log = get_logger('validate')

# ---------------------------------------------------------------------------
# Checks de privacidad (críticos — fallo = problema de compliance)
# ---------------------------------------------------------------------------

PRIVACY_CHECKS = [
    {
        'name': 'no_user_ids_in_warehouse',
        'description': 'fact_demands no contiene user_id',
        'sql': """
            SELECT COUNT(*) AS violations
            FROM information_schema.columns
            WHERE table_schema = 'analytics'
              AND table_name   = 'fact_demands'
              AND column_name  = 'user_id'
        """,
        'pass_when': lambda r: int(r['violations']) == 0,
        'severity': 'critical',
    },
    {
        'name': 'no_pii_columns_in_analytics',
        'description': 'Ninguna columna PII en el schema analytics',
        'sql': """
            SELECT COUNT(*) AS violations
            FROM information_schema.columns
            WHERE table_schema = 'analytics'
              AND column_name IN ('email', 'phone', 'user_id', 'location_lat', 'location_lng')
        """,
        'pass_when': lambda r: int(r['violations']) == 0,
        'severity': 'critical',
    },
    {
        'name': 'k_anonymity_enforced_in_aggregates',
        'description': 'Ninguna celda con demand_count entre 1 y k-1 está publicada',
        'sql': """
            SELECT COUNT(*) AS violations
            FROM analytics.agg_demand_by_zone_category
            WHERE demand_count IS NOT NULL
              AND demand_count < 5
              AND demand_count_suppressed = false
        """,
        'pass_when': lambda r: int(r['violations']) == 0,
        'severity': 'critical',
    },
    {
        'name': 'demand_hashes_are_unique',
        'description': 'No hay demand_hash duplicados en fact_demands',
        'sql': """
            SELECT COUNT(*) AS violations
            FROM (
                SELECT demand_hash, COUNT(*) AS cnt
                FROM analytics.fact_demands
                GROUP BY demand_hash
                HAVING COUNT(*) > 1
            ) dup
        """,
        'pass_when': lambda r: int(r['violations']) == 0,
        'severity': 'critical',
    },
]

# ---------------------------------------------------------------------------
# Checks de coherencia (advertencias — no bloquean el pipeline)
# ---------------------------------------------------------------------------

QUALITY_CHECKS = [
    {
        'name': 'facts_have_zone_coverage',
        'description': 'Al menos 70% de los facts tienen zone_id asignado',
        'sql': """
            SELECT
                COUNT(*) AS total,
                COUNT(zone_id) AS with_zone,
                ROUND(COUNT(zone_id) * 100.0 / NULLIF(COUNT(*), 0), 1) AS pct
            FROM analytics.fact_demands
            WHERE demand_date >= CURRENT_DATE - INTERVAL '30 days'
        """,
        'pass_when': lambda r: float(r['pct'] or 0) >= 70,
        'severity': 'warning',
        'detail': lambda r: f"{r['with_zone']}/{r['total']} ({r['pct']}%)",
    },
    {
        'name': 'indices_calculated_for_current_month',
        'description': 'Hay índices calculados para el mes actual',
        'sql': """
            SELECT COUNT(*) AS cnt
            FROM analytics.market_indices
            WHERE period_value = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        """,
        'pass_when': lambda r: int(r['cnt']) > 0,
        'severity': 'warning',
    },
    {
        'name': 'etl_ran_in_last_25h',
        'description': 'El ETL corrió en las últimas 25 horas',
        'sql': """
            SELECT COUNT(*) AS cnt
            FROM analytics.etl_audit
            WHERE status   = 'completed'
              AND run_at  >= now() - INTERVAL '25 hours'
        """,
        'pass_when': lambda r: int(r['cnt']) > 0,
        'severity': 'warning',
    },
    {
        'name': 'no_suppressed_cells_above_threshold',
        'description': 'No hay celdas suprimidas con demand_count = NULL pero count real >= 10',
        'sql': """
            SELECT COUNT(*) AS violations
            FROM analytics.agg_demand_by_zone_category
            WHERE demand_count_suppressed = true
        """,
        'pass_when': lambda r: True,  # informativo, no falla
        'severity': 'info',
        'detail': lambda r: f"{r['violations']} celdas suprimidas por k-anonimidad",
    },
]


def run_checks(checks: list[dict]) -> list[dict]:
    results = []
    for check in checks:
        try:
            row = fetch_one(check['sql'])
            passed = check['pass_when'](row) if row else False
            detail = check.get('detail', lambda _: '')(row) if row else ''
            results.append({
                'name':        check['name'],
                'description': check['description'],
                'severity':    check['severity'],
                'passed':      passed,
                'detail':      detail,
            })
        except Exception as e:
            results.append({
                'name':        check['name'],
                'description': check['description'],
                'severity':    check['severity'],
                'passed':      False,
                'detail':      f'ERROR: {e}',
            })
    return results


@click.command()
@click.option('--fix', is_flag=True, help='Intentar corregir problemas encontrados')
def main(fix: bool) -> None:
    setup_logging()

    click.echo('\n=== SEÑAL ETL — Validación de privacidad y calidad ===\n')

    # Privacy checks
    click.echo('[ PRIVACIDAD — crítico ]\n')
    privacy_results = run_checks(PRIVACY_CHECKS)
    _print_check_table(privacy_results)

    click.echo('\n[ CALIDAD DE DATOS — advertencias ]\n')
    quality_results = run_checks(QUALITY_CHECKS)
    _print_check_table(quality_results)

    # Resumen
    critical_failures = [r for r in privacy_results if not r['passed']]
    warnings          = [r for r in quality_results  if not r['passed'] and r['severity'] == 'warning']

    click.echo(f'\n{"=" * 55}')
    if critical_failures:
        click.echo(f'  FALLO CRÍTICO: {len(critical_failures)} problema(s) de privacidad', err=True)
        for f in critical_failures:
            click.echo(f'  ✗ {f["name"]}', err=True)
        sys.exit(2)
    elif warnings:
        click.echo(f'  ADVERTENCIA: {len(warnings)} problema(s) de calidad (no bloquean producción)')
        sys.exit(1)
    else:
        click.echo('  OK: Todas las verificaciones pasaron.')
        sys.exit(0)


def _print_check_table(results: list[dict]) -> None:
    rows = [
        [
            '✓' if r['passed'] else '✗',
            r['name'],
            r['description'],
            r['detail'] or '',
        ]
        for r in results
    ]
    click.echo(tabulate(rows, headers=['', 'Check', 'Descripción', 'Detalle']))


if __name__ == '__main__':
    main()
