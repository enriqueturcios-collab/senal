"""
Scheduler — ejecuta los pipelines en horario definido.

Horario de producción:
  - Incremental : cada hora  (xx:05)
  - Daily       : 02:10 AM   (después de cierre del día anterior)
  - Dimensiones : domingo 03:00 AM

Para entornos sin APScheduler (contenedores simples), usar cron del SO:
  5  *  * * *  python -m scripts.run_pipeline incremental
  10 2  * * *  python -m scripts.run_pipeline daily
  0  3  * * 0  python -m scripts.run_pipeline sync-dimensions
"""

import signal
import sys

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from .config import config
from .logger import get_logger, setup_logging
from .pipeline import run_incremental, run_daily
from .jobs.sync_dimensions import SyncDimensionsJob

log = get_logger('scheduler')


def _job_incremental() -> None:
    try:
        run_incremental()
    except Exception as e:
        log.error('scheduler_job_failed', job='incremental', error=str(e), exc_info=True)


def _job_daily() -> None:
    try:
        run_daily()
    except Exception as e:
        log.error('scheduler_job_failed', job='daily', error=str(e), exc_info=True)


def _job_sync_dimensions() -> None:
    try:
        SyncDimensionsJob()()
    except Exception as e:
        log.error('scheduler_job_failed', job='sync_dimensions', error=str(e), exc_info=True)


def start() -> None:
    setup_logging()

    scheduler = BlockingScheduler(timezone='America/Guatemala')

    # Incremental: cada hora a los 5 minutos
    scheduler.add_job(
        _job_incremental,
        CronTrigger(minute=5),
        id='incremental',
        name='ETL Incremental (hourly)',
        max_instances=1,
        coalesce=True,  # si se acumularon, corre solo una vez
        misfire_grace_time=300,
    )

    # Daily: 02:10 AM todos los días
    scheduler.add_job(
        _job_daily,
        CronTrigger(hour=2, minute=10),
        id='daily',
        name='ETL Daily (nightly)',
        max_instances=1,
        coalesce=True,
        misfire_grace_time=1800,
    )

    # Sync dimensiones: domingo 03:00 AM
    scheduler.add_job(
        _job_sync_dimensions,
        CronTrigger(day_of_week='sun', hour=3, minute=0),
        id='sync_dimensions',
        name='Sync Dimensions (weekly)',
        max_instances=1,
    )

    def _shutdown(signum: int, frame: object) -> None:
        log.info('scheduler_shutdown', signal=signum)
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT,  _shutdown)

    log.info('scheduler_start', jobs=len(scheduler.get_jobs()), dry_run=config.dry_run)
    scheduler.start()


if __name__ == '__main__':
    start()
