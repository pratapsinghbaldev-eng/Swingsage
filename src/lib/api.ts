import axios from 'axios'
import { NSEAPIManager } from './nse-api-providers'

// Types for stock data
export interface Stock {
  symbol: string
  name: string
  ltp: number // Last Traded Price
  change: number
  changePercent: number
  exchange: 'NSE' | 'BSE'
  marketCap?: number
  volume?: number
}

export interface IndexData {
  name: string
  value: number
  change: number
  changePercent: number
}

export interface ChartDataPoint {
  time: string | Date
  price: number
  volume?: number
}

export interface StockFundamentals {
  symbol: string
  marketCap: number // in crores
  peRatio: number | null
  eps: number | null
  week52High: number
  week52Low: number
  volume: number
  avgVolume: number | null
  sector: string
  industry?: string
  dividendYield?: number | null
  bookValue?: number | null
  pbRatio?: number | null
}

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y'

// API Client configuration
const apiClient = axios.create({
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for logging
apiClient.interceptors.request.use((config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Real data manager (server-side only)
const isServer = typeof window === 'undefined'
const nseAPI = isServer ? new NSEAPIManager() : (null as unknown as NSEAPIManager)

// Mock data for development
const MOCK_STOCKS: Stock[] = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    ltp: 2456.75,
    change: 15.25,
    changePercent: 0.63,
    exchange: 'NSE',
    marketCap: 1658000,
    volume: 45000000
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    ltp: 3542.80,
    change: -22.40,
    changePercent: -0.63,
    exchange: 'NSE',
    marketCap: 1289000,
    volume: 12000000
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    ltp: 1678.90,
    change: 8.15,
    changePercent: 0.49,
    exchange: 'NSE',
    marketCap: 928000,
    volume: 18000000
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    ltp: 1456.25,
    change: -12.85,
    changePercent: -0.87,
    exchange: 'NSE',
    marketCap: 602000,
    volume: 8500000
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    ltp: 987.40,
    change: 5.60,
    changePercent: 0.57,
    exchange: 'NSE',
    marketCap: 692000,
    volume: 22000000
  },
  {
    symbol: 'HINDUNILVR',
    name: 'Hindustan Unilever Ltd',
    ltp: 2345.60,
    change: -8.90,
    changePercent: -0.38,
    exchange: 'NSE',
    marketCap: 549000,
    volume: 3200000
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd',
    ltp: 856.75,
    change: 12.30,
    changePercent: 1.46,
    exchange: 'NSE',
    marketCap: 485000,
    volume: 15600000
  },
  {
    symbol: 'ITC',
    name: 'ITC Ltd',
    ltp: 423.85,
    change: 2.15,
    changePercent: 0.51,
    exchange: 'NSE',
    marketCap: 527000,
    volume: 28000000
  }
]

const MOCK_INDICES: IndexData[] = [
  {
    name: 'Nifty 50',
    value: 19845.65,
    change: 125.40,
    changePercent: 0.64
  },
  {
    name: 'Nifty Bank',
    value: 43892.30,
    change: -234.55,
    changePercent: -0.53
  },
  {
    name: 'Nifty Midcap',
    value: 8756.25,
    change: 89.15,
    changePercent: 1.03
  },
  {
    name: 'Nifty Smallcap',
    value: 4234.80,
    change: 45.20,
    changePercent: 1.08
  }
]

// Search stocks function
export async function searchStocks(query: string): Promise<Stock[]> {
  if (!query || query.length < 2) {
    return []
  }

  // Use mock data if enabled
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Filter mock data based on query
    const filteredStocks = MOCK_STOCKS.filter(stock => 
      stock.name.toLowerCase().includes(query.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(query.toLowerCase())
    )
    
    // Add some randomization to simulate live data
    return filteredStocks.map(stock => ({
      ...stock,
      ltp: stock.ltp + (Math.random() - 0.5) * 10,
      change: stock.change + (Math.random() - 0.5) * 5,
      changePercent: stock.changePercent + (Math.random() - 0.5) * 0.5
    }))
  }

  // Real data
  try {
    if (isServer) {
      const results = await nseAPI.searchStocks(query)
      return results
    }
    const response = await apiClient.get(`/api/search`, { params: { q: query } })
    return response.data.stocks || []
  } catch (error) {
    console.error('Stock search failed:', error)
    return MOCK_STOCKS.filter(stock => 
      stock.name.toLowerCase().includes(query.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)
  }
}

// Get market indices
export async function getMarketIndices(): Promise<IndexData[]> {
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Add some randomization to simulate live data
    return MOCK_INDICES.map(index => ({
      ...index,
      value: index.value + (Math.random() - 0.5) * 50,
      change: index.change + (Math.random() - 0.5) * 20,
      changePercent: index.changePercent + (Math.random() - 0.5) * 0.3
    }))
  }

  try {
    if (isServer) {
      const indices = await nseAPI.getMarketIndices()
      return indices.length ? indices : MOCK_INDICES
    }
    const response = await apiClient.get('/api/indices')
    return response.data.indices || MOCK_INDICES
  } catch (error) {
    console.error('Indices fetch failed:', error)
    return MOCK_INDICES
  }
}

// Get stock details
export async function getStockDetails(symbol: string): Promise<Stock | null> {
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol)
    if (stock) {
      return {
        ...stock,
        ltp: stock.ltp + (Math.random() - 0.5) * 10,
        change: stock.change + (Math.random() - 0.5) * 5,
        changePercent: stock.changePercent + (Math.random() - 0.5) * 0.5
      }
    }
  }

  try {
    if (isServer) {
      const live = await nseAPI.getStockDetails(symbol)
      return live
    }
    const response = await apiClient.get(`/api/stocks/${symbol}`)
    return response.data.stock || null
  } catch (error) {
    console.error('Stock details fetch failed:', error)
    return null
  }
}

