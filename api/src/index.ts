import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { config, isProd } from './config'

// Plugins de la plataforma
import authPlugin from './plugins/auth'
import quotaPlugin from './plugins/quota'
import auditPlugin from './plugins/audit'

// Rutas
import { healthRoutes }    from './routes/health'
import { demandRoutes }    from './routes/v1/demand'
import { indicesRoutes }   from './routes/v1/indices'
import { trendsRoutes }    from './routes/v1/trends'
import { reportsRoutes }   from './routes/v1/reports'
import { referenceRoutes } from './routes/v1/reference'
import { accountRoutes }   from './routes/v1/account'

async function build() {
  const fastify = Fastify({
    logger: {
      level: isProd ? 'warn' : 'info',
    },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'request_id',
  })

  // ---------------------------------------------------------------------------
  // Seguridad
  // ---------------------------------------------------------------------------

  await fastify.register(helmet, {
    contentSecurityPolicy: false,  // API — no sirve HTML
  })

  await fastify.register(cors, {
    origin: config.CORS_ORIGINS.split(',').map(o => o.trim()),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  })

  // Rate limit global por IP (capa de defensa contra scraping)
  await fastify.register(rateLimit, {
    max:        config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
        details: { retry_after_seconds: Math.ceil(context.ttl / 1000) },
      }
    }),
  })

  // ---------------------------------------------------------------------------
  // Plugins de la plataforma (orden importante: auth → quota → audit)
  // ---------------------------------------------------------------------------

  await fastify.register(authPlugin)
  await fastify.register(quotaPlugin)
  await fastify.register(auditPlugin)

  // ---------------------------------------------------------------------------
  // Rutas
  // ---------------------------------------------------------------------------

  await fastify.register(healthRoutes)

  // Todas las rutas v1 bajo el prefijo /v1
  await fastify.register(async (v1) => {
    await v1.register(demandRoutes)
    await v1.register(indicesRoutes)
    await v1.register(trendsRoutes)
    await v1.register(reportsRoutes)
    await v1.register(referenceRoutes)
    await v1.register(accountRoutes)
  }, { prefix: '/v1' })

  // ---------------------------------------------------------------------------
  // Error handler global
  // ---------------------------------------------------------------------------

  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error)

    if (error.statusCode === 429) {
      return reply.code(429).send(error)
    }

    if (error.validation) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: error.validation }
      })
    }

    return reply.code(500).send({
      error: {
        code:    'INTERNAL_ERROR',
        message: isProd ? 'An unexpected error occurred.' : error.message,
      }
    })
  })

  fastify.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: { code: 'NOT_FOUND', message: 'Endpoint not found. See documentation for available routes.' }
    })
  })

  return fastify
}

async function start() {
  const app = await build()

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    app.log.info(`Señal B2B API running on port ${config.PORT}`)
    app.log.info(`Environment: ${config.NODE_ENV}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
