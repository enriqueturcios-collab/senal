// Entrepreneur ↔ Demand matching engine.
// Calculates a 0–100 compatibility score between a demand and an entrepreneur's profile/inventory.
// Used when new demands are created and for manual recalculation.

import { query, queryOne } from '@/db'

interface DemandForMatch {
  id: string
  title: string
  description: string
  category_id: number
  budget_min: number | null
  budget_max: number | null
  urgency: string
  zone_id: number | null
}

interface EntrepreneurForMatch {
  user_id: string
  profile_id: string
  primary_category_ids: number[]
  service_zones_json: number[]    // zone IDs
  accepts_auto_drafts: boolean
  reputation_score: number
}

interface InventoryItemForMatch {
  id: string
  title: string
  description: string
  category_id: number | null
  price: number | null
  tags_json: string[]
  stock_quantity: number
  is_active: boolean
}

export interface MatchResult {
  userId: string
  profileId: string
  demandId: string
  inventoryItemId: string | null
  matchType: 'profile_match' | 'inventory_match' | 'service_match'
  matchScore: number
  reasons: string[]
  categoryFit: number
  locationFit: number
  priceFit: number
  urgencyFit: number
  availabilityFit: number
}

// ── Score components ──────────────────────────────────────────────────────────

function scoreCategoryFit(
  demandCategoryId: number,
  entrepreneurCategories: number[],
  itemCategoryId: number | null,
): number {
  if (itemCategoryId && itemCategoryId === demandCategoryId) return 100
  if (entrepreneurCategories.includes(demandCategoryId)) return 85
  return 0
}

function scoreLocationFit(demandZoneId: number | null, entrepreneurZones: number[]): number {
  if (!demandZoneId) return 60  // no location constraint → neutral
  if (entrepreneurZones.length === 0) return 50
  if (entrepreneurZones.includes(demandZoneId)) return 100
  return 20
}

function scorePriceFit(
  demandMin: number | null,
  demandMax: number | null,
  itemPrice: number | null,
): number {
  if (!itemPrice) return 50  // unknown price → neutral
  if (!demandMin && !demandMax) return 60
  const lo = demandMin ?? 0
  const hi = demandMax ?? Infinity
  if (itemPrice >= lo && itemPrice <= hi) return 100
  // Partially outside range
  const midDemand = (lo + (hi === Infinity ? lo * 2 : hi)) / 2
  const ratio = itemPrice / midDemand
  if (ratio > 0.5 && ratio < 2) return 50
  return 10
}

function scoreUrgencyFit(urgency: string): number {
  return urgency === 'immediate' ? 85 : urgency === 'high' ? 70 : 50
}

function scoreAvailabilityFit(stock: number, isActive: boolean): number {
  if (!isActive) return 0
  if (stock >= 5) return 100
  if (stock > 0) return 70
  return 0
}

function keywordOverlap(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  const hits   = words2.filter(w => words1.has(w)).length
  return Math.min(100, hits * 25)
}

// ── Main match calculator ─────────────────────────────────────────────────────

export function calculateMatch(
  demand: DemandForMatch,
  entrepreneur: EntrepreneurForMatch,
  item: InventoryItemForMatch | null,
): MatchResult {
  const reasons: string[] = []

  const categoryFit  = scoreCategoryFit(demand.category_id, entrepreneur.primary_category_ids, item?.category_id ?? null)
  const locationFit  = scoreLocationFit(demand.zone_id, entrepreneur.service_zones_json)
  const priceFit     = scorePriceFit(demand.budget_min, demand.budget_max, item?.price ?? null)
  const urgencyFit   = scoreUrgencyFit(demand.urgency)
  const avail        = item ? scoreAvailabilityFit(item.stock_quantity, item.is_active) : 60

  // Keyword boost from inventory item
  const kwBoost = item
    ? keywordOverlap(demand.title + ' ' + demand.description, item.title + ' ' + item.description + ' ' + item.tags_json.join(' '))
    : keywordOverlap(demand.title + ' ' + demand.description, entrepreneur.primary_category_ids.join(' '))

  const matchScore = Math.round(
    0.30 * categoryFit  +
    0.15 * locationFit  +
    0.15 * priceFit     +
    0.10 * urgencyFit   +
    0.10 * avail        +
    0.20 * kwBoost
  )

  // Generate human-readable reasons
  if (categoryFit >= 85)  reasons.push('Coincide con tu categoría principal')
  if (categoryFit >= 100) reasons.push('Tu inventario tiene un producto compatible')
  if (locationFit >= 100) reasons.push('La demanda está en tu zona de servicio')
  if (priceFit >= 100)    reasons.push('Tu precio está dentro del rango solicitado')
  if (priceFit >= 50 && priceFit < 100) reasons.push('Tu precio está cerca del rango solicitado')
  if (urgencyFit >= 85)   reasons.push('Demanda urgente — responde rápido para ganar')
  if (avail >= 100)       reasons.push('Tienes stock disponible')
  if (kwBoost >= 50)      reasons.push('Las palabras clave coinciden con tu oferta')
  if (entrepreneur.reputation_score >= 4) reasons.push('Tu reputación es alta en Signal')

  const matchType = item ? 'inventory_match' : 'profile_match'

  return {
    userId:          entrepreneur.user_id,
    profileId:       entrepreneur.profile_id,
    demandId:        demand.id,
    inventoryItemId: item?.id ?? null,
    matchType,
    matchScore:      Math.max(0, Math.min(100, matchScore)),
    reasons,
    categoryFit,
    locationFit,
    priceFit,
    urgencyFit,
    availabilityFit: avail,
  }
}