// Mock fundamentals data
const MOCK_FUNDAMENTALS: Record<string, StockFundamentals> = {
  RELIANCE: {
    symbol: 'RELIANCE',
    marketCap: 1658000,
    peRatio: 28.5,
    eps: 86.2,
    week52High: 2856.15,
    week52Low: 2220.30,
    volume: 45000000,
    avgVolume: 38000000,
    sector: 'Oil & Gas',
    industry: 'Petroleum Refining',
    dividendYield: 0.35,
    bookValue: 1245.80,
    pbRatio: 1.97
  },
  TCS: {
    symbol: 'TCS',
    marketCap: 1289000,
    peRatio: 25.8,
    eps: 137.4,
    week52High: 4078.90,
    week52Low: 3311.20,
    volume: 12000000,
    avgVolume: 15000000,
    sector: 'Information Technology',
    industry: 'IT Services',
    dividendYield: 3.2,
    bookValue: 895.60,
    pbRatio: 3.96
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    marketCap: 928000,
    peRatio: 18.2,
    eps: 92.3,
    week52High: 1794.95,
    week52Low: 1363.55,
    volume: 18000000,
    avgVolume: 22000000,
    sector: 'Financial Services',
    industry: 'Private Sector Bank',
    dividendYield: 1.2,
    bookValue: 456.70,
    pbRatio: 3.68
  },
  INFY: {
    symbol: 'INFY',
    marketCap: 602000,
    peRatio: 22.1,
    eps: 65.8,
    week52High: 1729.55,
    week52Low: 1351.65,
    volume: 8500000,
    avgVolume: 11000000,
    sector: 'Information Technology',
    industry: 'IT Services',
    dividendYield: 2.8,
    bookValue: 312.45,
    pbRatio: 4.66
  }
}

