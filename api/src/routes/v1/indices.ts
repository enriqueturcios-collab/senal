import { FastifyInstance } from 'fastify'
import type { MarketIndex } from '../../types'
import { z } from 'zod'
import { requireScope } from '../../plugins/auth'
import { setResponseRows } from '../../plugins/audit'
import { getMarketIndices, getTopOpportunities } from '../../db/queries/indices'
import { randomUUID } from 'crypto'

export async function indicesRoutes(fastify: FastifyInstance) {

  // GET /v1/indices
  // Índices de mercado completos con filtros
  fastify.get('/indices', {
    preHandler: [fastify.authenticate, requireScope('indices:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      category_id:        z.coerce.number().int().positive().optional(),
      zone_id:            z.coerce.number().int().positive().optional(),
      department:         z.string().max(100).optional(),
      period_type:        z.enum(['week', 'month', 'quarter']).optional(),
      period_value:       z.string().max(10).optional(),
      min_opportunity:    z.coerce.number().min(0).max(100).optional(),
      confidence:         z.enum(['low', 'medium', 'high']).optional(),
      sort_by:            z.enum([
        'market_opportunity_score',
        'demand_activity_index',
        'unmet_demand_index',
        'category_growth_score',
      ]).optional(),
      sort_dir:           z.enum(['asc', 'desc']).optional(),
      page:               z.coerce.number().int().min(1).default(1),
      per_page:           z.coerce.number().int().min(1).max(100).default(50),
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

    const { rows, total } = await getMarketIndices({
      categoryId:            q.category_id,
      zoneId:                q.zone_id,
      department:            q.department,
      periodType:            q.period_type,
      periodValue:           q.period_value,
      minOpportunityScore:   q.min_opportunity,
      confidence:            q.confidence,
      sortBy:                q.sort_by,
      sortDir:               q.sort_dir,
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
        index_legend: {
          demand_activity_index:          'Volume of active demand relative to national average (0-100)',
          unmet_demand_index:             'Percentage of demands that received no offer (0-100)',
          market_opportunity_score:       'Composite: volume + unmet demand + urgency (0-100)',
          category_growth_score:          'Demand change vs previous period (-∞ to +∞)',
          local_demand_strength:          'Local demand relative to national benchmark (0-100)',
          offer_response_rate:            'Share of demands that received at least one offer (0-1)',
          transaction_confirmation_rate:  'Share of offers that resulted in a transaction (0-1)',
        },
      },
    })
  })

  // GET /v1/indices/opportunities
  // Top N oportunidades — el endpoint más usado por analistas bancarios
  fastify.get('/indices/opportunities', {
    preHandler: [fastify.authenticate, requireScope('indices:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      department:   z.string().max(100).optional(),
      period_value: z.string().max(10).optional(),
      top_n:        z.coerce.number().int().min(1).max(100).default(20),
    })

    const parsed = schema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARAMS', message: 'Invalid query parameters.' }
      })
    }

    const q = parsed.data
    const rows = await getTopOpportunities({
      department:            q.department,
      periodValue:           q.period_value,
      topN:                  q.top_n,
      historicalMonthsLimit: request.auth.historicalMonthsAccess,
    })

    setResponseRows(reply, rows.length)

    return reply.send({
      data: rows,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
        description:    'Top market opportunities ranked by market_opportunity_score. Only medium/high confidence cells included.',
        use_case:       'Use this endpoint to identify sectors and zones with high demand and low supply before evaluating productive credit applications.',
      },
    })
  })

  // GET /v1/indices/lookup
  // Lookup puntual por categoría + zona — el caso de uso del ejemplo de la librería
  fastify.get('/indices/lookup', {
    preHandler: [fastify.authenticate, requireScope('indices:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      category_id:  z.coerce.number().int().positive(),
      zone_id:      z.coerce.number().int().positive(),
      period_value: z.string().max(10).optional(),
    })

    const parsed = schema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARAMS', message: 'category_id and zone_id are required.' }
      })
    }

    const q = parsed.data

    const { rows } = await getMarketIndices({
      categoryId:            q.category_id,
      zoneId:                q.zone_id,
      periodValue:           q.period_value,
      periodType:            'month',
      historicalMonthsLimit: request.auth.historicalMonthsAccess,
      sortBy:                'market_opportunity_score',
      sortDir:               'desc',
      limit: 6,   // últimos 6 meses de ese par
      offset: 0,
    })

    if (rows.length === 0) {
      return reply.code(404).send({
        error: {
          code: 'NO_DATA',
          message: 'No market data found for this category + zone combination.',
          details: {
            category_id: q.category_id,
            zone_id:     q.zone_id,
            note:        'This may mean insufficient activity in this market cell (k-anonymity threshold not met) or no historical data yet.',
          }
        }
      })
    }

    const latest = rows[0]!
    const history = rows.slice(1)

    setResponseRows(reply, rows.length)

    return reply.send({
      data: {
        current:  latest,
        history,
        summary: {
          market_signal:        scoreToSignal(latest.market_opportunity_score),
          demand_trend:         latest.category_growth_score != null
            ? (latest.category_growth_score > 5 ? 'growing' : latest.category_growth_score < -5 ? 'shrinking' : 'stable')
            : 'unknown',
          price_range:          {
            low:    latest.price_acceptance_p10,
            median: latest.price_acceptance_p50,
            high:   latest.price_acceptance_p90,
          },
          recommendation:       buildRecommendation(latest),
        },
      },
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
        data_confidence: latest.data_confidence,
        sample_size:     latest.sample_size,
        disclaimer:      'This data reflects observed market demand signals. It is not a credit approval recommendation. Your institution\'s credit policies govern final decisions.',
      },
    })
  })
}

function scoreToSignal(score: number | null): string {
  if (score == null) return 'insufficient_data'
  if (score >= 70)   return 'strong'
  if (score >= 45)   return 'moderate'
  if (score >= 20)   return 'weak'
  return 'very_weak'
}

function buildRecommendation(index: MarketIndex): string {
  const score     = index.market_opportunity_score ?? 0
  const unmet     = index.unmet_demand_index ?? 0
  const growth    = index.category_growth_score ?? 0
  const txRate    = (index.transaction_confirmation_rate ?? 0) * 100

  if (score >= 65 && unmet >= 40) {
    return `High demand with significant unmet supply (${unmet.toFixed(0)}% unfulfilled). Strong market gap — favorable conditions for productive investment in this category.`
  }
  if (score >= 65 && growth > 10) {
    return `Growing demand (+${growth.toFixed(0)}% vs prior period) with strong activity. Emerging market — entry timing may be favorable.`
  }
  if (score >= 40 && txRate >= 30) {
    return `Moderate demand with solid transaction rate (${txRate.toFixed(0)}%). Market is active and transactions are completing — established demand exists.`
  }
  if (score < 25) {
    return `Low market activity detected. Limited demand signals available for this category + zone combination. Recommend additional due diligence.`
  }
  return `Moderate market signals. Demand exists but competition may be present. Review price ranges and unmet demand rate for further analysis.`
}
