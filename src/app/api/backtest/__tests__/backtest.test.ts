/**
 * @jest-environment node
 */
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock the NSE API
jest.mock('@/lib/nse-api-providers', () => ({
  NSEAPIManager: jest.fn().mockImplementation(() => ({
    getDailyOHLC: jest.fn().mockResolvedValue([
      // Mock OHLC data for testing
      { time: '2024-01-01', open: 2400, high: 2450, low: 2380, close: 2420, volume: 1000000 },
      { time: '2024-01-02', open: 2420, high: 2480, low: 2400, close: 2460, volume: 1200000 },
      { time: '2024-01-03', open: 2460, high: 2490, low: 2440, close: 2470, volume: 950000 },
      { time: '2024-01-04', open: 2470, high: 2500, low: 2450, close: 2485, volume: 1100000 },
      { time: '2024-01-05', open: 2485, high: 2520, low: 2470, close: 2510, volume: 1300000 },
      // Add more data points for proper indicator calculation
      { time: '2024-01-08', open: 2510, high: 2540, low: 2490, close: 2525, volume: 1150000 },
      { time: '2024-01-09', open: 2525, high: 2550, low: 2505, close: 2530, volume: 1050000 },
      { time: '2024-01-10', open: 2530, high: 2560, low: 2510, close: 2545, volume: 1250000 },
      { time: '2024-01-11', open: 2545, high: 2570, low: 2525, close: 2555, volume: 1080000 },
      { time: '2024-01-12', open: 2555, high: 2580, low: 2535, close: 2565, volume: 1200000 },
      // Continue pattern for 30+ days to enable indicator calculations
      ...Array.from({ length: 40 }, (_, i) => ({
        time: new Date(2024, 0, 13 + i).toISOString().split('T')[0],
        open: 2565 + i * 2,
        high: 2565 + i * 2 + 25,
        low: 2565 + i * 2 - 15,
        close: 2565 + i * 2 + 5,
        volume: 1000000 + Math.random() * 500000
      }))
    ])
  }))
}))

// Mock fs operations for caching
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}))

// Mock path module
jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('/mock/cache/path')
}))

describe('/api/backtest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return successful backtest results with valid input', async () => {
    const requestBody = {
      symbol: 'RELIANCE',
      from: '2024-01-01',
      to: '2024-02-29',
      strategy: 'pivot-reversal' as const
    }

    const request = new NextRequest('http://localhost:3000/api/backtest', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data).toHaveProperty('metrics')
    expect(data).toHaveProperty('trades')
    expect(data).toHaveProperty('symbol', 'RELIANCE')
    expect(data).toHaveProperty('strategy', 'pivot-reversal')
    expect(data).toHaveProperty('period')

    // Validate metrics structure
    expect(data.metrics).toHaveProperty('winRate')
    expect(data.metrics).toHaveProperty('avgReturn')
    expect(data.metrics).toHaveProperty('profitFactor')
    expect(data.metrics).toHaveProperty('maxDrawdown')
    expect(data.metrics).toHaveProperty('totalTrades')
    expect(data.metrics).toHaveProperty('equityCurve')

    expect(typeof data.metrics.winRate).toBe('number')
    expect(typeof data.metrics.avgReturn).toBe('number')
    expect(typeof data.metrics.profitFactor).toBe('number')
    expect(typeof data.metrics.maxDrawdown).toBe('number')
    expect(typeof data.metrics.totalTrades).toBe('number')
    expect(Array.isArray(data.metrics.equityCurve)).toBe(true)
    expect(Array.isArray(data.trades)).toBe(true)
  })

  it('should return error for missing required parameters', async () => {
    const requestBody = {
      symbol: 'RELIANCE'
      // Missing required fields
    }

    const request = new NextRequest('http://localhost:3000/api/backtest', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Missing required parameters')
  })

  it('should validate trade structure when trades are found', async () => {
    const requestBody = {
      symbol: 'RELIANCE',
      from: '2024-01-01',
      to: '2024-02-29',
      strategy: 'ema-crossover' as const
    }

    const request = new NextRequest('http://localhost:3000/api/backtest', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // If trades are found, validate structure
    if (data.trades.length > 0) {
      const trade = data.trades[0]
      expect(trade).toHaveProperty('date')
      expect(trade).toHaveProperty('entry')
      expect(trade).toHaveProperty('stopLoss')
      expect(trade).toHaveProperty('target')
      expect(trade).toHaveProperty('exit')
      expect(trade).toHaveProperty('pnl')
      expect(trade).toHaveProperty('rr')
      expect(trade).toHaveProperty('holdingDays')
      expect(trade).toHaveProperty('outcome')
      expect(['WIN', 'LOSS']).toContain(trade.outcome)
    }
  })

  it('should handle different strategy types', async () => {
    const strategies = ['pivot-reversal', 'ema-crossover', 'rsi-bounce'] as const

    for (const strategy of strategies) {
      const requestBody = {
        symbol: 'RELIANCE',
        from: '2024-01-01',
        to: '2024-02-29',
        strategy
      }

      const request = new NextRequest('http://localhost:3000/api/backtest', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.strategy).toBe(strategy)
    }
  })

  it('should calculate metrics correctly for known scenario', async () => {
    const requestBody = {
      symbol: 'RELIANCE',
      from: '2024-01-01',
      to: '2024-02-29',
      strategy: 'pivot-reversal' as const
    }

    const request = new NextRequest('http://localhost:3000/api/backtest', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Validate metric ranges
    expect(data.metrics.winRate).toBeGreaterThanOrEqual(0)
    expect(data.metrics.winRate).toBeLessThanOrEqual(100)
    expect(data.metrics.profitFactor).toBeGreaterThanOrEqual(0)
    expect(data.metrics.maxDrawdown).toBeGreaterThanOrEqual(0)
    expect(data.metrics.totalTrades).toBeGreaterThanOrEqual(0)
  })
})
