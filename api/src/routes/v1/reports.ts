import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireScope } from '../../plugins/auth'
import { getReports, createReportRequest } from '../../db/queries/account'
import { randomUUID } from 'crypto'

const ALLOWED_REPORT_TYPES = [
  'weekly_demand', 'monthly_sector', 'zone_report',
  'unmet_demand', 'price_analysis', 'opportunity',
  'trend_analysis', 'national_summary',
] as const

export async function reportsRoutes(fastify: FastifyInstance) {

  // GET /v1/reports
  fastify.get('/reports', {
    preHandler: [fastify.authenticate, requireScope('reports:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      status:   z.enum(['queued', 'generating', 'ready', 'failed', 'expired']).optional(),
      page:     z.coerce.number().int().min(1).default(1),
      per_page: z.coerce.number().int().min(1).max(50).default(20),
    })

    const parsed = schema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'INVALID_PARAMS', message: 'Invalid query parameters.' } })
    }

    const q = parsed.data
    const limit  = q.per_page
    const offset = (q.page - 1) * limit

    const { rows, total } = await getReports(request.auth.institutionId, { status: q.status, limit, offset })

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
      },
    })
  })

  // POST /v1/reports
  // Solicitar generación de un reporte
  fastify.post('/reports', {
    preHandler: [fastify.authenticate, requireScope('reports:read'), fastify.checkQuota],
  }, async (request, reply) => {
    const schema = z.object({
      report_type:  z.enum(ALLOWED_REPORT_TYPES),
      title:        z.string().min(1).max(300).optional(),
      period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      period_end:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      file_format:  z.enum(['pdf', 'xlsx', 'csv']).default('pdf'),
      filters: z.object({
        category_ids: z.array(z.number().int().positive()).max(20).optional(),
        zone_ids:     z.array(z.number().int().positive()).max(20).optional(),
      }).optional(),
    })

    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_BODY', message: 'Invalid request body.', details: parsed.error.flatten().fieldErrors }
      })
    }

    const body = parsed.data
    const title = body.title ?? `${body.report_type.replace(/_/g, ' ')} — ${new Date().toISOString().slice(0, 10)}`

    const report = await createReportRequest(
      request.auth.institutionId,
      null,
      {
        reportType:  body.report_type,
        title,
        periodStart: body.period_start,
        periodEnd:   body.period_end,
        filters:     body.filters as Record<string, unknown> | undefined,
        fileFormat:  body.file_format,
      }
    )

    return reply.code(202).send({
      data: report,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
        note:           'Report queued. Poll GET /v1/reports/:id for status. Typical generation time: 1-5 minutes.',
      },
    })
  })

  // GET /v1/reports/:id
  fastify.get('/reports/:id', {
    preHandler: [fastify.authenticate, requireScope('reports:read')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const { rows } = await getReports(request.auth.institutionId, { limit: 1, offset: 0 })
    const report = rows.find(r => r.id === id)

    if (!report) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Report not found or does not belong to your institution.' }
      })
    }

    return reply.send({
      data: report,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
      },
    })
  })
}
