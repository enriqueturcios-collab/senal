import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createHash } from 'crypto'
import { pool } from '../db/client'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

async function auditPlugin(fastify: FastifyInstance) {

  // onResponse hook: corre después de enviar la respuesta, no bloquea al cliente
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Solo auditar rutas autenticadas
    if (!request.auth) return

    const { institutionId, apiKeyId } = request.auth
    const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0] ?? request.ip

    // Hash de parámetros de consulta para auditoría sin exponer valores
    const paramsHash = sha256(JSON.stringify({
      query:  request.query,
      params: request.params,
    }))

    // Extraer conteo de filas del body si está disponible (best effort)
    let responseRows: number | null = null
    try {
      const body = reply.getHeader('x-response-rows')
      if (body) responseRows = parseInt(body as string, 10)
    } catch {
      // ignorar
    }

    // Insertar en access_logs de manera asíncrona (no bloquea)
    pool.query(`
      INSERT INTO b2b.access_logs (
        institution_id, api_key_id,
        endpoint, http_method,
        params_hash, response_rows,
        response_time_ms, http_status,
        accessed_at, ip_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), $9)
    `, [
      institutionId,
      apiKeyId,
      request.routerPath ?? request.url.split('?')[0],
      request.method,
      paramsHash,
      responseRows,
      Math.round(reply.elapsedTime),
      reply.statusCode,
      sha256(clientIp),
    ]).catch((err) => {
      // Log pero no falla el request
      fastify.log.error({ err }, 'Failed to write audit log')
    })
  })
}

export default fp(auditPlugin, { name: 'senal-audit' })

// Helper para que los route handlers anuncien el conteo de filas
export function setResponseRows(reply: FastifyReply, count: number) {
  reply.header('x-response-rows', String(count))
}
