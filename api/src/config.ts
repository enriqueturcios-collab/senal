import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
  PORT:                z.coerce.number().default(3001),
  DATABASE_URL:        z.string().min(1),
  API_VERSION:         z.string().default('v1'),
  CORS_ORIGINS:        z.string().default('http://localhost:3000'),
  ARGON2_TIME_COST:    z.coerce.number().default(3),
  ARGON2_MEMORY_COST:  z.coerce.number().default(65536),
  RATE_LIMIT_MAX:      z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS:z.coerce.number().default(60000),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
export const isProd = config.NODE_ENV === 'production'
