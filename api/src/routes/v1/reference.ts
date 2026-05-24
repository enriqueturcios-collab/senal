import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireScope } from '../../plugins/auth'
import { getCategories, getZones } from '../../db/queries/reference'
import { randomUUID } from 'crypto'

export async function referenceRoutes(fastify: FastifyInstance) {

  // GET /v1/categories
  fastify.get('/categories', {
    preHandler: [fastify.authenticate, requireScope('demand:read')],
  }, async (request, reply) => {
    const schema = z.object({
      parent_id: z.coerce.number().int().positive().optional(),
    })
    const parsed = schema.safeParse(request.query)
    const parentId = parsed.success ? parsed.data.parent_id : undefined

    const categories = await getCategories(parentId)

    return reply.send({
      data: categories,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
        total:          categories.length,
      },
    })
  })

  // GET /v1/zones
  fastify.get('/zones', {
    preHandler: [fastify.authenticate, requireScope('demand:read')],
  }, async (request, reply) => {
    const schema = z.object({
      department:   z.string().max(100).optional(),
      municipality: z.string().max(100).optional(),
      country_code: z.string().length(2).optional(),
    })

    const parsed = schema.safeParse(request.query)
    const filters = parsed.success ? parsed.data : {}

    const zones = await getZones(filters)

    return reply.send({
      data: zones,
      meta: {
        request_id:     randomUUID(),
        institution_id: request.auth.institutionId,
        generated_at:   new Date().toISOString(),
        total:          zones.length,
        note:           'Use zone_id values as filters in /v1/demand and /v1/indices endpoints.',
      },
    })
  })
}
