/**
 * Long-Only Trading Strategies Library
 * Implements 5 long-only strategies combining pivot points with multi-timeframe analysis
 */

import { rsi, ema, macd } from './indicators'
import type { DailyBar } from './api'

export type StrategyName = 
  | 'support-bounce'
  | 'breakout-retest'
  | 'golden-cross'
  | 'camarilla-reversal'
  | 'triple-confluence'

export interface StrategyResult {
  strategy: StrategyName
  signal: boolean
  confidence: number // 0-100
  reason: string
  metadata?: Record<string, number | string | boolean>
}

export interface PivotPoints {
  PP: number
  S1: number
  S2: number
  S3?: number // Camarilla
  R1: number
  R2: number
  R3?: number // Camarilla
}

export interface MultiTimeframeData {
  daily: DailyBar[]
  h4?: DailyBar[] // 4-hour candles
  h1?: DailyBar[] // 1-hour candles
}

/**
 * Calculate Camarilla Pivot Points
 */
export function calculateCamarillaPivots(bars: DailyBar[]): PivotPoints | null {
  if (bars.length === 0) return null
  
  const lastWeek = bars.slice(-5)
  const high = Math.max(...lastWeek.map(b => b.high))
  const low = Math.min(...lastWeek.map(b => b.low))
  const close = lastWeek[lastWeek.length - 1].close
  
  const range = high - low
  const PP = (high + low + close) / 3
  
  // Standard pivots
  const S1 = (2 * PP) - high
  const S2 = PP - range
  const R1 = (2 * PP) - low
  const R2 = PP + range
  
  // Camarilla levels
  const S3 = close - range * 1.1 / 4
  const R3 = close + range * 1.1 / 4
  
  return { PP, S1, S2, S3, R1, R2, R3 }
}

/**
 * Calculate standard pivot points (for compatibility)
 */
export function calculatePivotPoints(bars: DailyBar[]): PivotPoints | null {
  if (bars.length === 0) return null
  
  const lastWeek = bars.slice(-5)
  const high = Math.max(...lastWeek.map(b => b.high))
  const low = Math.min(...lastWeek.map(b => b.low))
  const close = lastWeek[lastWeek.length - 1].close
  
  const PP = (high + low + close) / 3
  const range = high - low
  const S1 = (2 * PP) - high
  const S2 = PP - range
  const R1 = (2 * PP) - low
  const R2 = PP + range
  
  return { PP, S1, S2, R1, R2 }
}

/**
 * Calculate EMA slope (positive = uptrend)
 */
function emaSlope(emaValues: (number | null)[], lookback: number = 3): number | null {
  if (emaValues.length < lookback + 1) return null
  
  const recent = emaValues.slice(-lookback - 1).filter(v => v !== null) as number[]
  if (recent.length < lookback + 1) return null
  
  const slope = (recent[recent.length - 1] - recent[0]) / recent[0]
  return slope
}

/**
 * Check if price is within a range of target level
 */
function isPriceNear(price: number, target: number, tolerancePct: number = 0.25): boolean {
  const pct = Math.abs((price - target) / price) * 100
  return pct <= tolerancePct
}

/**
 * Check if price is between two levels
 */
function isPriceBetween(price: number, lower: number, upper: number): boolean {
  return price >= lower && price <= upper
}

/**
 * Strategy 1: Support Bounce + RSI Confirmation
 * - Daily: Price > EMA50, EMA50 slope up
 * - 4H: Price between S1–S2
 * - 1H: RSI cross back > 40
 */
