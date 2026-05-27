export type Tier = 'De confianza' | 'Establecido' | 'Conocido' | 'Nuevo'

export function computeTier(
  trade_count: number,
  vouch_count: number,
  unresolved_disputes: number  // only 'unresolved' (permanent), not 'open' (pending)
): Tier {
  if (vouch_count >= 5 && trade_count >= 10 && unresolved_disputes === 0) return 'De confianza'
  if (vouch_count >= 3 && trade_count >= 5  && unresolved_disputes === 0) return 'Establecido'
  if (trade_count >= 3)                                                    return 'Conocido'
  return 'Nuevo'
}

export const TIER_STYLE: Record<Tier, { bg: string; color: string }> = {
  'De confianza': { bg: '#EEF1EA', color: '#3A5A30' },
  'Establecido':  { bg: '#EEF1EA', color: '#5F6F52' },
  'Conocido':     { bg: '#F1ECE2', color: '#7A7468' },
  'Nuevo':        { bg: '#F5F2EE', color: '#A7A196' },
}

export const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open:       'Abierta',
  resolved:   'Resuelta',
  unresolved: 'Sin resolver',
  withdrawn:  'Retirada',
}

export const DISPUTE_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  open:       { bg: '#FDF6E8', color: '#8B6914' },
  resolved:   { bg: '#EEF1EA', color: '#5F6F52' },
  unresolved: { bg: '#FDF3EE', color: '#B8795B' },
  withdrawn:  { bg: '#F5F2EE', color: '#A7A196' },
}
