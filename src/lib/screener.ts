import { atr, bollinger, ema, macd, rsi } from './indicators'
import { generateSignals, type TradeSignal } from './signals'
import type { DailyBar } from './api'

export type ScreenerFilterId =
  | 'rsiOversold'
  | 'rsiOverbought'
  | 'emaBullish'
  | 'emaBearish'
  | 'macdBullish'
  | 'macdBearish'
  | 'bbBreakoutUp'
  | 'bbBreakdown'
  | 'atrSpike'
  | 'trendReversal'

export interface ScreenerInput {
  symbols: string[]
  filters: ScreenerFilterId[]
}

export interface ScreenerRow {
  symbol: string
  name?: string
  price: number
  matchedSignals: TradeSignal[]
  confidence: number
}

export const DEFAULT_SYMBOLS: string[] = [
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','BHARTIARTL','ITC','KOTAKBANK','LT','SBIN','ASIANPAINT','MARUTI','BAJFINANCE','HCLTECH','AXISBANK','WIPRO','ONGC','TATAMOTORS','SUNPHARMA','ULTRACEMCO','TECHM','TITAN','POWERGRID','NESTLEIND','JSWSTEEL','NTPC','BAJAJFINSV','DRREDDY','TATACONSUM','HEROMOTOCO','BRITANNIA','COALINDIA','CIPLA','DIVISLAB','EICHERMOT','GRASIM','HINDALCO','INDUSINDBK','SHREECEM','TATASTEEL','ADANIPORTS','APOLLOHOSP','BPCL','GODREJCP','HDFCLIFE','ICICIPRULI','SBILIFE','M&M','PIDILITIND'
]

