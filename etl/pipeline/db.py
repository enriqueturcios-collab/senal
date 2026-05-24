from contextlib import contextmanager
from typing import Generator, Any
import psycopg2
import psycopg2.extras
import psycopg2.pool
from .config import config
from .logger import get_logger

log = get_logger(__name__)

# Pool compartido por todos los jobs
_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=config.database_url,
        )
        log.info('db_pool_created', min=1, max=10)
    return _pool


@contextmanager
def get_conn() -> Generator[psycopg2.extensions.connection, None, None]:
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


@contextmanager
def transaction() -> Generator[psycopg2.extensions.cursor, None, None]:
    """Context manager que entrega un cursor en una transacción atómica."""
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            try:
                yield cur
                if not config.dry_run:
                    conn.commit()
                else:
                    conn.rollback()
                    log.debug('dry_run_rollback')
            except Exception:
                conn.rollback()
                raise


def fetch_all(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]


def fetch_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: tuple = ()) -> int:
    """Ejecuta una sentencia y devuelve rowcount. Sujeto a dry_run."""
    with transaction() as cur:
        cur.execute(sql, params)
        return cur.rowcount


def execute_many(sql: str, records: list[tuple]) -> int:
    """Inserción en batch usando execute_batch. Sujeto a dry_run."""
    if not records:
        return 0
    with transaction() as cur:
        psycopg2.extras.execute_batch(cur, sql, records, page_size=config.batch_size)
        return cur.rowcount


def call_function(sql: str, params: tuple = ()) -> Any:
    """Llama una función PostgreSQL y devuelve el primer valor."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            row = cur.fetchone()
            return row[0] if row else None
