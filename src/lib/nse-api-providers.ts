import axios from 'axios'
import type { Stock, ChartDataPoint, StockFundamentals, IndexData, Timeframe } from './api'

function createAPIClient(baseURL: string, headers: Record<string, string> = {}) {
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      ...headers,
    },
  })
}

// Yahoo Finance (free, limited; works for many NSE symbols with .NS suffix)
export class YahooFinanceProvider {
  private client = createAPIClient(process.env.YAHOO_FINANCE_BASE_URL || 'https://query1.finance.yahoo.com')

  private toYahooSymbol(symbol: string) {
    if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return symbol
    return `${symbol}.NS`
  }

  async getStockDetails(symbol: string): Promise<Stock | null> {
    try {
      const ySymbol = this.toYahooSymbol(symbol)
      const resp = await this.client.get(`/v8/finance/chart/${encodeURIComponent(ySymbol)}`, {
        params: { range: '1d', interval: '1m' },
      })
      const result = resp.data?.chart?.result?.[0]
      if (!result) return null
      const meta = result.meta
      const quote = result.indicators?.quote?.[0]
      const lastIdx = quote?.close?.length ? quote.close.length - 1 : 0
      const close = quote?.close?.[lastIdx]
      const prevClose = meta?.previousClose
      if (close == null || prevClose == null) return null
      return {
        symbol,
        name: meta?.longName || meta?.symbol || symbol,
        exchange: 'NSE',
        ltp: Number(close),
        change: Number(close) - Number(prevClose),
        changePercent: ((Number(close) - Number(prevClose)) / Number(prevClose)) * 100,
        marketCap: meta?.marketCap ?? undefined,
        volume: quote?.volume?.[lastIdx] ?? undefined,
      }
    } catch (e) {
      return null
    }
  }

  async getStockIntraday(symbol: string, timeframe: Timeframe): Promise<ChartDataPoint[]> {
    try {
      const ySymbol = this.toYahooSymbol(symbol)
      const intervalMap: Record<Timeframe, string> = { '1D': '5m', '1W': '1h', '1M': '1d', '3M': '1d', '1Y': '1wk' }
      const rangeMap: Record<Timeframe, string> = { '1D': '1d', '1W': '5d', '1M': '1mo', '3M': '3mo', '1Y': '1y' }
      const resp = await this.client.get(`/v8/finance/chart/${encodeURIComponent(ySymbol)}`, {
        params: { interval: intervalMap[timeframe], range: rangeMap[timeframe] },
      })
      const result = resp.data?.chart?.result?.[0]
      if (!result) return []
      const timestamps: number[] = result.timestamp || []
      const quote = result.indicators?.quote?.[0]
      const closes: Array<number | null> = quote?.close || []
      const volumes: Array<number | null> = quote?.volume || []
      return timestamps
        .map((t, i) => ({
          time: new Date(t * 1000).toISOString(),
          price: closes[i] == null ? NaN : Number(closes[i]),
          volume: volumes[i] == null ? undefined : Number(volumes[i]),
        }))
        .filter((p) => Number.isFinite(p.price))
    } catch (e) {
      return []
    }
  }
}

// Alpha Vantage (free tier)
export class AlphaVantageProvider {
  private client = createAPIClient(process.env.ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co')
  private apiKey = process.env.ALPHA_VANTAGE_API_KEY

  async getStockDetails(symbol: string): Promise<Stock | null> {
    if (!this.apiKey) return null
    try {
      const resp = await this.client.get('/query', {
        params: { function: 'GLOBAL_QUOTE', symbol: `${symbol}.BSE`, apikey: this.apiKey },
      })
      const q = resp.data?.['Global Quote']
      if (!q) return null
      const price = Number(q['05. price'])
      const prev = price - Number(q['09. change'])
      return {
        symbol,
        name: symbol,
        exchange: 'BSE',
        ltp: price,
        change: Number(q['09. change']),
        changePercent: prev ? (Number(q['09. change']) / prev) * 100 : 0,
        volume: Number(q['06. volume']) || undefined,
      }
    } catch (e) {
      return null
    }
  }
}

// RapidAPI NSE (paid)
export class RapidAPINSEProvider {
  private apiKey = process.env.RAPIDAPI_KEY
  private host = process.env.RAPIDAPI_HOST
  private client = createAPIClient(this.host ? `https://${this.host}` : '', {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
    'X-RapidAPI-Host': process.env.RAPIDAPI_HOST || '',
  })

  async getStockDetails(_symbol: string): Promise<Stock | null> {
    if (!this.apiKey || !this.host) return null
    try {
      // Example endpoint; adjust to your RapidAPI provider schema
      const resp = await this.client.get('/any/endpoint/that/returns/price', { params: {} })
      const d = resp.data?.[0]
      if (!d) return null
      return {
        symbol: d.symbol || _symbol,
        name: d.identifier || _symbol,
        exchange: 'NSE',
        ltp: Number(d.lastPrice),
        change: Number(d.change),
        changePercent: Number(d.pChange),
        volume: Number(d.totalTradedVolume) || undefined,
      }
    } catch (e) {
      return null
    }
  }
}

// Unofficial NSE endpoints (use carefully; may require cookies)
export class UnofficialNSEProvider {
  private client = createAPIClient(process.env.NSE_UNOFFICIAL_BASE_URL || 'https://www.nseindia.com/api')

  async getMarketIndices(): Promise<IndexData[]> {
    try {
      const resp = await this.client.get('/allIndices')
      const list = resp.data?.data || []
      const take = (name: string) => list.find((i: any) => i.indexName === name)
      const toIdx = (name: string): IndexData | null => {
        const it = take(name)
        if (!it) return null
        return { name, value: Number(it.last), change: Number(it.change), changePercent: Number(it.percentChange) }
      }
      return ['NIFTY 50', 'NIFTY BANK', 'NIFTY MIDCAP 100', 'NIFTY SMALLCAP 100']
        .map(toIdx)
        .filter(Boolean) as IndexData[]
    } catch (e) {
      return []
    }
  }
}

export class NSEAPIManager {
  yahoo = new YahooFinanceProvider()
  alpha = new AlphaVantageProvider()
  rapid = new RapidAPINSEProvider()
  nse = new UnofficialNSEProvider()

  async getStockDetails(symbol: string): Promise<Stock | null> {
    // Try in order: Rapid (if configured) → Yahoo → Alpha
    const chain = [
      async () => this.rapid.getStockDetails(symbol),
      async () => this.yahoo.getStockDetails(symbol),
      async () => this.alpha.getStockDetails(symbol),
    ]
    for (const step of chain) {
      try {
        const out = await step()
        if (out) return out
      } catch (_) {}
    }
    return null
  }

  async getMarketIndices(): Promise<IndexData[]> {
    const out = await this.nse.getMarketIndices()
    return out
  }

  async getStockIntraday(symbol: string, timeframe: Timeframe): Promise<ChartDataPoint[]> {
    // Yahoo has decent free intraday
    const out = await this.yahoo.getStockIntraday(symbol, timeframe)
    return out
  }
}