// Generate mock intraday data
function generateMockIntradayData(symbol: string, timeframe: Timeframe): ChartDataPoint[] {
  const now = new Date()
  const basePrice = MOCK_STOCKS.find(s => s.symbol === symbol)?.ltp || 1000
  const points: ChartDataPoint[] = []
  
  let dataPoints = 0
  let intervalMinutes = 5
  
  switch (timeframe) {
    case '1D':
      dataPoints = 78 // 6.5 hours * 12 (5-minute intervals)
      intervalMinutes = 5
      break
    case '1W':
      dataPoints = 35 // 5 trading days * 7 points per day
      intervalMinutes = 60
      break
    case '1M':
      dataPoints = 22 // ~22 trading days
      intervalMinutes = 1440 // 1 day
      break
    case '3M':
      dataPoints = 65 // ~65 trading days
      intervalMinutes = 1440
      break
    case '1Y':
      dataPoints = 52 // 52 weeks
      intervalMinutes = 10080 // 1 week
      break
  }
  
  let currentPrice = basePrice
  const volatility = 0.02 // 2% volatility
  
  for (let i = dataPoints - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - (i * intervalMinutes * 60 * 1000))
    
    // Add some realistic price movement
    const change = (Math.random() - 0.5) * currentPrice * volatility
    currentPrice = Math.max(currentPrice + change, basePrice * 0.8) // Don't go below 20% of base price
    
    points.push({
      time: time.toISOString(),
      price: Math.round(currentPrice * 100) / 100,
      volume: Math.floor(Math.random() * 1000000) + 500000
    })
  }
  
  return points
}

// Get stock intraday/historical data
export async function getStockIntraday(symbol: string, timeframe: Timeframe): Promise<ChartDataPoint[]> {
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600))
    
    return generateMockIntradayData(symbol, timeframe)
  }

  try {
    if (isServer) {
      const data = await nseAPI.getStockIntraday(symbol, timeframe)
      return data
    }
    const response = await apiClient.get(`/api/stocks/${symbol}/chart`, { params: { timeframe } })
    return response.data.data || []
  } catch (error) {
    console.error('Stock intraday data fetch failed:', error)
    return generateMockIntradayData(symbol, timeframe)
  }
}

// Get stock fundamentals
export async function getStockFundamentals(symbol: string): Promise<StockFundamentals | null> {
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    
    const fundamentals = MOCK_FUNDAMENTALS[symbol]
    if (fundamentals) {
      // Add some slight randomization to volume
      return {
        ...fundamentals,
        volume: Math.floor(fundamentals.volume * (0.8 + Math.random() * 0.4))
      }
    }
    
    // Generate basic fundamentals for stocks not in mock data
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol)
    if (stock) {
      return {
        symbol: stock.symbol,
        marketCap: stock.marketCap || 50000,
        peRatio: 15 + Math.random() * 20,
        eps: null,
        week52High: stock.ltp * (1.2 + Math.random() * 0.3),
        week52Low: stock.ltp * (0.7 - Math.random() * 0.2),
        volume: stock.volume || 1000000,
        avgVolume: null,
        sector: 'General',
        industry: 'Various',
        dividendYield: Math.random() * 3,
        bookValue: null,
        pbRatio: null
      }
    }
    
    return null
  }

  try {
    if (isServer) {
      // Build minimal fundamentals from available live details
      const live = await nseAPI.getStockDetails(symbol)
      if (!live) return null
      return {
        symbol: live.symbol,
        marketCap: live.marketCap || 0,
        peRatio: null,
        eps: null,
        week52High: live.ltp, // Placeholder without a separate endpoint
        week52Low: live.ltp,  // Placeholder
        volume: live.volume || 0,
        avgVolume: null,
        sector: 'N/A',
        industry: undefined,
        dividendYield: null,
        bookValue: null,
        pbRatio: null,
      }
    }
    const response = await apiClient.get(`/api/stocks/${symbol}/fundamentals`)
    return response.data.fundamentals || null
  } catch (error) {
    console.error('Stock fundamentals fetch failed:', error)
    return null
  }
}

// Error types
export class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'APIError'
  }
}
