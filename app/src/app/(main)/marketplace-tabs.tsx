'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingCard } from '@/components/demand/trending-card'
import { OfferCard } from '@/components/demand/offer-card'
import { fmtCurrency, timeAgo } from '@/lib/utils'

interface TrendingDemand {
  id: string; title: string; category: string
  budget_min: number | null; budget_max: number | null; currency: string
  urgency: string; offer_count: number; view_count: number; created_at: string
  image_urls: string[]
}
interface RecentOffer {
  id: string; demand_id: string; demand_title: string; category: string
  seller_name: string; price: number; currency: string
  description: string | null; estimated_days: number | null
  created_at: string; image_urls: string[]
}

interface MarketplaceTabsProps {
  trending: TrendingDemand[]
  offers: RecentOffer[]
  defaultTab?: 'demand' | 'offer'
}

function getCatAccent(cat: string): string {
  const goods    = ['Productos','Alimentación','Vehículos']
  const services = ['Servicios','Empleos y Trabajo','Inmuebles']
  if (goods.includes(cat))    return '#B8946F'
  if (services.includes(cat)) return '#5F6F52'
  return '#B8795B'
}

export function MarketplaceTabs({ trending, offers, defaultTab = 'demand' }: MarketplaceTabsProps) {
  const [tab, setTab] = useState<'demand' | 'offer'>(defaultTab)

  const isDemand = tab === 'demand'
  const isOffer  = tab === 'offer'

  // First offer with image is the featured one
  const featuredOffer = offers[0]
  const restOffers    = offers.slice(1)

  return (
    <section className="mb-10">
      {/* Segmented control */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex p-1 rounded-2xl" style={{ backgroundColor: '#EAE3D6' }}>
          <button
            onClick={() => setTab('demand')}
            className="px-5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200"
            style={{
              backgroundColor: isDemand ? '#FFFDF8' : 'transparent',
              color: isDemand ? '#5F6F52' : '#7A7468',
              boxShadow: isDemand ? '0 1px 4px rgba(46,42,36,0.10)' : 'none',
            }}
          >
            Demandas
          </button>
          <button
            onClick={() => setTab('offer')}
            className="px-5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200"
            style={{
              backgroundColor: isOffer ? '#FFFDF8' : 'transparent',
              color: isOffer ? '#B8795B' : '#7A7468',
              boxShadow: isOffer ? '0 1px 4px rgba(46,42,36,0.10)' : 'none',
            }}
          >
            Ofertas
          </button>
        </div>

        <p className="text-[12px] text-signal-text-muted hidden sm:block">
          {isDemand
            ? 'Lo que compradores están buscando'
            : 'Proveedores listos para responder'}
        </p>
      </div>

      {/* Demands */}
      {isDemand && (
        <div className="animate-fade-in">
          {trending.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto hide-scroll pb-2 -mx-5 px-5 md:-mx-8 md:px-8">
              {trending.map(d => <TrendingCard key={d.id} {...d} />)}
            </div>
          ) : (
            <div className="rounded-2xl p-8 text-center"
                 style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
              <p className="text-[13px] text-signal-text-muted">Sin demandas activas aún.</p>
            </div>
          )}
        </div>
      )}

      {/* Offers */}
      {isOffer && (
        <div className="animate-fade-in">
          {offers.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
                 style={{ backgroundColor: '#FFFDF8', border: '1px solid #DED6C8' }}>
              <p className="text-[13px] text-signal-text-muted">
                Aún no hay ofertas. Publica una demanda para recibirlas.
              </p>
            </div>
          ) : (
            <>
              {/* Featured first offer — full-width editorial */}
              {featuredOffer && (
                <Link href={`/demand/${featuredOffer.demand_id}`} className="block group mb-4">
                  <div className="rounded-3xl overflow-hidden transition-all duration-200
                                  hover:shadow-card-hover"
                       style={{
                         border: '1px solid #DED6C8',
                         boxShadow: '0 4px 20px rgba(46,42,36,0.07)',
                       }}>
                    {/* Cover */}
                    {featuredOffer.image_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={featuredOffer.image_urls[0]} alt=""
                           className="w-full h-52 md:h-64 object-cover" />
                    ) : (
                      <div className="w-full h-32 relative overflow-hidden"
                           style={{
                             background: `linear-gradient(135deg, ${getCatAccent(featuredOffer.category)}22 0%, ${getCatAccent(featuredOffer.category)}08 100%)`,
                             borderBottom: `2px solid ${getCatAccent(featuredOffer.category)}`,
                           }}>
                        {/* Seller initials big */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center
                                          text-[18px] font-bold text-white"
                               style={{ backgroundColor: getCatAccent(featuredOffer.category) }}>
                            {featuredOffer.seller_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5 md:p-6"
                         style={{
                           backgroundColor: '#FFFDF8',
                           borderTop: `3px solid ${getCatAccent(featuredOffer.category)}`,
                         }}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                             style={{ color: '#A7A196' }}>
                            {featuredOffer.category} · {featuredOffer.seller_name} · {timeAgo(featuredOffer.created_at)}
                          </p>
                          <p className="text-[28px] font-bold text-signal-text leading-none"
                             style={{ letterSpacing: '-0.03em' }}>
                            {fmtCurrency(featuredOffer.price, featuredOffer.currency)}
                          </p>
                          {featuredOffer.estimated_days && (
                            <p className="text-[12px] text-signal-text-muted mt-1">
                              Entrega en {featuredOffer.estimated_days} {featuredOffer.estimated_days === 1 ? 'día' : 'días'}
                            </p>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                                        group-hover:translate-x-0.5 transition-transform duration-200"
                             style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8' }}>
                          <svg className="w-4 h-4 text-signal-text-soft" fill="none" viewBox="0 0 24 24"
                               stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      {featuredOffer.description && (
                        <p className="text-[13px] text-signal-text-soft line-clamp-2 leading-relaxed mb-3">
                          {featuredOffer.description}
                        </p>
                      )}

                      <div className="pt-3" style={{ borderTop: '1px solid #EAE3D6' }}>
                        <p className="text-[11px] text-signal-ash">En respuesta a:</p>
                        <p className="text-[12px] font-medium text-signal-text-soft truncate mt-0.5">
                          {featuredOffer.demand_title}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Rest as horizontal scroll */}
              {restOffers.length > 0 && (
                <div className="flex gap-3 overflow-x-auto hide-scroll pb-2 -mx-5 px-5 md:-mx-8 md:px-8">
                  {restOffers.map(o => <OfferCard key={o.id} {...o} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
