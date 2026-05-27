import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000,
  statement_timeout: 15000,
})

export async function query<T extends object = Record<string, unknown>>(
  sql: string, params?: unknown[]
): Promise<T[]> {
  const r = await pool.query<T>(sql, params)
  return r.rows
}

export async function queryOne<T extends object = Record<string, unknown>>(
  sql: string, params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export { pool }
