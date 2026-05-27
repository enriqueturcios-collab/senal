import { NextRequest, NextResponse } from 'next/server'
import { getMarketPrice } from '@/lib/institutional-data'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('category')
  const keywords   = searchParams.get('q')

  if (!categoryId && !keywords) {
    return NextResponse.json({ error: 'category or q required' }, { status: 400 })
  }

  try {
    const data = await getMarketPrice({
      categoryId: categoryId ? Number(categoryId) : undefined,
      keywords:   keywords ?? undefined,
    })

    return NextResponse.json({
      sample_size:   data.sample_size ?? 0,
      median_price:  data.median_price ?? null,
      avg_price:     data.avg_price    ?? null,
      p10:           data.p10          ?? null,
      p25:           data.p25          ?? null,
      p75:           data.p75          ?? null,
      p90:           data.p90          ?? null,
      confidence:    data.confidence,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
