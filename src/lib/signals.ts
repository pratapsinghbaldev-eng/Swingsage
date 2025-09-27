import { atr, bollinger, ema, macd, rsi, sma } from './indicators'
import type { DailyBar } from './api'

export type SignalType = 'BUY' | 'SELL'
export type SignalIndicator = 'RSI' | 'EMA' | 'MACD' | 'BOLLINGER' | 'ATR'

export interface TradeSignal {
  type: SignalType
  indicator: SignalIndicator
  strength: 'weak' | 'moderate' | 'strong'
  reason: string
  timestamp: string
}

export function generateSignals(bars: DailyBar[]): TradeSignal[] {
  if (!bars || bars.length < 30) return []

  const closes = bars.map(b => b.close)
  const highs = bars.map(b => b.high)
  const lows = bars.map(b => b.low)
  const volumes = bars.map(b => b.volume || 0)

  const rsi14 = rsi(closes, 14)
  const ema20 = ema(closes, 20)
  const ema50 = ema(closes, 50)
  const sma20 = sma(closes, 20)
  const sma50 = sma(closes, 50)
  const sma200 = sma(closes, 200)
  const macdData = macd(closes, 12, 26, 9)
  const bb = bollinger(closes, 20, 2)
  const atr14 = atr(highs, lows, closes, 14)

  const i = bars.length - 1
  const prev = i - 1
  const signals: TradeSignal[] = []
  const ts = typeof bars[i].time === 'string' ? (bars[i].time as string) : (bars[i].time as Date).toISOString()

  // 1) RSI crossing 30/70
  if (rsi14[prev] != null && rsi14[i] != null) {
    const p = rsi14[prev] as number
    const c = rsi14[i] as number
    if (p < 30 && c >= 30) {
      signals.push({ type: 'BUY', indicator: 'RSI', strength: c < 40 ? 'moderate' : 'weak', reason: `RSI crossed up 30 (${p.toFixed(1)}→${c.toFixed(1)})`, timestamp: ts })
    } else if (p > 70 && c <= 70) {
      signals.push({ type: 'SELL', indicator: 'RSI', strength: c > 60 ? 'moderate' : 'weak', reason: `RSI crossed down 70 (${p.toFixed(1)}→${c.toFixed(1)})`, timestamp: ts })
    }
  }

  // 2) EMA crossover with price (price crossing EMA20/EMA50)
  const close = closes[i]
  if (ema20[prev] != null && ema20[i] != null) {
    const pema = ema20[prev] as number
    const cema = ema20[i] as number
    const prevClose = closes[prev]
    if (prevClose < pema && close > cema) {
      signals.push({ type: 'BUY', indicator: 'EMA', strength: 'moderate', reason: 'Price crossed above EMA20', timestamp: ts })
    } else if (prevClose > pema && close < cema) {
      signals.push({ type: 'SELL', indicator: 'EMA', strength: 'moderate', reason: 'Price crossed below EMA20', timestamp: ts })
    }
  }
  if (ema50[prev] != null && ema50[i] != null) {
    const pema = ema50[prev] as number
    const cema = ema50[i] as number
    const prevClose = closes[prev]
    if (prevClose < pema && close > cema) {
      signals.push({ type: 'BUY', indicator: 'EMA', strength: 'strong', reason: 'Price crossed above EMA50', timestamp: ts })
    } else if (prevClose > pema && close < cema) {
      signals.push({ type: 'SELL', indicator: 'EMA', strength: 'strong', reason: 'Price crossed below EMA50', timestamp: ts })
    }
  }

  // 3) MACD crossover (macdLine crossing signalLine)
  if (macdData.macdLine[prev] != null && macdData.signalLine[prev] != null && macdData.macdLine[i] != null && macdData.signalLine[i] != null) {
    const pm = macdData.macdLine[prev] as number
    const ps = macdData.signalLine[prev] as number
    const cm = macdData.macdLine[i] as number
    const cs = macdData.signalLine[i] as number
    if (pm <= ps && cm > cs) {
      signals.push({ type: 'BUY', indicator: 'MACD', strength: 'moderate', reason: 'MACD crossed above Signal', timestamp: ts })
    } else if (pm >= ps && cm < cs) {
      signals.push({ type: 'SELL', indicator: 'MACD', strength: 'moderate', reason: 'MACD crossed below Signal', timestamp: ts })
    }
  }

  // 4) Bollinger Band breakout with volume spike
  if (bb.upper[i] != null && bb.lower[i] != null && sma20[i] != null) {
    const upper = bb.upper[i] as number
    const lower = bb.lower[i] as number
    const avgVol = average(volumes.slice(-20))
    const vol = volumes[i]
    if (close > upper && vol > 1.5 * avgVol) {
      signals.push({ type: 'BUY', indicator: 'BOLLINGER', strength: 'strong', reason: 'Upper band breakout with volume spike', timestamp: ts })
    } else if (close < lower && vol > 1.5 * avgVol) {
      signals.push({ type: 'SELL', indicator: 'BOLLINGER', strength: 'strong', reason: 'Lower band breakdown with volume spike', timestamp: ts })
    }
  }

  // Strength adjustments based on trend context (SMA50 vs SMA200) and volatility (ATR)
  if (sma50[i] != null && sma200[i] != null) {
    const trendUp = (sma50[i] as number) > (sma200[i] as number)
    signals.forEach(s => {
      if (s.type === 'BUY' && trendUp && s.strength !== 'strong') s.strength = 'moderate'
      if (s.type === 'SELL' && !trendUp && s.strength !== 'strong') s.strength = 'moderate'
    })
  }

  // Volatility filter: mark as strong if move is > 1 ATR
  if (atr14[i] != null) {
    const currentAtr = atr14[i] as number
    signals.forEach(s => {
      const move = Math.abs(close - closes[prev])
      if (move > currentAtr && s.strength !== 'strong') s.strength = 'strong'
    })
  }

  return signals
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}


