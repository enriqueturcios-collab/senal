"""
Clase base para todos los jobs ETL.
Maneja checkpoint, auditoría y reintentos.
"""

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import psycopg2

from ..db import fetch_one, execute
from ..logger import get_logger

log = get_logger(__name__)


@dataclass
class JobResult:
    job_name:      str
    status:        str          # completed | failed | skipped
    records_read:  int = 0
    records_loaded: int = 0
    records_skipped: int = 0
    duration_ms:   int = 0
    error:         str | None = None
    metadata:      dict[str, Any] = field(default_factory=dict)


class BaseJob(ABC):
    name: str = 'base_job'

    def __init__(self) -> None:
        self.log = get_logger(self.name)

    @abstractmethod
    def run(self, **kwargs: Any) -> JobResult:
        ...

    def get_last_checkpoint(self) -> datetime | None:
        row = fetch_one("""
            SELECT run_at FROM analytics.etl_audit
            WHERE job_name = %s AND status = 'completed'
            ORDER BY run_at DESC
            LIMIT 1
        """, (self.name,))
        return row['run_at'] if row else None

    def write_audit(self, result: JobResult, job_id: int | None = None) -> int:
        if job_id:
            execute("""
                UPDATE analytics.etl_audit
                SET status            = %s,
                    records_read      = %s,
                    records_loaded    = %s,
                    records_suppressed_k_anon = %s,
                    records_anonymized = %s,
                    duration_ms       = %s,
                    error_message     = %s
                WHERE id = %s
            """, (
                result.status,
                result.records_read,
                result.records_loaded,
                result.records_skipped,
                result.records_loaded,
                result.duration_ms,
                result.error,
                job_id,
            ))
            return job_id

        row = fetch_one("""
            INSERT INTO analytics.etl_audit (job_name, status, records_read, records_loaded,
                records_suppressed_k_anon, records_anonymized, duration_ms, error_message)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            result.job_name,
            result.status,
            result.records_read,
            result.records_loaded,
            result.records_skipped,
            result.records_loaded,
            result.duration_ms,
            result.error,
        ))
        return row['id'] if row else 0

    def start_audit(self, period: str | None = None) -> int:
        row = fetch_one("""
            INSERT INTO analytics.etl_audit (job_name, period_processed, status)
            VALUES (%s, %s, 'running')
            RETURNING id
        """, (self.name, period))
        return row['id'] if row else 0

    @retry(
        retry=retry_if_exception_type((psycopg2.OperationalError, psycopg2.InterfaceError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    def execute_with_retry(self, **kwargs: Any) -> JobResult:
        return self.run(**kwargs)

    def __call__(self, **kwargs: Any) -> JobResult:
        start = time.monotonic()
        self.log.info('job_start', job=self.name)
        result = JobResult(job_name=self.name, status='failed')

        try:
            result = self.execute_with_retry(**kwargs)
        except Exception as e:
            result.status = 'failed'
            result.error  = str(e)
            self.log.error('job_failed', job=self.name, error=str(e), exc_info=True)
        finally:
            result.duration_ms = int((time.monotonic() - start) * 1000)
            self.write_audit(result)
            self.log.info(
                'job_end',
                job=self.name,
                status=result.status,
                read=result.records_read,
                loaded=result.records_loaded,
                skipped=result.records_skipped,
                duration_ms=result.duration_ms,
            )

        return result
