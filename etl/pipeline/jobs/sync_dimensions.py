"""
Job 6 — Sincronización de dimensiones.

Mantiene analytics.dim_categories y analytics.dim_zones alineados
con la base transaccional. Corre diariamente o cuando se agregan
nuevas categorías/zonas.
"""

from typing import Any

from ..config import config
from ..db import execute
from ..logger import get_logger
from .base import BaseJob, JobResult

log = get_logger('sync_dimensions')


SYNC_CATEGORIES_SQL = """
INSERT INTO analytics.dim_categories (id, parent_id, name, slug, level, full_path, is_active, synced_at)
SELECT
    c.id,
    c.parent_id,
    c.name,
    c.slug,
    CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END AS level,
    COALESCE(p.name || ' / ', '') || c.name         AS full_path,
    c.is_active,
    now()
FROM app.categories c
LEFT JOIN app.categories p ON p.id = c.parent_id
ON CONFLICT (id) DO UPDATE SET
    parent_id  = EXCLUDED.parent_id,
    name       = EXCLUDED.name,
    slug       = EXCLUDED.slug,
    level      = EXCLUDED.level,
    full_path  = EXCLUDED.full_path,
    is_active  = EXCLUDED.is_active,
    synced_at  = now()
WHERE
    analytics.dim_categories.name      <> EXCLUDED.name      OR
    analytics.dim_categories.full_path <> EXCLUDED.full_path OR
    analytics.dim_categories.is_active <> EXCLUDED.is_active
"""

SYNC_ZONES_SQL = """
INSERT INTO analytics.dim_zones (
    id, country_code, country_name,
    department_name, municipality, zone_name, zone_type,
    lat_centroid, lng_centroid, synced_at
)
SELECT
    z.id,
    co.code,
    co.name,
    d.name,
    m.name,
    z.name,
    z.zone_type,
    z.lat_centroid,
    z.lng_centroid,
    now()
FROM app.zones z
JOIN app.municipalities m ON m.id = z.municipality_id
JOIN app.departments d    ON d.id = m.department_id
JOIN app.countries co     ON co.id = d.country_id
WHERE z.is_active = true
ON CONFLICT (id) DO UPDATE SET
    zone_name       = EXCLUDED.zone_name,
    zone_type       = EXCLUDED.zone_type,
    lat_centroid    = EXCLUDED.lat_centroid,
    lng_centroid    = EXCLUDED.lng_centroid,
    synced_at       = now()
WHERE
    analytics.dim_zones.zone_name <> EXCLUDED.zone_name
"""


class SyncDimensionsJob(BaseJob):
    name = 'sync_dimensions'

    def run(self, **kwargs: Any) -> JobResult:
        result = JobResult(job_name=self.name, status='completed')

        if not config.dry_run:
            cat_count  = execute(SYNC_CATEGORIES_SQL)
            zone_count = execute(SYNC_ZONES_SQL)
        else:
            cat_count  = 0
            zone_count = 0

        self.log.info('dimensions_synced', categories_upserted=cat_count, zones_upserted=zone_count)

        result.records_loaded = (cat_count or 0) + (zone_count or 0)
        return result