export function evaluateSupportBounce(data: MultiTimeframeData, pivots: PivotPoints): StrategyResult {
  const { daily, h4, h1 } = data
  
  if (!daily || daily.length < 50) {
    return { strategy: 'support-bounce', signal: false, confidence: 0, reason: 'Insufficient daily data' }
  }
  
  const dailyCloses = daily.map(b => b.close)
  const dailyEMA50 = ema(dailyCloses, 50)
  const currentPrice = dailyCloses[dailyCloses.length - 1]
  const currentEMA50 = dailyEMA50[dailyEMA50.length - 1]
  
  // Daily checks
  if (!currentEMA50 || currentPrice <= currentEMA50) {
    return { strategy: 'support-bounce', signal: false, confidence: 0, reason: 'Price not above EMA50' }
  }
  
  const slope = emaSlope(dailyEMA50, 5)
  if (!slope || slope <= 0) {
    return { strategy: 'support-bounce', signal: false, confidence: 0, reason: 'EMA50 slope not positive' }
  }
  
  // 4H checks
  if (!h4 || h4.length < 20) {
    return { strategy: 'support-bounce', signal: false, confidence: 30, reason: '4H data unavailable, partial match' }
  }
  
  const h4Price = h4[h4.length - 1].close
  if (!isPriceBetween(h4Price, pivots.S2 || pivots.S1, pivots.S1)) {
    return { strategy: 'support-bounce', signal: false, confidence: 0, reason: 'Price not between S1-S2' }
  }
  
  // 1H checks
  if (!h1 || h1.length < 20) {
    return { strategy: 'support-bounce', signal: true, confidence: 60, reason: '1H data unavailable but daily/4H conditions met' }
  }
  
  const h1Closes = h1.map(b => b.close)
  const h1RSI = rsi(h1Closes, 14)
  const currentRSI = h1RSI[h1RSI.length - 1]
  const prevRSI = h1RSI[h1RSI.length - 2]
  
  if (prevRSI !== null && currentRSI !== null && prevRSI <= 40 && currentRSI > 40) {
    return { 
      strategy: 'support-bounce', 
      signal: true, 
      confidence: 85, 
      reason: 'RSI crossed above 40 near S1-S2 support',
      metadata: { rsi: currentRSI, ema50Slope: slope }
    }
  }
  
  return { strategy: 'support-bounce', signal: false, confidence: 40, reason: 'RSI condition not met' }
}

/**
 * Strategy 2: Breakout & Retest + MACD
 * - Daily: Price > EMA50
 * - 4H: Close > R1, then retest R1 within ±0.25%
 * - 1H: MACD bullish cross near retest
 */
export function evaluateBreakoutRetest(data: MultiTimeframeData, pivots: PivotPoints): StrategyResult {
  const { daily, h4, h1 } = data
  
  if (!daily || daily.length < 50) {
    return { strategy: 'breakout-retest', signal: false, confidence: 0, reason: 'Insufficient daily data' }
  }
  
  const dailyCloses = daily.map(b => b.close)
  const dailyEMA50 = ema(dailyCloses, 50)
  const currentPrice = dailyCloses[dailyCloses.length - 1]
  const currentEMA50 = dailyEMA50[dailyEMA50.length - 1]
  
  if (!currentEMA50 || currentPrice <= currentEMA50) {
    return { strategy: 'breakout-retest', signal: false, confidence: 0, reason: 'Price not above EMA50' }
  }
  
  // 4H checks
  if (!h4 || h4.length < 20) {
    return { strategy: 'breakout-retest', signal: false, confidence: 20, reason: '4H data unavailable' }
  }
  
  const h4Price = h4[h4.length - 1].close
  
  // Check if recently broke above R1 and now retesting
  let brokAboveR1 = false
  for (let i = Math.max(0, h4.length - 10); i < h4.length - 1; i++) {
    if (h4[i].close > pivots.R1) {
      brokAboveR1 = true
      break
    }
  }
  
  if (!brokAboveR1) {
    return { strategy: 'breakout-retest', signal: false, confidence: 0, reason: 'No recent R1 breakout detected' }
  }
  
  const isRetesting = isPriceNear(h4Price, pivots.R1, 0.25)
  if (!isRetesting) {
    return { strategy: 'breakout-retest', signal: false, confidence: 30, reason: 'Not retesting R1 level' }
  }
  
  // 1H MACD check
  if (!h1 || h1.length < 30) {
    return { strategy: 'breakout-retest', signal: true, confidence: 60, reason: '1H data unavailable but retest confirmed' }
  }
  
  const h1Closes = h1.map(b => b.close)
  const h1MACD = macd(h1Closes, 12, 26, 9)
  const currentMACD = h1MACD.macdLine[h1MACD.macdLine.length - 1]
  const currentSignal = h1MACD.signalLine[h1MACD.signalLine.length - 1]
  const prevMACD = h1MACD.macdLine[h1MACD.macdLine.length - 2]
  const prevSignal = h1MACD.signalLine[h1MACD.signalLine.length - 2]
  
  if (prevMACD !== null && prevSignal !== null && currentMACD !== null && currentSignal !== null) {
    if (prevMACD <= prevSignal && currentMACD > currentSignal) {
      return { 
        strategy: 'breakout-retest', 
        signal: true, 
        confidence: 90, 
        reason: 'R1 retest with MACD bullish crossover',
        metadata: { r1: pivots.R1, price: h4Price }
      }
    }
  }
  
  return { strategy: 'breakout-retest', signal: false, confidence: 45, reason: 'MACD bullish cross not confirmed' }
}

