import { FastifyInstance } from 'fastify'
import { getUsageSummary } from '../../db/queries/account'
import { randomUUID } from 'crypto'

export async function accountRoutes(fastify: FastifyInstance) {

  // GET /v1/account/usage
  // Estado actual del plan y consumo del mes
  fastify.get('/account/usage', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const usage = await getUsageSummary(request.auth.institutionId)

    if (!usage) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Institution not found.' }
      })
    }

    return reply.send({
      data: usage,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
      },
    })
  })

  // GET /v1/account/plan
  // Detalles del plan contratado y scopes disponibles
  fastify.get('/account/plan', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { plan, allowedScopes, historicalMonthsAccess, apiCallsMonthly, institutionName } = request.auth

    return reply.send({
      data: {
        institution:              institutionName,
        plan_tier:                plan,
        allowed_scopes:           allowedScopes,
        historical_months_access: historicalMonthsAccess,
        api_calls_monthly:        apiCallsMonthly,
        endpoints: {
          'demand:read':  ['/v1/demand/aggregate', '/v1/demand/unmet', '/v1/demand/price-ranges', '/v1/categories', '/v1/zones'],
          'indices:read': ['/v1/indices', '/v1/indices/opportunities', '/v1/indices/lookup'],
          'trends:read':  ['/v1/trends/category'],
          'national:read':['/v1/trends/national'],
          'reports:read': ['/v1/reports (GET)', '/v1/reports (POST)', '/v1/reports/:id'],
        },
      },
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
      },
    })
  })
}