export function evaluateFilters(bars: DailyBar[], filters: ScreenerFilterId[]): { matched: TradeSignal[], price: number } {
  if (!bars || bars.length < 30) return { matched: [], price: 0 }
  const i = bars.length - 1
  const prev = i - 1
  const closes = bars.map(b => b.close)
  const highs = bars.map(b => b.high)
  const lows = bars.map(b => b.low)
  const volumes = bars.map(b => b.volume || 0)

  const price = closes[i]
  const rsi14 = rsi(closes, 14)
  const ema20 = ema(closes, 20)
  const ema50 = ema(closes, 50)
  const macdData = macd(closes, 12, 26, 9)
  const bb = bollinger(closes, 20, 2)
  const atr14 = atr(highs, lows, closes, 14)
  const atrAvg20 = average(atr14.slice(-20).filter(v => v != null) as number[])

  const matched: TradeSignal[] = []
  const ts = typeof bars[i].time === 'string' ? bars[i].time as string : (bars[i].time as Date).toISOString()

  function add(type: 'BUY' | 'SELL', indicator: TradeSignal['indicator'], reason: string, strength: TradeSignal['strength'] = 'moderate') {
    matched.push({ type, indicator, reason, timestamp: ts, strength })
  }

  for (const f of filters) {
    switch (f) {
      case 'rsiOversold': {
        const val = rsi14[i]
        if (val != null && val < 30) add('BUY','RSI',`RSI oversold at ${val.toFixed(1)}`,'moderate')
        break
      }
      case 'rsiOverbought': {
        const val = rsi14[i]
        if (val != null && val > 70) add('SELL','RSI',`RSI overbought at ${val.toFixed(1)}`,'moderate')
        break
      }
      case 'emaBullish': {
        if (ema20[i] != null && ema50[i] != null && price > (ema20[i] as number) && (ema20[i] as number) > (ema50[i] as number)) {
          add('BUY','EMA','Price > EMA20 and EMA20 > EMA50','strong')
        }
        break
      }
      case 'emaBearish': {
        if (ema20[i] != null && ema50[i] != null && price < (ema20[i] as number) && (ema20[i] as number) < (ema50[i] as number)) {
          add('SELL','EMA','Price < EMA20 and EMA20 < EMA50','strong')
        }
        break
      }
      case 'macdBullish': {
        if (macdData.macdLine[prev] != null && macdData.signalLine[prev] != null && macdData.macdLine[i] != null && macdData.signalLine[i] != null) {
          const pm = macdData.macdLine[prev] as number
          const ps = macdData.signalLine[prev] as number
          const cm = macdData.macdLine[i] as number
          const cs = macdData.signalLine[i] as number
          if (pm <= ps && cm > cs) add('BUY','MACD','MACD crossed above signal','moderate')
        }
        break
      }
      case 'macdBearish': {
        if (macdData.macdLine[prev] != null && macdData.signalLine[prev] != null && macdData.macdLine[i] != null && macdData.signalLine[i] != null) {
          const pm = macdData.macdLine[prev] as number
          const ps = macdData.signalLine[prev] as number
          const cm = macdData.macdLine[i] as number
          const cs = macdData.signalLine[i] as number
          if (pm >= ps && cm < cs) add('SELL','MACD','MACD crossed below signal','moderate')
        }
        break
      }
      case 'bbBreakoutUp': {
        if (bb.upper[i] != null) {
          const upper = bb.upper[i] as number
          const avgVol = average(volumes.slice(-20))
          if (price > upper && volumes[i] > 1.5 * avgVol) add('BUY','BOLLINGER','Upper band breakout with volume spike','strong')
        }
        break
      }
      case 'bbBreakdown': {
        if (bb.lower[i] != null) {
          const lower = bb.lower[i] as number
          const avgVol = average(volumes.slice(-20))
          if (price < lower && volumes[i] > 1.5 * avgVol) add('SELL','BOLLINGER','Lower band breakdown with volume spike','strong')
        }
        break
      }
      case 'atrSpike': {
        const curr = atr14[i]
        if (curr != null && atrAvg20 > 0 && curr > 1.5 * atrAvg20) add('BUY','ATR',`ATR spike (${curr.toFixed(2)} > 1.5×avg)`,`moderate`)
        break
      }
      case 'trendReversal': {
        const condRSI = rsi14[prev] != null && (rsi14[prev] as number) < 30 && rsi14[i] != null && (rsi14[i] as number) >= 30
        let condEMA = false
        for (let k = 1; k <= 3 && i - k >= 1; k++) {
          if (ema20[i - k] != null) {
            const pc = closes[i - k - 1]
            const cc = closes[i - k]
            const pe = ema20[i - k - 1] as number | null
            const ce = ema20[i - k] as number | null
            if (pe != null && ce != null && pc < pe && cc > ce) { condEMA = true; break }
          }
        }
        if (condRSI && condEMA) add('BUY','EMA','Trend reversal (RSI up + EMA20 cross)','strong')
        break
      }
    }
  }

  // Also include generated signals that align with selected filters
  const gen = generateSignals(bars)
  const indicatorsNeeded = new Set<TradeSignal['indicator']>([
    ...(filters.includes('rsiOversold') || filters.includes('rsiOverbought') ? ['RSI'] : []),
    ...(filters.includes('emaBullish') || filters.includes('emaBearish') || filters.includes('trendReversal') ? ['EMA'] : []),
    ...(filters.includes('macdBullish') || filters.includes('macdBearish') ? ['MACD'] : []),
    ...(filters.includes('bbBreakoutUp') || filters.includes('bbBreakdown') ? ['BOLLINGER'] : []),
    ...(filters.includes('atrSpike') ? ['ATR'] : []),
  ] as unknown as TradeSignal['indicator'][])
  gen.forEach(s => { if (indicatorsNeeded.has(s.indicator)) matched.push(s) })

  return { matched, price }
}

export function confidenceScore(signals: TradeSignal[]): number {
  if (signals.length === 0) return 0
  const map = { weak: 0.6, moderate: 0.8, strong: 1.0 }
  const avg = signals.reduce((acc, s) => acc + map[s.strength], 0) / signals.length
  return Math.round(avg * 100) / 100
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}


