import { query } from '../client'
import type { Category, Zone } from '../../types'

export async function getCategories(parentId?: number): Promise<Category[]> {
  if (parentId != null) {
    return query<Category>(`
      SELECT id, parent_id, name, slug, level, full_path
      FROM analytics.dim_categories
      WHERE parent_id = $1 AND is_active = true
      ORDER BY name
    `, [parentId])
  }

  return query<Category>(`
    SELECT id, parent_id, name, slug, level, full_path
    FROM analytics.dim_categories
    WHERE is_active = true
    ORDER BY level, name
  `)
}

export async function getZones(filters: {
  department?: string
  municipality?: string
  countryCode?: string
}): Promise<Zone[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  let p = 1

  if (filters.countryCode) {
    conditions.push(`country_code = $${p}`)
    params.push(filters.countryCode.toUpperCase())
    p++
  }
  if (filters.department) {
    conditions.push(`department_name ILIKE $${p}`)
    params.push(`%${filters.department}%`)
    p++
  }
  if (filters.municipality) {
    conditions.push(`municipality ILIKE $${p}`)
    params.push(`%${filters.municipality}%`)
    p++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return query<Zone>(`
    SELECT
      id,
      country_code,
      department_name  AS department,
      municipality,
      zone_name        AS zone,
      zone_type,
      lat_centroid,
      lng_centroid
    FROM analytics.dim_zones
    ${where}
    ORDER BY department_name, municipality, zone_name
  `, params)
}
