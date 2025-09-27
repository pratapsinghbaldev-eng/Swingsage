/**
 * Technical Indicators Library
 * Implements RSI, SMA, EMA and other common stock market indicators
 */

export interface IndicatorValue {
  value: number | null
  timestamp?: string | Date
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param values Array of numbers to calculate SMA for
 * @param period Number of periods to average over
 * @returns Array of SMA values (null for insufficient data points)
 */
export function sma(values: number[], period: number = 20): (number | null)[] {
  if (period <= 0 || period > values.length) {
    return values.map(() => null)
  }

  const result: (number | null)[] = []
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
  }
  
  return result
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param values Array of numbers to calculate EMA for
 * @param period Number of periods for EMA calculation
 * @returns Array of EMA values (null for insufficient data points)
 */
export function ema(values: number[], period: number = 50): (number | null)[] {
  if (period <= 0 || values.length === 0) {
    return values.map(() => null)
  }

  const result: (number | null)[] = []
  const multiplier = 2 / (period + 1)
  
  // First EMA value is the SMA of the first 'period' values
  let emaValue: number | null = null
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else if (i === period - 1) {
      // First EMA is SMA
      const sum = values.slice(0, period).reduce((a, b) => a + b, 0)
      emaValue = sum / period
      result.push(emaValue)
    } else {
      // Subsequent EMAs
      if (emaValue !== null) {
        emaValue = (values[i] * multiplier) + (emaValue * (1 - multiplier))
        result.push(emaValue)
      } else {
        result.push(null)
      }
    }
  }
  
  return result
}

/**
 * MACD (12,26,9)
 */
export function macd(values: number[], fast: number = 12, slow: number = 26, signalPeriod: number = 9) {
  const emaFast = ema(values, fast)
  const emaSlow = ema(values, slow)
  const macdLine: (number | null)[] = values.map((_, i) => {
    if (emaFast[i] == null || emaSlow[i] == null) return null
    return (emaFast[i] as number) - (emaSlow[i] as number)
  })
  const signalLine = ema(macdLine.map(v => v == null ? 0 : v), signalPeriod)
  const histogram = macdLine.map((v, i) => (v == null || signalLine[i] == null) ? null : v - (signalLine[i] as number))
  return { macdLine, signalLine, histogram }
}

/**
 * Bollinger Bands (SMA +/- k*std)
 */
export function bollinger(values: number[], period: number = 20, k: number = 2) {
  const mid = sma(values, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      upper.push(null)
      lower.push(null)
      continue
    }
    const window = values.slice(i - period + 1, i + 1)
    const mean = mid[i] as number
    const variance = window.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / period
    const std = Math.sqrt(variance)
    upper.push(mean + k * std)
    lower.push(mean - k * std)
  }
  return { upper, mid, lower }
}

/**
 * Average True Range (ATR)
 */
export function atr(highs: number[], lows: number[], closes: number[], period: number = 14): (number | null)[] {
  const trs: number[] = []
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      trs.push(highs[i] - lows[i])
    } else {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
      trs.push(tr)
    }
  }
  // Use EMA of TR for ATR
  return ema(trs, period)
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param values Array of price values
 * @param period Number of periods for RSI calculation (default 14)
 * @returns Array of RSI values (0-100, null for insufficient data points)
 */
export function rsi(values: number[], period: number = 14): (number | null)[] {
  if (period <= 0 || values.length < period + 1) {
    return values.map(() => null)
  }

  const result: (number | null)[] = [null] // First value is always null
  const gains: number[] = []
  const losses: number[] = []
  
  // Calculate price changes
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  // Calculate RSI values
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      // Calculate average gain and loss over the period
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      
      if (avgLoss === 0) {
        result.push(100) // RSI = 100 when there are no losses
      } else {
        const rs = avgGain / avgLoss
        const rsiValue = 100 - (100 / (1 + rs))
        result.push(Math.round(rsiValue * 100) / 100) // Round to 2 decimal places
      }
    }
  }
  
  return result
}

/**
 * Generate Moving Average Crossover Signal
 * @param shortMA Short-term moving average values
 * @param longMA Long-term moving average values
 * @returns Signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
 */
export function maCrossoverSignal(
  shortMA: (number | null)[], 
  longMA: (number | null)[]
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (shortMA.length < 2 || longMA.length < 2) {
    return 'NEUTRAL'
  }
  
  const currentShort = shortMA[shortMA.length - 1]
  const currentLong = longMA[longMA.length - 1]
  const prevShort = shortMA[shortMA.length - 2]
  const prevLong = longMA[longMA.length - 2]
  
  if (currentShort === null || currentLong === null || prevShort === null || prevLong === null) {
    return 'NEUTRAL'
  }
  
  // Bullish crossover: short MA crosses above long MA
  if (prevShort <= prevLong && currentShort > currentLong) {
    return 'BULLISH'
  }
  
  // Bearish crossover: short MA crosses below long MA
  if (prevShort >= prevLong && currentShort < currentLong) {
    return 'BEARISH'
  }
  
  // Current position without crossover
  if (currentShort > currentLong) {
    return 'BULLISH'
  } else if (currentShort < currentLong) {
    return 'BEARISH'
  }
  
  return 'NEUTRAL'
}

/**
 * Calculate multiple indicators for a stock
 * @param prices Array of price values
 * @returns Object containing all calculated indicators
 */
export function calculateIndicators(prices: number[]) {
  const sma20 = sma(prices, 20)
  const ema50 = ema(prices, 50)
  const rsi14 = rsi(prices, 14)
  const crossoverSignal = maCrossoverSignal(sma20, ema50)
  
  return {
    sma20,
    ema50,
    rsi14,
    crossoverSignal,
    currentValues: {
      sma20: sma20[sma20.length - 1],
      ema50: ema50[ema50.length - 1],
      rsi14: rsi14[rsi14.length - 1],
      crossoverSignal
    }
  }
}

/**
 * Utility function to format indicator value for display
 * @param value Indicator value (can be null)
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
export function formatIndicatorValue(value: number | null, decimals: number = 2): string {
  if (value === null || isNaN(value)) {
    return 'N/A'
  }
  return value.toFixed(decimals)
}

/**
 * Get RSI interpretation
 * @param rsiValue RSI value (0-100)
 * @returns Interpretation string
 */
export function getRSIInterpretation(rsiValue: number | null): string {
  if (rsiValue === null) return 'N/A'
  
  if (rsiValue >= 70) return 'Overbought'
  if (rsiValue <= 30) return 'Oversold'
  if (rsiValue >= 50) return 'Bullish'
  return 'Bearish'
}

/**
 * Get signal color for UI display
 * @param signal Signal type
 * @returns Tailwind CSS color class
 */
export function getSignalColor(signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'): string {
  switch (signal) {
    case 'BULLISH':
      return 'text-green-600'
    case 'BEARISH':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}
