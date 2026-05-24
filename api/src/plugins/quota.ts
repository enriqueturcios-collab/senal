import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { pool } from '../db/client'

declare module 'fastify' {
  interface FastifyInstance {
    checkQuota: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

async function quotaPlugin(fastify: FastifyInstance) {

  fastify.decorate('checkQuota', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const { institutionId, apiCallsMonthly } = request.auth

    // Si el plan es ilimitado (null), no verificar
    if (apiCallsMonthly === null) return

    const period = new Date().toISOString().slice(0, 7)

    // Insertar o incrementar en una sola operación atómica
    const result = await pool.query<{ api_calls_used: number; api_calls_limit: number | null }>(`
      INSERT INTO b2b.usage_quotas (institution_id, period, api_calls_used, api_calls_limit)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (institution_id, period) DO UPDATE
        SET api_calls_used = b2b.usage_quotas.api_calls_used + 1,
            updated_at     = now()
      RETURNING api_calls_used, api_calls_limit
    `, [institutionId, period, apiCallsMonthly])

    const row = result.rows[0]
    if (!row) return

    const used  = row.api_calls_used
    const limit = row.api_calls_limit ?? apiCallsMonthly

    if (used > limit) {
      const resetDate = new Date()
      resetDate.setMonth(resetDate.getMonth() + 1, 1)
      resetDate.setHours(0, 0, 0, 0)

      reply.header('X-RateLimit-Limit',     String(limit))
      reply.header('X-RateLimit-Remaining', '0')
      reply.header('X-RateLimit-Reset',     resetDate.toISOString())

      return reply.code(429).send({
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `Monthly API call quota exceeded (${limit} calls). Resets on ${resetDate.toISOString().slice(0, 10)}.`,
          details: {
            used,
            limit,
            reset_date: resetDate.toISOString().slice(0, 10),
            upgrade_url: 'https://senal.app/institutional/upgrade',
          }
        }
      })
    }

    // Headers informativos en cada respuesta
    reply.header('X-RateLimit-Limit',     String(limit))
    reply.header('X-RateLimit-Remaining', String(Math.max(0, limit - used)))
  })
}

export default fp(quotaPlugin, { name: 'senal-quota', dependencies: ['senal-auth'] })
