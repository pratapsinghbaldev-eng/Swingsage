import { NextRequest, NextResponse } from 'next/server'
import { NSEAPIManager } from '@/lib/nse-api-providers'
import { DEFAULT_SYMBOLS, ScreenerInput, evaluateFilters, confidenceScore, type ScreenerRow } from '@/lib/screener'

const api = new NSEAPIManager()

// Simple in-memory cache for 60s
const cache = new Map<string, { timestamp: number, data: ScreenerRow[] }>()
const TTL_MS = 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<ScreenerInput>
    const symbols = (body.symbols && body.symbols.length ? body.symbols : DEFAULT_SYMBOLS).slice(0, 100)
    const filters = body.filters && body.filters.length ? body.filters : []

    const cacheKey = JSON.stringify({ symbols, filters })
    const now = Date.now()
    const hit = cache.get(cacheKey)
    if (hit && now - hit.timestamp < TTL_MS) {
      return NextResponse.json({ success: true, cached: true, results: hit.data, timestamp: new Date().toISOString() })
    }

    const results: ScreenerRow[] = []

    for (const symbol of symbols) {
      const bars = await api.getDailyOHLC(symbol, 120)
      if (bars.length === 0) continue
      const { matched, price } = evaluateFilters(bars, filters)
      if (matched.length > 0) {
        results.push({ symbol, price, matchedSignals: matched, confidence: confidenceScore(matched) })
      }
    }

    // Sort by confidence desc
    results.sort((a, b) => b.confidence - a.confidence)

    cache.set(cacheKey, { timestamp: now, data: results })
    return NextResponse.json({ success: true, cached: false, results, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Screener API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to run screener' }, { status: 500 })
  }
}