/**
 * Strategy 3: Golden Cross + Fib Pullback
 * - Daily: EMA50 > EMA200 (Golden Cross)
 * - 4H: Price near Fib S1/S2
 * - 1H: Bullish candle + RSI cross > 50
 */
export function evaluateGoldenCross(data: MultiTimeframeData, pivots: PivotPoints): StrategyResult {
  const { daily, h4, h1 } = data
  
  if (!daily || daily.length < 200) {
    return { strategy: 'golden-cross', signal: false, confidence: 0, reason: 'Insufficient daily data for EMA200' }
  }
  
  const dailyCloses = daily.map(b => b.close)
  const dailyEMA50 = ema(dailyCloses, 50)
  const dailyEMA200 = ema(dailyCloses, 200)
  const currentEMA50 = dailyEMA50[dailyEMA50.length - 1]
  const currentEMA200 = dailyEMA200[dailyEMA200.length - 1]
  
  if (!currentEMA50 || !currentEMA200 || currentEMA50 <= currentEMA200) {
    return { strategy: 'golden-cross', signal: false, confidence: 0, reason: 'EMA50 not above EMA200 (no golden cross)' }
  }
  
  // 4H checks
  if (!h4 || h4.length < 20) {
    return { strategy: 'golden-cross', signal: false, confidence: 25, reason: '4H data unavailable' }
  }
  
  const h4Price = h4[h4.length - 1].close
  const nearS1orS2 = isPriceNear(h4Price, pivots.S1, 1.0) || isPriceNear(h4Price, pivots.S2 || pivots.S1, 1.0)
  
  if (!nearS1orS2) {
    return { strategy: 'golden-cross', signal: false, confidence: 20, reason: 'Price not near S1/S2 pullback zone' }
  }
  
  // 1H checks
  if (!h1 || h1.length < 20) {
    return { strategy: 'golden-cross', signal: true, confidence: 65, reason: '1H data unavailable but golden cross + pullback confirmed' }
  }
  
  const h1Closes = h1.map(b => b.close)
  const h1RSI = rsi(h1Closes, 14)
  const currentRSI = h1RSI[h1RSI.length - 1]
  const prevRSI = h1RSI[h1RSI.length - 2]
  
  // Check for bullish candle
  const lastCandle = h1[h1.length - 1]
  const isBullish = lastCandle.close > lastCandle.open
  
  if (prevRSI !== null && currentRSI !== null && prevRSI <= 50 && currentRSI > 50 && isBullish) {
    return { 
      strategy: 'golden-cross', 
      signal: true, 
      confidence: 88, 
      reason: 'Golden cross with pullback + RSI cross > 50',
      metadata: { ema50: currentEMA50, ema200: currentEMA200, rsi: currentRSI }
    }
  }
  
  return { strategy: 'golden-cross', signal: false, confidence: 50, reason: '1H RSI/candle conditions not met' }
}

/**
 * Strategy 4: Camarilla Reversal + MACD Divergence
 * - Daily: Bullish MACD divergence
 * - 4H: Price touches S3, then closes back above S3
 */
