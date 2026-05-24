import { FastifyInstance } from 'fastify'
import { pool } from '../db/client'

export async function healthRoutes(fastify: FastifyInstance) {

  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'ok'
    let dbLatencyMs: number | null = null

    try {
      const start = Date.now()
      await pool.query('SELECT 1')
      dbLatencyMs = Date.now() - start
    } catch {
      dbStatus = 'error'
    }

    const status = dbStatus === 'ok' ? 200 : 503

    return reply.code(status).send({
      status:    dbStatus === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version ?? '1.0.0',
      checks: {
        database: { status: dbStatus, latency_ms: dbLatencyMs },
      },
    })
  })
}
