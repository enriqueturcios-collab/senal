import { Pool, PoolClient } from 'pg'
import { config } from '../config'

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err)
})

// Helper: query con tipos
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(sql, params)
  return result.rows
}

// Helper: query que espera exactamente una fila
export async function queryOne<T extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export type { PoolClient }
