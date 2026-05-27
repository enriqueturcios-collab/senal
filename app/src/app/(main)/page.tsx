import { Suspense } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCategories, getHomeStats, getTrendingDemands, getMostUrgentDemand, getLatestProactiveOffers } from '@/lib/data'
import { FeedFilters, SearchBar } from './feed-filters'
import { FeedGrid } from './feed-grid'
import { FeedSkeleton } from '@/components/demand/demand-card-skeleton'
import { fmtCurrency, timeAgo } from '@/lib/utils'
import { ElementalGradient } from '@/components/ui/elemental-gradient'

interface PageProps {
  searchParams: { cat?: string; q?: string; page?: string }
}

const URGENCY_COLOR: Record<string, string> = {
  immediate: '#B8795B', high: '#B8946F', medium: '#A8B39A', low: '#DED6C8',
}

export default async function HomePage({ searchParams }: PageProps) {
  const categoryId = searchParams.cat ? Number(searchParams.cat) : undefined
  const search     = searchParams.q   || undefined
  const page       = searchParams.page ? Number(searchParams.page) : 1

  const [session, categories, stats, trending, urgent, proactiveOffers] = await Promise.all([
    getServerSession(authOptions),
    getCategories(),
    getHomeStats(),
    getTrendingDemands(12),
    getMostUrgentDemand(),
    getLatestProactiveOffers(6),
  ])

  const s = stats ?? { total: 0, today: 0, urgent: 0 }

  // Featured = first with image, or first. Rest = everything else.
  const featured = trending.find(d => d.image_urls?.length) ?? trending[0]
  const rest     = trending.filter(d => d.id !== featured?.id).slice(0, 10)

  // Bar widths: today and urgent relative to total
  const todayPct   = s.total > 0 ? Math.round((s.today   / s.total)  * 100) : 0
  const urgentPct  = s.total > 0 ? Math.round((s.urgent  / s.total)  * 100) : 0
  const activePct  = Math.min(100, s.total > 0 ? 70 : 0) // always show bulk

  return (
    <div className="min-h-screen bg-signal-bg">
      <div className="max-w-5xl mx-auto px-5 md:px-8" style={{ paddingBottom: '7rem' }}>

        {/* ── Hero gradient strip ───────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden mb-6 mt-5 h-32">
          <ElementalGradient />
          <div className="absolute inset-0 bg-black/35 flex items-center px-6 gap-4">
            <div>
              <p className="text-[22px] font-bold text-white leading-none tracking-[-0.03em]">signal</p>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Inteligencia de demanda para Guatemala
              </p>
            </div>
          </div>
        </div>

        {/* ── Market Pulse ──────────────────────────────────────────────────── */}
        <section className="pt-0 pb-7">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-4"
             style={{ color: '#A7A196' }}>
            Pulso del mercado
          </p>
          <div className="grid grid-cols-3 gap-2">
            <PulseStat
              value={s.total}
              label="Activas"
              pct={activePct}
              color="#5F6F52"
              barColor="#EEF1EA"
              fillColor="#5F6F52"
            />
            <PulseStat
              value={s.today}
              label="Hoy"
              pct={todayPct}
              color="#B8946F"
              barColor="#F5EDE2"
              fillColor="#B8946F"
            />
            <PulseStat
              value={s.urgent}
              label="Urgentes"
              pct={urgentPct}
              color="#B8795B"
              barColor="#F5E8E0"
              fillColor="#B8795B"
            />
          </div>
        </section>

        {/* ── URGENTE ahora ─────────────────────────────────────────────────── */}
        {urgent && (
          <section className="mb-8">
            <Link href={`/demand/${urgent.id}`} className="block group">
              <div className="rounded-2xl p-4 transition-all duration-200
                              group-hover:shadow-card-hover"
                   style={{
                     backgroundColor: '#FFFDF8',
                     border: `1.5px solid ${URGENCY_COLOR[urgent.urgency]}`,
                     boxShadow: `0 2px 12px ${URGENCY_COLOR[urgent.urgency]}22`,
                   }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full animate-pulse shrink-0"
                            style={{ backgroundColor: URGENCY_COLOR[urgent.urgency] }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: URGENCY_COLOR[urgent.urgency] }}>
                        {urgent.urgency === 'immediate' ? 'Urgente ahora' : 'Alta prioridad'}
                      </span>
                      <span className="text-[10px] text-signal-ash ml-auto">
                        {timeAgo(urgent.created_at)}
                      </span>
                    </div>
                    <h2 className="text-[16px] font-bold text-signal-text leading-snug mb-2"
                        style={{ letterSpacing: '-0.02em' }}>
                      {urgent.title}
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[12px] text-signal-text-soft">
                        {[urgent.municipality, urgent.zone].filter(Boolean).join(', ') || urgent.category}
                      </span>
                      {(urgent.budget_min || urgent.budget_max) && (
                        <span className="text-[13px] font-bold text-signal-text">
                          {urgent.budget_min && urgent.budget_max
                            ? `${fmtCurrency(urgent.budget_min, urgent.currency)} – ${fmtCurrency(urgent.budget_max, urgent.currency)}`
                            : fmtCurrency((urgent.budget_min ?? urgent.budget_max)!, urgent.currency)}
                        </span>
                      )}
                      {urgent.offer_count === 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${URGENCY_COLOR[urgent.urgency]}18`,
                                       color: URGENCY_COLOR[urgent.urgency] }}>
                          Sin ofertas
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0
                                  group-hover:translate-x-0.5 transition-transform duration-200"
                       style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
                    <svg className="w-3.5 h-3.5 text-signal-text-soft" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ── Trending scroll ───────────────────────────────────────────────── */}
        {featured && (
          <section className="mb-9">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest"
                 style={{ color: '#A7A196' }}>
                Tendencias
              </p>
              <Link href="/explore"
                    className="text-[11px] font-semibold transition-colors"
                    style={{ color: '#5F6F52' }}>
                Ver todo →
              </Link>
            </div>

            {/* Featured card */}
            <Link href={`/demand/${featured.id}`} className="block group mb-3">
              <div className="rounded-2xl overflow-hidden transition-all duration-200
                              hover:shadow-card-hover"
                   style={{
                     border: '1px solid #DED6C8',
                     boxShadow: '0 2px 12px rgba(46,42,36,0.06)',
                   }}>
                {featured.image_urls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featured.image_urls[0]} alt=""
                       className="w-full h-44 md:h-56 object-cover" />
                ) : (
                  <div className="w-full h-28 relative overflow-hidden"
                       style={{ background: 'linear-gradient(135deg, #EEF1EA 0%, #E8E1D4 100%)' }}>
                    <VolcanoSilhouette />
                  </div>
                )}
                <div className="px-5 py-4"
                     style={{
                       backgroundColor: '#FFFDF8',
                       borderTop: `2px solid ${URGENCY_COLOR[featured.urgency] ?? '#DED6C8'}`,
                     }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                         style={{ color: '#A7A196' }}>
                        {featured.category} · {timeAgo(featured.created_at)}
                      </p>
                      <h2 className="text-[18px] md:text-[20px] font-bold text-signal-text leading-snug"
                          style={{ letterSpacing: '-0.02em' }}>
                        {featured.title}
                      </h2>
                    </div>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0
                                    group-hover:translate-x-0.5 transition-transform duration-200"
                         style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
                      <svg className="w-3.5 h-3.5 text-signal-text-soft" fill="none" viewBox="0 0 24 24"
                           stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  {(featured.budget_min || featured.budget_max) && (
                    <div className="flex items-center gap-3 mt-3 pt-3"
                         style={{ borderTop: '1px solid #EAE3D6' }}>
                      <span className="text-[14px] font-bold text-signal-text">
                        {featured.budget_min && featured.budget_max
                          ? `${fmtCurrency(featured.budget_min, featured.currency)} – ${fmtCurrency(featured.budget_max, featured.currency)}`
                          : fmtCurrency((featured.budget_min ?? featured.budget_max)!, featured.currency)}
                      </span>
                      {featured.offer_count > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(95,111,82,0.12)', color: '#5F6F52' }}>
                          {featured.offer_count} {featured.offer_count === 1 ? 'oferta' : 'ofertas'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>

            {/* Horizontal scroll of rest */}
            {rest.length > 0 && (
              <div className="flex gap-2.5 overflow-x-auto hide-scroll pb-2 -mx-5 px-5 md:-mx-8 md:px-8">
                {rest.map(d => <TrendingChip key={d.id} {...d} />)}
              </div>
            )}
          </section>
        )}

        {/* ── Proactive offers ─────────────────────────────────────────────── */}
        {proactiveOffers.length > 0 && (
          <section className="mb-9">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#A7A196' }}>
                Ofertas de proveedores
              </p>
              <Link href="/explore?type=offers"
                    className="text-[11px] font-semibold transition-colors"
                    style={{ color: '#5F6F52' }}>
                Ver todas →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger">
              {proactiveOffers.map(offer => {
                const tags = JSON.parse(offer.tags_json || '[]') as string[]
                const price = offer.price && offer.max_price
                  ? `${fmtCurrency(offer.price, offer.currency)} – ${fmtCurrency(offer.max_price, offer.currency)}`
                  : offer.price    ? fmtCurrency(offer.price, offer.currency)
                  : offer.max_price ? `hasta ${fmtCurrency(offer.max_price, offer.currency)}`
                  : null
                return (
                  <Link key={offer.id} href={`/offers/${offer.id}`} className="block group">
                    <div className="interactive-card rounded-2xl p-4 h-full"
                         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap gap-1.5">
                          {offer.category && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: '#EEF1EA', color: '#5F6F52' }}>
                              {offer.category}
                            </span>
                          )}
                        </div>
                        {price && (
                          <p className="text-[13px] font-bold text-signal-text shrink-0">{price}</p>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-signal-text leading-snug mb-1">
                        {offer.title}
                      </p>
                      {offer.description && (
                        <p className="text-[11px] text-signal-text-muted leading-relaxed line-clamp-2">
                          {offer.description}{offer.description.length === 100 ? '…' : ''}
                        </p>
                      )}
                      {tags.slice(0,3).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.slice(0,3).map((t,i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: '#F1ECE2', color: '#7A7468' }}>{t}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-2.5"
                           style={{ borderTop: '1px solid #EAE3D6' }}>
                        <p className="text-[11px] text-signal-text-muted truncate">
                          {offer.business_name}
                        </p>
                        <span className="text-[11px] font-semibold shrink-0"
                              style={{ color: '#5F6F52' }}>
                          Ver →
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Demand Intelligence strip ─────────────────────────────────────── */}
        <Link href="/institutional/dashboard" className="block mb-9 group">
          <div className="rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4
                          transition-all duration-200 group-hover:shadow-card-hover"
               style={{
                 background: 'linear-gradient(135deg, #4D4A43 0%, #3A3830 100%)',
                 boxShadow: '0 2px 10px rgba(46,42,36,0.14)',
               }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                   style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z
                           M15 19V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z
                           M21 19V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-bold text-white" style={{ letterSpacing: '-0.01em' }}>
                  Demand Intelligence
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Portal institucional para bancos y fintechs
                </p>
              </div>
            </div>
            <svg className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-1"
                 style={{ color: 'rgba(255,255,255,0.35)' }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* ── Divider + feed header ────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 h-px" style={{ backgroundColor: '#DED6C8' }} />
          <span className="text-[10px] font-semibold text-signal-ash uppercase tracking-widest whitespace-nowrap">
            Explorar Signal · {s.total}
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#DED6C8' }} />
        </div>

        {/* ── Search + filters ─────────────────────────────────────────────── */}
        <div className="mb-4">
          <Suspense><SearchBar /></Suspense>
        </div>
        <div className="mb-6">
          <Suspense><FeedFilters categories={categories} /></Suspense>
        </div>

        {/* ── Feed ─────────────────────────────────────────────────────────── */}
        <Suspense fallback={<FeedSkeleton />}>
          <FeedGrid categoryId={categoryId} search={search} page={page} searchParams={searchParams} />
        </Suspense>

      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function PulseStat({
  value, label, pct, color, barColor, fillColor,
}: {
  value: number; label: string; pct: number
  color: string; barColor: string; fillColor: string
}) {
  return (
    <div className="rounded-2xl p-3 sm:p-3.5"
         style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8',
                  boxShadow: '0 1px 4px rgba(46,42,36,0.04)' }}>
      <span className="text-[20px] sm:text-[26px] font-bold leading-none block mb-1"
            style={{ color, letterSpacing: '-0.04em' }}>
        {value}
      </span>
      <p className="text-[10px] sm:text-[11px] text-signal-text-muted mb-2 sm:mb-2.5 leading-tight">{label}</p>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: barColor }}>
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: fillColor }} />
      </div>
    </div>
  )
}

interface TrendingChipProps {
  id: string; title: string; category: string
  budget_min: number | null; budget_max: number | null; currency: string
  urgency: string; offer_count: number; view_count: number; created_at: string
  image_urls: string[]
}

function TrendingChip(p: TrendingChipProps) {
  const urgColor = URGENCY_COLOR[p.urgency] ?? '#DED6C8'
  const budget = p.budget_min || p.budget_max
    ? p.budget_min && p.budget_max
      ? `${fmtCurrency(p.budget_min, p.currency)} – ${fmtCurrency(p.budget_max, p.currency)}`
      : fmtCurrency((p.budget_min ?? p.budget_max)!, p.currency)
    : null

  return (
    <Link href={`/demand/${p.id}`} className="block group shrink-0 w-48">
      <div className="rounded-2xl overflow-hidden transition-all duration-200
                      hover:-translate-y-0.5 hover:shadow-card-hover"
           style={{
             backgroundColor: '#FFFDF8',
             border: '1px solid #DED6C8',
             boxShadow: '0 1px 6px rgba(46,42,36,0.04)',
           }}>
        {p.image_urls?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_urls[0]} alt="" className="w-full h-28 object-cover" />
        ) : (
          <div className="w-full h-16 flex items-center justify-center"
               style={{
                 background: `linear-gradient(135deg, ${urgColor}18 0%, ${urgColor}0a 100%)`,
                 borderBottom: `1.5px solid ${urgColor}44`,
               }}>
            <span className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: urgColor }}>
              {p.category}
            </span>
          </div>
        )}
        <div className="p-3">
          {p.image_urls?.[0] && (
            <p className="text-[9px] text-signal-ash uppercase tracking-wider mb-1">
              {p.category}
            </p>
          )}
          <h3 className="text-[12px] font-semibold text-signal-text leading-snug line-clamp-2 mb-1.5"
              style={{ letterSpacing: '-0.01em' }}>
            {p.title}
          </h3>
          <div className="flex items-center justify-between">
            {budget ? (
              <span className="text-[11px] font-bold text-signal-text">{budget}</span>
            ) : (
              <span className="text-[10px] text-signal-ash">{p.view_count} vistas</span>
            )}
            {p.offer_count > 0 && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(95,111,82,0.12)', color: '#5F6F52' }}>
                {p.offer_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function VolcanoSilhouette() {
  return (
    <svg viewBox="0 0 600 200" fill="none" xmlns="http://www.w3.org/2000/svg"
         className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
      <path d="M0 200 L100 80 L150 120 L220 30 L280 90 L340 20 L400 70 L460 40 L520 65 L600 35 L600 200 Z"
            fill="#171714" />
      <path d="M0 190 Q150 170 300 182 Q450 194 600 175 L600 200 L0 200 Z"
            fill="#5F5B52" fillOpacity="0.4" />
    </svg>
  )
}
