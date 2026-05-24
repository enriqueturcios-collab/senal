import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireScope } from '../../plugins/auth'
import { setResponseRows } from '../../plugins/audit'
import { getCategoryTrends, getNationalSummary } from '../../db/queries/trends'
import { randomUUID } from 'crypto'

export async function trendsRoutes(fastify: FastifyInstance) {

  // GET /v1/trends/category
  // Series históricas de demanda por categoría
  fastify.get('/trends/category', {
    preHandler: [fastify.authenticate, requireScope('trends:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      category_id:  z.coerce.number().int().positive().optional(),
      zone_id:      z.coerce.number().int().min(0).optional(),  // 0 = nacional
      period_type:  z.enum(['week', 'month', 'quarter']).default('month'),
      months:       z.coerce.number().int().min(1).max(60).default(12),
    })

    const parsed = schema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARAMS', message: 'Invalid query parameters.', details: parsed.error.flatten().fieldErrors }
      })
    }

    const q = parsed.data

    // Respetar límite histórico del plan
    const allowedMonths = Math.min(q.months, request.auth.historicalMonthsAccess)

    const rows = await getCategoryTrends({
      categoryId:            q.category_id,
      zoneId:                q.zone_id,
      periodType:            q.period_type,
      months:                allowedMonths,
      historicalMonthsLimit: request.auth.historicalMonthsAccess,
    })

    setResponseRows(reply, rows.length)

    return reply.send({
      data: rows,
      meta: {
        request_id:              randomUUID(),
        institution_id:          request.auth.institutionId,
        generated_at:            new Date().toISOString(),
        periods_returned:        rows.length,
        historical_months_shown: allowedMonths,
        historical_months_plan:  request.auth.historicalMonthsAccess,
        note: rows.length === 0
          ? 'No trend data found. Trends are computed from fact_demands — ensure ETL has run for the requested period.'
          : undefined,
      },
    })
  })

  // GET /v1/trends/national
  // Resumen nacional — solo plan research y enterprise
  fastify.get('/trends/national', {
    preHandler: [fastify.authenticate, requireScope('national:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      period_type:  z.enum(['week', 'month', 'quarter']).default('month'),
      period_value: z.string().max(10).optional(),
    })

    const parsed = schema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARAMS', message: 'Invalid query parameters.' }
      })
    }

    const q = parsed.data
    const summary = await getNationalSummary(q.period_type, q.period_value)

    if (!summary) {
      return reply.code(404).send({
        error: {
          code: 'NO_DATA',
          message: 'National summary not available for the requested period. Ensure the analytics pipeline has run.',
        }
      })
    }

    setResponseRows(reply, 1)

    return reply.send({
      data: summary,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
        period:         `${summary.period_type}:${summary.period_value}`,
      },
    })
  })
}