export function evaluateCamarillaReversal(data: MultiTimeframeData, pivots: PivotPoints): StrategyResult {
  const { daily, h4 } = data
  
  if (!daily || daily.length < 30) {
    return { strategy: 'camarilla-reversal', signal: false, confidence: 0, reason: 'Insufficient daily data' }
  }
  
  if (!pivots.S3) {
    return { strategy: 'camarilla-reversal', signal: false, confidence: 0, reason: 'Camarilla S3 not available' }
  }
  
  const dailyCloses = daily.map(b => b.close)
  const dailyLows = daily.map(b => b.low)
  const dailyMACD = macd(dailyCloses, 12, 26, 9)
  
  // Check for bullish divergence: lower price lows but higher MACD lows
  let bullishDivergence = false
  if (daily.length >= 10) {
    const recentBars = 10
    const priceSlice = dailyLows.slice(-recentBars)
    const macdSlice = dailyMACD.macdLine.slice(-recentBars).filter(v => v !== null) as number[]
    
    if (macdSlice.length >= 5) {
      const priceLowest = Math.min(...priceSlice)
      const priceLowestIdx = priceSlice.indexOf(priceLowest)
      const macdLowest = Math.min(...macdSlice)
      const macdLowestIdx = macdSlice.indexOf(macdLowest)
      
      // Simple divergence check: price made lower low but MACD didn't
      if (priceLowestIdx !== macdLowestIdx && priceLowestIdx > macdLowestIdx) {
        bullishDivergence = true
      }
    }
  }
  
  if (!bullishDivergence) {
    return { strategy: 'camarilla-reversal', signal: false, confidence: 0, reason: 'No bullish MACD divergence detected' }
  }
  
  // 4H checks
  if (!h4 || h4.length < 10) {
    return { strategy: 'camarilla-reversal', signal: true, confidence: 55, reason: '4H data unavailable but divergence present' }
  }
  
  const h4Price = h4[h4.length - 1].close
  
  // Check if recently touched S3 and closed above it
  let touchedS3 = false
  for (let i = Math.max(0, h4.length - 10); i < h4.length; i++) {
    if (h4[i].low <= pivots.S3) {
      touchedS3 = true
      break
    }
  }
  
  if (!touchedS3) {
    return { strategy: 'camarilla-reversal', signal: false, confidence: 30, reason: 'S3 not touched recently' }
  }
  
  if (h4Price > pivots.S3) {
    return { 
      strategy: 'camarilla-reversal', 
      signal: true, 
      confidence: 85, 
      reason: 'Camarilla S3 reversal with MACD divergence',
      metadata: { s3: pivots.S3, price: h4Price }
    }
  }
  
  return { strategy: 'camarilla-reversal', signal: false, confidence: 40, reason: 'Price not back above S3' }
}

/**
 * Strategy 5: Triple Confluence
 * - Daily: Price > EMA50, EMA50 slope up
 * - 4H: Price testing S1/S2
 * - 1H: RSI cross > 40 + MACD bullish cross within last 3 candles
 */
