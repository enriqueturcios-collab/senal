import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireScope } from '../../plugins/auth'
import { setResponseRows } from '../../plugins/audit'
import { getDemandAggregates, getUnmetDemand } from '../../db/queries/demand'
import type { PaginatedApiResponse, ApiResponse, DemandAggregate } from '../../types'
import { randomUUID } from 'crypto'

const aggregateQuery = z.object({
  category_id:  z.coerce.number().int().positive().optional(),
  zone_id:      z.coerce.number().int().positive().optional(),
  department:   z.string().max(100).optional(),
  period_type:  z.enum(['week', 'month', 'quarter']).optional(),
  period_value: z.string().max(10).optional(),
  date_from:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confidence:   z.enum(['low', 'medium', 'high']).optional(),
  page:         z.coerce.number().int().min(1).default(1),
  per_page:     z.coerce.number().int().min(1).max(100).default(50),
})

export async function demandRoutes(fastify: FastifyInstance) {

  // GET /v1/demand/aggregate
  // Datos agregados de demanda por zona y categoría
  fastify.get('/demand/aggregate', {
    preHandler: [fastify.authenticate, requireScope('demand:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const parsed = aggregateQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARAMS', message: 'Invalid query parameters.', details: parsed.error.flatten().fieldErrors }
      })
    }

    const q = parsed.data
    const limit  = q.per_page
    const offset = (q.page - 1) * limit

    const { rows, total, suppressedCells } = await getDemandAggregates({
      categoryId:            q.category_id,
      zoneId:                q.zone_id,
      department:            q.department,
      periodType:            q.period_type,
      periodValue:           q.period_value,
      dateFrom:              q.date_from,
      dateTo:                q.date_to,
      confidence:            q.confidence,
      limit,
      offset,
      historicalMonthsLimit: request.auth.historicalMonthsAccess,
    })

    setResponseRows(reply, rows.length)

    const response: PaginatedApiResponse<DemandAggregate> = {
      data: rows,
      meta: {
        request_id:       randomUUID(),
        institution_id:   request.auth.institutionId,
        generated_at:     new Date().toISOString(),
        total,
        page:             q.page,
        per_page:         limit,
        total_pages:      Math.ceil(total / limit),
        suppressed_cells: suppressedCells,
      },
    }

    return reply.send(response)
  })

  // GET /v1/demand/unmet
  // Demanda insatisfecha — zonas y categorías con alta tasa de demanda sin oferta
  fastify.get('/demand/unmet', {
    preHandler: [fastify.authenticate, requireScope('demand:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      category_id:  z.coerce.number().int().positive().optional(),
      zone_id:      z.coerce.number().int().positive().optional(),
      period_type:  z.enum(['week', 'month', 'quarter']).optional(),
      period_value: z.string().max(10).optional(),
      page:         z.coerce.number().int().min(1).default(1),
      per_page:     z.coerce.number().int().min(1).max(100).default(50),
    })

    const parsed = schema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARAMS', message: 'Invalid query parameters.', details: parsed.error.flatten().fieldErrors }
      })
    }

    const q = parsed.data
    const limit  = q.per_page
    const offset = (q.page - 1) * limit

    const { rows, total } = await getUnmetDemand({
      categoryId:            q.category_id,
      zoneId:                q.zone_id,
      periodType:            q.period_type,
      periodValue:           q.period_value,
      limit,
      offset,
      historicalMonthsLimit: request.auth.historicalMonthsAccess,
    })

    setResponseRows(reply, rows.length)

    return reply.send({
      data: rows,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
        total,
        page:           q.page,
        per_page:       limit,
        total_pages:    Math.ceil(total / limit),
        description:    'Demand cells where unmet_demand_rate > 30% — highest market gap opportunities',
      },
    })
  })

  // GET /v1/demand/price-ranges
  // Rangos de precios que el mercado acepta por categoría
  fastify.get('/demand/price-ranges', {
    preHandler: [fastify.authenticate, requireScope('demand:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      category_id:  z.coerce.number().int().positive(),
      zone_id:      z.coerce.number().int().positive().optional(),
      period_value: z.string().max(10).optional(),
    })

    const parsed = schema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARAMS', message: 'category_id is required.', details: parsed.error.flatten().fieldErrors }
      })
    }

    const q = parsed.data
    const { rows } = await getDemandAggregates({
      categoryId:            q.category_id,
      zoneId:                q.zone_id,
      periodValue:           q.period_value,
      periodType:            'month',
      historicalMonthsLimit: request.auth.historicalMonthsAccess,
      limit: 100,
      offset: 0,
    })

    // Proyección solo de campos de precio
    const priceData = rows.map(r => ({
      zone:         r.zone,
      department:   r.department,
      category:     r.category,
      period_value: r.period_value,
      budget_p10:   r.budget_p10,
      budget_p25:   r.budget_p25,
      budget_p50:   r.budget_p50,
      budget_p75:   r.budget_p75,
      budget_p90:   r.budget_p90,
      budget_avg:   r.budget_avg,
      demand_count: r.demand_count,
      data_confidence: r.data_confidence,
    }))

    setResponseRows(reply, priceData.length)

    return reply.send({
      data: priceData,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
        note:           'Percentiles represent the price range buyers are willing to pay. p50 = median accepted budget.',
      },
    } satisfies ApiResponse<typeof priceData>)
  })
}
