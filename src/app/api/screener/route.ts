import { NextRequest, NextResponse } from 'next/server'
import { NSEAPIManager } from '@/lib/nse-api-providers'
import { DEFAULT_SYMBOLS, ScreenerInput, evaluateFilters, weightedConfidenceScore, hasTwoPlusAgreement, type ScreenerRow } from '@/lib/screener'
import { resolveSymbols, type IndexCode } from '@/lib/index-constituents'

const api = new NSEAPIManager()

// Simple in-memory cache for 60s
const cache = new Map<string, { timestamp: number, data: ScreenerRow[] }>()
const TTL_MS = 60 * 1000

type ScreenerBody = Partial<{
  symbols: Array<string>,
  filters: Array<string>,
  requireTwoPlus: boolean,
  minConfidence: number,
  requireWeeklyAgree: boolean,
}>

export async function POST(req: NextRequest) {
  try {
    const body: ScreenerBody = await req.json()
    // Accept raw symbols or index codes
    const raw = (body.symbols && body.symbols.length ? body.symbols : DEFAULT_SYMBOLS).slice(0, 100) as Array<string | IndexCode>
    const symbols = resolveSymbols(raw).slice(0, 100)
    const filters = body.filters && body.filters.length ? (body.filters as ScreenerInput['filters']) : []
    const requireTwoPlus = typeof body.requireTwoPlus === 'boolean' ? body.requireTwoPlus : true
    const minConfidence = typeof body.minConfidence === 'number' ? Math.max(0, Math.min(1, body.minConfidence)) : 0.7
    const requireWeeklyAgree = typeof body.requireWeeklyAgree === 'boolean' ? body.requireWeeklyAgree : false

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

      // Optional weekly confirmation
      let weeklyAgree = true
      if (requireWeeklyAgree) {
        // Build weekly bars by grouping 5 trading days (approx)
        const weekly: typeof bars = []
        for (let i = 0; i < bars.length; i += 5) {
          const chunk = bars.slice(i, i + 5)
          if (chunk.length === 0) continue
          weekly.push({
            time: chunk[chunk.length - 1].time,
            open: chunk[0].open,
            high: Math.max(...chunk.map(c => c.high)),
            low: Math.min(...chunk.map(c => c.low)),
            close: chunk[chunk.length - 1].close,
            volume: chunk.reduce((a, c) => a + (c.volume || 0), 0),
          })
        }
        const wEval = evaluateFilters(weekly, filters)
        const agreeSide = hasTwoPlusAgreement(wEval.matched)
        weeklyAgree = agreeSide.ok
      }

      if (matched.length > 0) {
        const agreement = hasTwoPlusAgreement(matched)
        const conf = weightedConfidenceScore(matched)
        if ((requireTwoPlus ? agreement.ok : true) && conf >= minConfidence && weeklyAgree) {
          results.push({ symbol, price, matchedSignals: matched, confidence: conf })
        }
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