// ── Run matching for a single new demand ────────────────────────────────────

export async function runMatchingForDemand(demandId: string): Promise<void> {
  // Fetch demand
  const demand = await queryOne<DemandForMatch & { tags: string[] }>(`
    SELECT d.id, d.title, d.description, d.category_id,
           d.budget_min, d.budget_max, d.urgency, d.zone_id
    FROM app.demands d
    WHERE d.id = $1 AND d.status = 'open'
  `, [demandId])

  if (!demand) return

  // Fetch all entrepreneurs with matching categories or inventory
  const entrepreneurs = await query<EntrepreneurForMatch>(`
    SELECT p.user_id, p.id AS profile_id,
           p.primary_category_ids,
           COALESCE((
             SELECT ARRAY_AGG(DISTINCT (z->>'zone_id')::int)
             FROM jsonb_array_elements(p.service_zones_json) AS z
           ), '{}') AS service_zones_json,
           p.accepts_auto_drafts,
           p.reputation_score
    FROM entrepreneur.profiles p
    JOIN entrepreneur.subscriptions s ON s.user_id = p.user_id
    WHERE s.status = 'active'
      AND s.plan != 'free'
      AND ($1 = ANY(p.primary_category_ids)
           OR EXISTS (
             SELECT 1 FROM entrepreneur.inventory_items i
             WHERE i.user_id = p.user_id AND i.category_id = $1 AND i.is_active
           ))
  `, [demand.category_id])

  for (const ent of entrepreneurs) {
    // Find best matching inventory item
    const items = await query<InventoryItemForMatch>(`
      SELECT id, title, description, category_id,
             price, tags_json::text[] AS tags_json,
             stock_quantity, is_active
      FROM entrepreneur.inventory_items
      WHERE user_id = $1 AND is_active = true AND category_id = $2
      ORDER BY stock_quantity DESC
      LIMIT 3
    `, [ent.user_id, demand.category_id])

    // Calculate best match (with or without inventory item)
    const candidates = items.length > 0
      ? items.map(item => calculateMatch(demand, ent, item))
      : [calculateMatch(demand, ent, null)]

    const best = candidates.reduce((a, b) => a.matchScore > b.matchScore ? a : b)

    if (best.matchScore < 30) continue  // too weak, skip

    await queryOne(`
      INSERT INTO entrepreneur.opportunity_matches
        (user_id, profile_id, demand_id, inventory_item_id, match_type,
         match_score, match_reasons, category_fit, location_fit,
         price_fit, urgency_fit, availability_fit, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'new')
      ON CONFLICT (user_id, demand_id)
      DO UPDATE SET
        match_score       = EXCLUDED.match_score,
        match_reasons     = EXCLUDED.match_reasons,
        inventory_item_id = EXCLUDED.inventory_item_id,
        updated_at        = now()
    `, [
      best.userId, best.profileId, best.demandId, best.inventoryItemId,
      best.matchType, best.matchScore, JSON.stringify(best.reasons),
      best.categoryFit, best.locationFit, best.priceFit,
      best.urgencyFit, best.availabilityFit,
    ])
  }
}

// ── Recalculate all matches for an entrepreneur ──────────────────────────────

export async function recalculateMatchesForUser(userId: string): Promise<number> {
  const profile = await queryOne<{ id: string; primary_category_ids: number[] }>(`
    SELECT id, primary_category_ids FROM entrepreneur.profiles WHERE user_id = $1
  `, [userId])

  if (!profile || profile.primary_category_ids.length === 0) return 0

  const demands = await query<{ id: string }>(`
    SELECT id FROM app.demands
    WHERE status = 'open'
      AND category_id = ANY($1)
    ORDER BY created_at DESC
    LIMIT 100
  `, [profile.primary_category_ids])

  for (const d of demands) {
    await runMatchingForDemand(d.id)
  }

  return demands.length
}
