import { query, queryOne } from '../client'
import type { PlanTier } from '../../types'

interface RawApiKey {
  id: string
  institution_id: string
  institution_name: string
  key_hash: string
  scopes: string[]
  expires_at: Date | null
  is_active: boolean
  plan_tier: PlanTier
  plan_allowed_scopes: string[]
  historical_months_access: number
  api_calls_monthly: number | null
  institution_status: string
  plan_has_api_access: boolean
}

// Busca una API key por su prefix (8 chars) para limitar escaneos de tabla
export async function findApiKeyByPrefix(prefix: string): Promise<RawApiKey | null> {
  return queryOne<RawApiKey>(`
    SELECT
      ak.id,
      ak.institution_id,
      i.name                      AS institution_name,
      ak.key_hash,
      ak.scopes,
      ak.expires_at,
      ak.is_active,
      p.tier                      AS plan_tier,
      p.allowed_api_scopes        AS plan_allowed_scopes,
      p.historical_months_access,
      p.api_calls_monthly,
      i.status                    AS institution_status,
      p.has_api_access            AS plan_has_api_access
    FROM b2b.api_keys ak
    JOIN b2b.institutions i ON i.id = ak.institution_id
    JOIN b2b.plans p        ON p.id = i.plan_id
    WHERE ak.key_prefix = $1
      AND ak.is_active = true
      AND ak.revoked_at IS NULL
      AND i.status = 'active'
  `, [prefix])
}

// Actualiza last_used_at de la API key (fire-and-forget, no bloquea el request)
export function touchApiKey(keyId: string, ip: string): void {
  query(`
    UPDATE b2b.api_keys
    SET last_used_at = now(), last_used_ip = $2
    WHERE id = $1
  `, [keyId, ip]).catch(() => {})
}

// Verifica si el contrato del cliente está vigente
export async function hasActiveContract(institutionId: string): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(`
    SELECT EXISTS(
      SELECT 1 FROM b2b.contracts
      WHERE institution_id = $1
        AND status = 'active'
        AND start_date <= CURRENT_DATE
        AND end_date >= CURRENT_DATE
    ) AS exists
  `, [institutionId])
  return row?.exists ?? false
}
