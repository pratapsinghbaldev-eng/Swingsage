import { NextRequest, NextResponse } from 'next/server'
import { NSEAPIManager } from '@/lib/nse-api-providers'
import { resolveSymbols, type IndexCode } from '@/lib/index-constituents'
import { rsi, ema, macd } from '@/lib/indicators'
import type { DailyBar } from '@/lib/api'

const api = new NSEAPIManager()

// Simple in-memory cache for 60s
const cache = new Map<string, { timestamp: number, data: PivotScreenerRow[] }>()
const TTL_MS = 60 * 1000

export type PivotLevel = 'PP' | 'S1' | 'S2' | 'R1' | 'R2'

export interface PivotScreenerFilters {
  universe: IndexCode
  proximity: PivotLevel
  rsiBelow?: number
  rsiAbove?: number
  macdBullish?: boolean
  macdBearish?: boolean
  emaTrendUp?: boolean
  emaTrendDown?: boolean
  volumeMin?: number
}

export interface PivotScreenerRow {
  symbol: string
  price: number
  pivotPoints: {
    PP: number
    S1: number
    S2: number
    R1: number
    R2: number
  }
  proximity: {
    level: PivotLevel
    distance: number
    percentage: number
  }
  indicators: {
    rsi?: number
    macdSignal?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    emaSignal?: 'UP' | 'DOWN' | 'NEUTRAL'
  }
  volume?: number
  matchedSetup: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

type PivotScreenerBody = Partial<PivotScreenerFilters>

// Calculate pivot points from weekly OHLC
function calculatePivotPoints(weeklyBars: DailyBar[]) {
  if (weeklyBars.length === 0) return null
  
  // Use last week's data (last 5 trading days)
  const lastWeek = weeklyBars.slice(-5)
  const high = Math.max(...lastWeek.map(b => b.high))
  const low = Math.min(...lastWeek.map(b => b.low))
  const close = lastWeek[lastWeek.length - 1].close
  
  const PP = (high + low + close) / 3
  const S1 = (2 * PP) - high
  const S2 = PP - (high - low)
  const R1 = (2 * PP) - low
  const R2 = PP + (high - low)
  
  return { PP, S1, S2, R1, R2 }
}

// Find closest pivot level and distance
function findClosestPivot(price: number, pivots: { PP: number, S1: number, S2: number, R1: number, R2: number }) {
  const levels: Array<{ level: PivotLevel, value: number }> = [
    { level: 'PP', value: pivots.PP },
    { level: 'S1', value: pivots.S1 },
    { level: 'S2', value: pivots.S2 },
    { level: 'R1', value: pivots.R1 },
    { level: 'R2', value: pivots.R2 }
  ]
  
  let closest = levels[0]
  let minDistance = Math.abs(price - closest.value)
  
  for (const level of levels) {
    const distance = Math.abs(price - level.value)
    if (distance < minDistance) {
      minDistance = distance
      closest = level
    }
  }
  
  return {
    level: closest.level,
    distance: minDistance,
    percentage: (minDistance / price) * 100
  }
}

// Check if price is near specified pivot level
function isNearPivotLevel(price: number, pivots: { PP: number, S1: number, S2: number, R1: number, R2: number }, targetLevel: PivotLevel, tolerance: number = 1.0) {
  const targetValue = pivots[targetLevel]
  const percentage = Math.abs((price - targetValue) / price) * 100
  return percentage <= tolerance
}

export async function POST(req: NextRequest) {
  try {
    const body: PivotScreenerBody = await req.json()
    
    // Default filters
    const universe = body.universe || 'NIFTY50'
    const proximity = body.proximity || 'PP'
    const rsiBelow = body.rsiBelow
    const rsiAbove = body.rsiAbove
    const macdBullish = body.macdBullish
    const macdBearish = body.macdBearish
    const emaTrendUp = body.emaTrendUp
    const emaTrendDown = body.emaTrendDown
    const volumeMin = body.volumeMin
    
    // Get symbols from universe
    const symbols = resolveSymbols([universe]).slice(0, 100)
    
    const cacheKey = JSON.stringify({ symbols, ...body })
    const now = Date.now()
    const hit = cache.get(cacheKey)
    if (hit && now - hit.timestamp < TTL_MS) {
      return NextResponse.json({ 
        success: true, 
        cached: true, 
        results: hit.data, 
        timestamp: new Date().toISOString() 
      })
    }
    
    const results: PivotScreenerRow[] = []
    
    for (const symbol of symbols) {
      try {
        // Get daily OHLC data for last 30 days
        const bars = await api.getDailyOHLC(symbol, 30)
        if (bars.length < 10) continue
        
        // Calculate pivot points
        const pivotPoints = calculatePivotPoints(bars)
        if (!pivotPoints) continue
        
        const currentPrice = bars[bars.length - 1].close
        const currentVolume = bars[bars.length - 1].volume || 0
        
        // Check if price is near the specified pivot level
        if (!isNearPivotLevel(currentPrice, pivotPoints, proximity, proximity === 'PP' ? 0.5 : 1.0)) {
          continue
        }
        
        // Calculate indicators
        const closes = bars.map(b => b.close)
        const rsi14 = rsi(closes, 14)
        const ema20 = ema(closes, 20)
        const ema50 = ema(closes, 50)
        const macdData = macd(closes, 12, 26, 9)
        
        const currentRSI = rsi14[rsi14.length - 1]
        const currentEMA20 = ema20[ema20.length - 1]
        const currentEMA50 = ema50[ema50.length - 1]
        const currentMACD = macdData.macdLine[macdData.macdLine.length - 1]
        const currentSignal = macdData.signalLine[macdData.signalLine.length - 1]
        const prevMACD = macdData.macdLine[macdData.macdLine.length - 2]
        const prevSignal = macdData.signalLine[macdData.signalLine.length - 2]
        
        // Apply filters
        if (rsiBelow !== undefined && (currentRSI === null || currentRSI >= rsiBelow)) continue
        if (rsiAbove !== undefined && (currentRSI === null || currentRSI <= rsiAbove)) continue
        if (volumeMin !== undefined && currentVolume < volumeMin) continue
        
        // MACD signal
        let macdSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
        if (currentMACD !== null && currentSignal !== null && prevMACD !== null && prevSignal !== null) {
          if (prevMACD <= prevSignal && currentMACD > currentSignal) {
            macdSignal = 'BULLISH'
          } else if (prevMACD >= prevSignal && currentMACD < currentSignal) {
            macdSignal = 'BEARISH'
          }
        }
        
        if (macdBullish && macdSignal !== 'BULLISH') continue
        if (macdBearish && macdSignal !== 'BEARISH') continue
        
        // EMA trend signal
        let emaSignal: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL'
        if (currentEMA20 !== null && currentEMA50 !== null) {
          if (currentPrice > currentEMA20 && currentEMA20 > currentEMA50) {
            emaSignal = 'UP'
          } else if (currentPrice < currentEMA20 && currentEMA20 < currentEMA50) {
            emaSignal = 'DOWN'
          }
        }
        
        if (emaTrendUp && emaSignal !== 'UP') continue
        if (emaTrendDown && emaSignal !== 'DOWN') continue
        
        // Determine overall setup
        let matchedSetup: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
        
        // Near support levels (S1, S2) with bullish indicators = BULLISH
        if ((proximity === 'S1' || proximity === 'S2') && 
            (macdSignal === 'BULLISH' || emaSignal === 'UP' || (currentRSI !== null && currentRSI < 40))) {
          matchedSetup = 'BULLISH'
        }
        
        // Near resistance levels (R1, R2) with bearish indicators = BEARISH
        if ((proximity === 'R1' || proximity === 'R2') && 
            (macdSignal === 'BEARISH' || emaSignal === 'DOWN' || (currentRSI !== null && currentRSI > 60))) {
          matchedSetup = 'BEARISH'
        }
        
        // Near pivot point - depends on other indicators
        if (proximity === 'PP') {
          if (macdSignal === 'BULLISH' || emaSignal === 'UP') {
            matchedSetup = 'BULLISH'
          } else if (macdSignal === 'BEARISH' || emaSignal === 'DOWN') {
            matchedSetup = 'BEARISH'
          }
        }
        
        const proximityInfo = findClosestPivot(currentPrice, pivotPoints)
        
        results.push({
          symbol,
          price: currentPrice,
          pivotPoints,
          proximity: proximityInfo,
          indicators: {
            rsi: currentRSI || undefined,
            macdSignal,
            emaSignal
          },
          volume: currentVolume,
          matchedSetup
        })
        
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error)
        continue
      }
    }
    
    // Sort by setup priority (BULLISH/BEARISH first) then by proximity percentage
    results.sort((a, b) => {
      if (a.matchedSetup !== 'NEUTRAL' && b.matchedSetup === 'NEUTRAL') return -1
      if (a.matchedSetup === 'NEUTRAL' && b.matchedSetup !== 'NEUTRAL') return 1
      return a.proximity.percentage - b.proximity.percentage
    })
    
    cache.set(cacheKey, { timestamp: now, data: results })
    return NextResponse.json({ 
      success: true, 
      cached: false, 
      results, 
      timestamp: new Date().toISOString() 
    })
    
  } catch (error) {
    console.error('Pivot Screener API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to run pivot screener' 
    }, { status: 500 })
  }
}
