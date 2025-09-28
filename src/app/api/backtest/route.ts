import { NextRequest, NextResponse } from 'next/server'
import { NSEAPIManager } from '@/lib/nse-api-providers'
import { rsi, ema, macd } from '@/lib/indicators'
import type { DailyBar } from '@/lib/api'

const api = new NSEAPIManager()

export type BacktestStrategy = 'pivot-reversal' | 'ema-crossover' | 'rsi-bounce'

export interface BacktestRequest {
  symbol: string
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
  strategy: BacktestStrategy
  riskPerTrade?: number // percentage (e.g., 1 for 1%)
}

export interface BacktestTrade {
  date: string
  entry: number
  stopLoss: number
  target: number
  exit: number
  pnl: number
  rr: number
  holdingDays: number
  outcome: 'WIN' | 'LOSS'
  reason: string
}

export interface BacktestMetrics {
  winRate: number
  avgReturn: number
  profitFactor: number
  maxDrawdown: number
  totalTrades: number
  equityCurve: Array<{ date: string; equity: number }>
}

export interface BacktestResponse {
  success: boolean
  metrics: BacktestMetrics
  trades: BacktestTrade[]
  symbol: string
  strategy: BacktestStrategy
  period: { from: string; to: string }
}

// Calculate weekly pivot points
function calculateWeeklyPivots(bars: DailyBar[], currentIndex: number) {
  // Look back 5 days (1 week) from current index
  const startIdx = Math.max(0, currentIndex - 4)
  const weekBars = bars.slice(startIdx, currentIndex + 1)
  
  if (weekBars.length === 0) return null
  
  const high = Math.max(...weekBars.map(b => b.high))
  const low = Math.min(...weekBars.map(b => b.low))
  const close = weekBars[weekBars.length - 1].close
  
  const PP = (high + low + close) / 3
  const S1 = (2 * PP) - high
  const S2 = PP - (high - low)
  const R1 = (2 * PP) - low
  const R2 = PP + (high - low)
  
  return { PP, S1, S2, R1, R2 }
}

// Check if price is near support level
function isNearSupport(price: number, s1: number, s2: number, tolerance: number = 0.01) {
  const s1Distance = Math.abs((price - s1) / price)
  const s2Distance = Math.abs((price - s2) / price)
  return s1Distance <= tolerance || s2Distance <= tolerance
}

// Check for bullish candle
function isBullishCandle(bar: DailyBar): boolean {
  return bar.close > bar.open
}

// Identify entry signals based on strategy
function identifyEntrySignal(
  bars: DailyBar[],
  index: number,
  strategy: BacktestStrategy,
  rsiValues: (number | null)[],
  ema20Values: (number | null)[],
  ema50Values: (number | null)[],
  macdData: { macdLine: (number | null)[], signalLine: (number | null)[] }
): boolean {
  if (index < 20) return false // Need enough data for indicators
  
  const currentBar = bars[index]
  const currentRSI = rsiValues[index]
  const currentEMA20 = ema20Values[index]
  const currentEMA50 = ema50Values[index]
  const currentMACD = macdData.macdLine[index]
  const currentSignal = macdData.signalLine[index]
  
  const pivots = calculateWeeklyPivots(bars, index)
  if (!pivots) return false
  
  switch (strategy) {
    case 'pivot-reversal':
      return (
        isNearSupport(currentBar.close, pivots.S1, pivots.S2, 0.01) &&
        currentRSI !== null && currentRSI < 35 &&
        isBullishCandle(currentBar)
      )
    
    case 'ema-crossover':
      return (
        currentEMA20 !== null && currentEMA50 !== null &&
        currentBar.close > currentEMA20 &&
        currentEMA20 > currentEMA50 &&
        currentMACD !== null && currentSignal !== null &&
        currentMACD > currentSignal
      )
    
    case 'rsi-bounce':
      return (
        currentRSI !== null && currentRSI < 30 &&
        rsiValues[index - 1] !== null && rsiValues[index - 1]! < currentRSI && // RSI turning up
        currentEMA20 !== null && currentBar.close > currentEMA20
      )
    
    default:
      return false
  }
}