export function evaluateTripleConfluence(data: MultiTimeframeData, pivots: PivotPoints): StrategyResult {
  const { daily, h4, h1 } = data
  
  if (!daily || daily.length < 50) {
    return { strategy: 'triple-confluence', signal: false, confidence: 0, reason: 'Insufficient daily data' }
  }
  
  const dailyCloses = daily.map(b => b.close)
  const dailyEMA50 = ema(dailyCloses, 50)
  const currentPrice = dailyCloses[dailyCloses.length - 1]
  const currentEMA50 = dailyEMA50[dailyEMA50.length - 1]
  
  // Daily checks
  if (!currentEMA50 || currentPrice <= currentEMA50) {
    return { strategy: 'triple-confluence', signal: false, confidence: 0, reason: 'Price not above EMA50' }
  }
  
  const slope = emaSlope(dailyEMA50, 5)
  if (!slope || slope <= 0) {
    return { strategy: 'triple-confluence', signal: false, confidence: 0, reason: 'EMA50 slope not positive' }
  }
  
  // 4H checks
  if (!h4 || h4.length < 20) {
    return { strategy: 'triple-confluence', signal: false, confidence: 25, reason: '4H data unavailable' }
  }
  
  const h4Price = h4[h4.length - 1].close
  const testingS1orS2 = isPriceNear(h4Price, pivots.S1, 1.0) || isPriceNear(h4Price, pivots.S2 || pivots.S1, 1.0)
  
  if (!testingS1orS2) {
    return { strategy: 'triple-confluence', signal: false, confidence: 15, reason: 'Not testing S1/S2' }
  }
  
  // 1H checks
  if (!h1 || h1.length < 30) {
    return { strategy: 'triple-confluence', signal: true, confidence: 60, reason: '1H data unavailable but daily/4H conditions met' }
  }
  
  const h1Closes = h1.map(b => b.close)
  const h1RSI = rsi(h1Closes, 14)
  const h1MACD = macd(h1Closes, 12, 26, 9)
  
  const currentRSI = h1RSI[h1RSI.length - 1]
  const prevRSI = h1RSI[h1RSI.length - 2]
  
  const rsiCrossed = prevRSI !== null && currentRSI !== null && prevRSI <= 40 && currentRSI > 40
  
  // Check for MACD bullish cross in last 3 candles
  let macdBullishCross = false
  for (let i = Math.max(0, h1MACD.macdLine.length - 3); i < h1MACD.macdLine.length; i++) {
    const prevIdx = i - 1
    if (prevIdx < 0) continue
    
    const prevMACD = h1MACD.macdLine[prevIdx]
    const prevSignal = h1MACD.signalLine[prevIdx]
    const currMACD = h1MACD.macdLine[i]
    const currSignal = h1MACD.signalLine[i]
    
    if (prevMACD !== null && prevSignal !== null && currMACD !== null && currSignal !== null) {
      if (prevMACD <= prevSignal && currMACD > currSignal) {
        macdBullishCross = true
        break
      }
    }
  }
  
  if (rsiCrossed && macdBullishCross) {
    return { 
      strategy: 'triple-confluence', 
      signal: true, 
      confidence: 92, 
      reason: 'Triple confluence: EMA trend + S1/S2 test + RSI/MACD bullish',
      metadata: { rsi: currentRSI, ema50Slope: slope }
    }
  }
  
  if (rsiCrossed || macdBullishCross) {
    return { strategy: 'triple-confluence', signal: true, confidence: 70, reason: 'Partial confluence (2/3 conditions met)' }
  }
  
  return { strategy: 'triple-confluence', signal: false, confidence: 40, reason: '1H indicators not aligned' }
}

/**
 * Evaluate all strategies for given data
 */
export function evaluateAllStrategies(data: MultiTimeframeData): StrategyResult[] {
  // Calculate pivot points from daily data
  const pivots = calculateCamarillaPivots(data.daily)
  
  if (!pivots) {
    return []
  }
  
  return [
    evaluateSupportBounce(data, pivots),
    evaluateBreakoutRetest(data, pivots),
    evaluateGoldenCross(data, pivots),
    evaluateCamarillaReversal(data, pivots),
    evaluateTripleConfluence(data, pivots),
  ]
}

/**
 * Get strategy display name
 */
export function getStrategyDisplayName(strategy: StrategyName): string {
  const names: Record<StrategyName, string> = {
    'support-bounce': 'Support Bounce',
    'breakout-retest': 'Breakout & Retest',
    'golden-cross': 'Golden Cross',
    'camarilla-reversal': 'Camarilla Reversal',
    'triple-confluence': 'Triple Confluence',
  }
  return names[strategy]
}

/**
 * Get strategy description
 */
export function getStrategyDescription(strategy: StrategyName): string {
  const descriptions: Record<StrategyName, string> = {
    'support-bounce': 'Daily uptrend + 4H price testing S1-S2 + 1H RSI cross > 40',
    'breakout-retest': 'Daily > EMA50 + 4H R1 breakout retest + 1H MACD bullish',
    'golden-cross': 'Daily golden cross + 4H pullback to S1/S2 + 1H RSI > 50',
    'camarilla-reversal': 'Daily MACD divergence + 4H S3 touch & reversal',
    'triple-confluence': 'Daily EMA uptrend + 4H S1/S2 test + 1H RSI & MACD bullish',
  }
  return descriptions[strategy]
}
