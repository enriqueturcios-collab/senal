import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as argon2 from 'argon2'
import { findApiKeyByPrefix, touchApiKey, hasActiveContract } from '../db/queries/auth'
import type { AuthContext } from '../types'

// Prefijo esperado en todas las API keys de Señal
const KEY_PREFIX = 'sn_live_'
const PREFIX_EXTRACT_LENGTH = 8

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    auth: AuthContext
  }
}

async function authPlugin(fastify: FastifyInstance) {

  // preHandler reutilizable: adjunta AuthContext al request
  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const header = request.headers.authorization

    if (!header || !header.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: { code: 'MISSING_API_KEY', message: 'Authorization header required. Format: Bearer sn_live_...' }
      })
    }

    const rawKey = header.slice(7).trim()

    if (!rawKey.startsWith(KEY_PREFIX)) {
      return reply.code(401).send({
        error: { code: 'INVALID_API_KEY_FORMAT', message: 'Invalid API key format.' }
      })
    }

    // Extraer los primeros PREFIX_EXTRACT_LENGTH chars del payload para lookup
    const keyPayload = rawKey.slice(KEY_PREFIX.length)
    const prefix     = keyPayload.slice(0, PREFIX_EXTRACT_LENGTH)

    const record = await findApiKeyByPrefix(prefix)

    if (!record) {
      return reply.code(401).send({
        error: { code: 'INVALID_API_KEY', message: 'API key not found or inactive.' }
      })
    }

    // Verificar hash (argon2)
    const valid = await argon2.verify(record.key_hash, rawKey)
    if (!valid) {
      return reply.code(401).send({
        error: { code: 'INVALID_API_KEY', message: 'API key not found or inactive.' }
      })
    }

    // Verificar expiración de la key
    if (record.expires_at && record.expires_at < new Date()) {
      return reply.code(401).send({
        error: { code: 'API_KEY_EXPIRED', message: 'This API key has expired. Generate a new one from the portal.' }
      })
    }

    // Verificar que el plan permite acceso a la API
    if (!record.plan_has_api_access) {
      return reply.code(403).send({
        error: {
          code: 'PLAN_UPGRADE_REQUIRED',
          message: `Your plan (${record.plan_tier}) does not include API access. Upgrade to Enterprise or Research.`,
        }
      })
    }

    // Verificar contrato vigente
    const active = await hasActiveContract(record.institution_id)
    if (!active) {
      return reply.code(403).send({
        error: { code: 'NO_ACTIVE_CONTRACT', message: 'No active contract found. Contact your account manager.' }
      })
    }

    // Adjuntar contexto al request
    const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0] ?? request.ip
    request.auth = {
      institutionId:           record.institution_id,
      institutionName:         record.institution_name,
      apiKeyId:                record.id,
      plan:                    record.plan_tier,
      allowedScopes:           record.plan_allowed_scopes,
      keyScopes:               record.scopes,
      historicalMonthsAccess:  record.historical_months_access,
      apiCallsMonthly:         record.api_calls_monthly,
    }

    // Actualizar last_used_at (fire-and-forget)
    touchApiKey(record.id, clientIp)
  })
}

export default fp(authPlugin, { name: 'senal-auth' })

// Helper de scope para usar en routes
export function requireScope(scope: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const { allowedScopes, keyScopes } = request.auth

    const planAllows = allowedScopes.includes(scope)
    const keyAllows  = keyScopes.length === 0 || keyScopes.includes(scope)

    if (!planAllows) {
      return reply.code(403).send({
        error: {
          code: 'SCOPE_NOT_IN_PLAN',
          message: `Your plan does not include access to '${scope}'.`,
          details: { required_scope: scope, your_plan: request.auth.plan }
        }
      })
    }
    if (!keyAllows) {
      return reply.code(403).send({
        error: {
          code: 'SCOPE_NOT_IN_KEY',
          message: `This API key does not have the '${scope}' scope. Regenerate with the required scopes.`,
          details: { required_scope: scope, key_scopes: keyScopes }
        }
      })
    }
  }
}