// Simulate a single trade
function simulateTrade(
  bars: DailyBar[],
  entryIndex: number,
  strategy: BacktestStrategy
): BacktestTrade | null {
  if (entryIndex >= bars.length - 1) return null
  
  const entryBar = bars[entryIndex]
  const entryPrice = bars[entryIndex + 1].open // Enter at next day's open
  const entryDate = bars[entryIndex + 1].time
  
  // Calculate stop loss (low of signal candle minus buffer)
  const stopLoss = entryBar.low * 0.995 // 0.5% buffer below low
  
  // Calculate targets based on weekly pivots
  const pivots = calculateWeeklyPivots(bars, entryIndex)
  if (!pivots) return null
  
  const target1 = pivots.PP
  const target2 = pivots.R1
  const primaryTarget = strategy === 'pivot-reversal' ? target1 : target2
  
  // Simulate trade execution from entry + 1 onwards
  let exitPrice = entryPrice
  let holdingDays = 0
  let outcome: 'WIN' | 'LOSS' = 'LOSS'
  let reason = 'Stop Loss Hit'
  
  for (let i = entryIndex + 1; i < Math.min(bars.length, entryIndex + 21); i++) { // Max 21 days holding
    const bar = bars[i]
    holdingDays = i - entryIndex
    
    // Check stop loss first
    if (bar.low <= stopLoss) {
      exitPrice = stopLoss
      outcome = 'LOSS'
      reason = 'Stop Loss Hit'
      break
    }
    
    // Check target
    if (bar.high >= primaryTarget) {
      exitPrice = primaryTarget
      outcome = 'WIN'
      reason = 'Target Reached'
      break
    }
    
    // If last day of max holding period, exit at close
    if (i === Math.min(bars.length - 1, entryIndex + 20)) {
      exitPrice = bar.close
      outcome = exitPrice > entryPrice ? 'WIN' : 'LOSS'
      reason = 'Max Holding Period'
      break
    }
  }
  
  const pnl = ((exitPrice - entryPrice) / entryPrice) * 100
  const rr = Math.abs((primaryTarget - entryPrice) / (entryPrice - stopLoss))
  
  return {
    date: typeof entryDate === 'string' ? entryDate : entryDate.toISOString().split('T')[0],
    entry: entryPrice,
    stopLoss,
    target: primaryTarget,
    exit: exitPrice,
    pnl,
    rr,
    holdingDays,
    outcome,
    reason
  }
}

// Calculate backtest metrics
function calculateMetrics(trades: BacktestTrade[], initialEquity: number = 100000): BacktestMetrics {
  if (trades.length === 0) {
    return {
      winRate: 0,
      avgReturn: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      totalTrades: 0,
      equityCurve: []
    }
  }
  
  const winningTrades = trades.filter(t => t.outcome === 'WIN')
  const losingTrades = trades.filter(t => t.outcome === 'LOSS')
  
  const winRate = (winningTrades.length / trades.length) * 100
  const avgReturn = trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0)
  const grossLoss = losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0)
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0
  
  // Calculate equity curve and max drawdown
  let equity = initialEquity
  let peak = initialEquity
  let maxDrawdown = 0
  const equityCurve: Array<{ date: string; equity: number }> = []
  
  for (const trade of trades) {
    equity = equity * (1 + trade.pnl / 100)
    equityCurve.push({ date: trade.date, equity })
    
    if (equity > peak) {
      peak = equity
    } else {
      const drawdown = ((peak - equity) / peak) * 100
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
  }
  
  return {
    winRate,
    avgReturn,
    profitFactor,
    maxDrawdown,
    totalTrades: trades.length,
    equityCurve
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: BacktestRequest = await req.json()
    const { symbol, from, to, strategy } = body
    
    // Validate inputs
    if (!symbol || !from || !to || !strategy) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }
    
    // Calculate number of days for data fetch
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysToFetch = Math.min(Math.max(daysDiff + 30, 100), 500) // Add buffer, cap at 500
    
    // Fetch historical data
    const bars = await api.getDailyOHLC(symbol, daysToFetch)
    if (bars.length < 50) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient historical data' 
      }, { status: 400 })
    }
    
    // Filter bars to date range
    const filteredBars = bars.filter(bar => {
      const barDate = typeof bar.time === 'string' ? new Date(bar.time) : bar.time
      return barDate >= fromDate && barDate <= toDate
    })
    
    if (filteredBars.length < 20) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient data in date range' 
      }, { status: 400 })
    }
    
    // Calculate indicators
    const closes = bars.map(b => b.close)
    const rsiValues = rsi(closes, 14)
    const ema20Values = ema(closes, 20)
    const ema50Values = ema(closes, 50)
    const macdData = macd(closes, 12, 26, 9)
    
    // Find entry signals and simulate trades
    const trades: BacktestTrade[] = []
    let lastTradeIndex = -10 // Prevent overlapping trades
    
    for (let i = 0; i < bars.length - 1; i++) {
      // Skip if too close to last trade
      if (i - lastTradeIndex < 5) continue
      
      // Check if current bar is in our date range
      const barDate = typeof bars[i].time === 'string' ? new Date(bars[i].time) : bars[i].time
      if (barDate < fromDate || barDate > toDate) continue
      
      if (identifyEntrySignal(bars, i, strategy, rsiValues, ema20Values, ema50Values, macdData)) {
        const trade = simulateTrade(bars, i, strategy)
        if (trade) {
          trades.push(trade)
          lastTradeIndex = i
        }
      }
    }
    
    // Calculate metrics
    const metrics = calculateMetrics(trades)
    
    return NextResponse.json({
      success: true,
      metrics,
      trades,
      symbol,
      strategy,
      period: { from, to }
    })
    
  } catch (error) {
    console.error('Backtest API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to run backtest' 
    }, { status: 500 })
  }
}
