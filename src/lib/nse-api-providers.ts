import axios from 'axios'
import type { Stock, ChartDataPoint, IndexData, Timeframe } from './api'

// NSE API index item interface
interface NSEIndexItem {
  indexName: string
  last: number | string
  change: number | string
  percentChange: number | string
}

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
    } catch {
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
    } catch {
      return []
    }
  }
}

// Alpha Vantage (free tier with rate limits)
export class AlphaVantageProvider {
  private client = createAPIClient(process.env.ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co')
  private apiKey = process.env.ALPHA_VANTAGE_API_KEY

  get hasApiKey(): boolean {
    return !!this.apiKey
  }

  private toAlphaVantageSymbol(symbol: string): string {
    // Support both NSE (.NS) and BSE (.BSE) suffixes, default to NSE
    if (symbol.endsWith('.NS')) return symbol
    if (symbol.endsWith('.BSE')) return symbol
    return `${symbol}.NS`
  }

  async getQuote(symbol: string): Promise<Stock | null> {
    if (!this.apiKey) return null
    try {
      const avSymbol = this.toAlphaVantageSymbol(symbol)
      const resp = await this.client.get('/query', {
        params: { function: 'GLOBAL_QUOTE', symbol: avSymbol, apikey: this.apiKey },
      })

      // Check for rate limit error
      if (resp.data?.['Note']) {
        console.warn('Alpha Vantage rate limit reached:', resp.data.Note)
        return null
      }

      const q = resp.data?.['Global Quote']
      if (!q) return null

      const price = Number(q['05. price'])
      const change = Number(q['09. change'])
      const previousClose = Number(q['08. previous close'])
      const volume = Number(q['06. volume'])

      if (!Number.isFinite(price) || !Number.isFinite(previousClose)) return null

      const changePercent = previousClose ? (change / previousClose) * 100 : 0

      return {
        symbol: symbol.replace('.NS', '').replace('.BSE', ''), // Return clean symbol
        name: symbol.replace('.NS', '').replace('.BSE', ''), // Use symbol as name (Alpha Vantage doesn't provide company names in GLOBAL_QUOTE)
        exchange: avSymbol.endsWith('.NS') ? 'NSE' : 'BSE',
        ltp: price,
        change: change,
        changePercent: changePercent,
        volume: Number.isFinite(volume) ? volume : undefined,
        previousClose: previousClose,
      }
    } catch (error) {
      console.error('Alpha Vantage getQuote error:', error)
      return null
    }
  }

  async getIntraday(symbol: string, interval = "5min"): Promise<ChartDataPoint[]> {
    if (!this.apiKey) return []
    try {
      const avSymbol = this.toAlphaVantageSymbol(symbol)
      const resp = await this.client.get('/query', {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: avSymbol,
          interval: interval,
          apikey: this.apiKey,
          outputsize: 'compact' // Get last 100 data points
        },
      })

      // Check for rate limit error
      if (resp.data?.['Note']) {
        console.warn('Alpha Vantage rate limit reached:', resp.data.Note)
        return []
      }

      const timeSeries = resp.data?.['Time Series (5min)'] || resp.data?.['Time Series (1min)']
      if (!timeSeries) return []

      const dataPoints: ChartDataPoint[] = []

      // Type the Alpha Vantage time series response
      type AlphaBar = {
        '1. open': string
        '2. high': string
        '3. low': string
        '4. close': string
        '5. volume': string
      }
      type AlphaSeries = Record<string, AlphaBar>

      // Safely cast the time series data
      const typedTimeSeries = timeSeries as AlphaSeries

      for (const timestamp of Object.keys(typedTimeSeries)) {
        const values = typedTimeSeries[timestamp]
        const price = Number(values['4. close'])
        const volume = Number(values['5. volume'])

        if (Number.isFinite(price)) {
          dataPoints.push({
            time: new Date(timestamp).toISOString(),
            price: price,
            volume: Number.isFinite(volume) ? volume : undefined,
          })
        }
      }

      // Sort by timestamp ascending (oldest first)
      return dataPoints.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    } catch (error) {
      console.error('Alpha Vantage getIntraday error:', error)
      return []
    }
  }

  async getFundamentals(symbol: string): Promise<import('./api').StockFundamentals | null> {
    if (!this.apiKey) return null
    try {
      const avSymbol = this.toAlphaVantageSymbol(symbol)
      const resp = await this.client.get('/query', {
        params: { function: 'OVERVIEW', symbol: avSymbol, apikey: this.apiKey },
      })

      // Check for rate limit error
      if (resp.data?.['Note']) {
        console.warn('Alpha Vantage rate limit reached:', resp.data.Note)
        return null
      }

      const data = resp.data
      if (!data || !data.Symbol) return null

      // Parse market cap from string (e.g., "1658000000000" to number in crores)
      const marketCapStr = data.MarketCapitalization
      const marketCap = marketCapStr ? parseFloat(marketCapStr) / 10000000 : 0 // Convert to crores

      return {
        symbol: symbol.replace('.NS', '').replace('.BSE', ''),
        marketCap: marketCap,
        peRatio: data.PERatio ? Number(data.PERatio) : null,
        eps: data.EPS ? Number(data.EPS) : null,
        week52High: data['52WeekHigh'] ? Number(data['52WeekHigh']) : 0,
        week52Low: data['52WeekLow'] ? Number(data['52WeekLow']) : 0,
        volume: data.Volume ? Number(data.Volume) : 0,
        avgVolume: null, // Alpha Vantage doesn't provide average volume in OVERVIEW
        sector: data.Sector || 'N/A',
        industry: data.Industry,
        dividendYield: data.DividendYield ? Number(data.DividendYield) : null,
        bookValue: data.BookValue ? Number(data.BookValue) : null,
        pbRatio: data.PriceToBookRatio ? Number(data.PriceToBookRatio) : null,
      }
    } catch (error) {
      console.error('Alpha Vantage getFundamentals error:', error)
      return null
    }
  }

  async getStockDetails(symbol: string): Promise<Stock | null> {
    return this.getQuote(symbol)
  }

  async getStockIntraday(symbol: string, timeframe: Timeframe): Promise<ChartDataPoint[]> {
    // Map timeframes to Alpha Vantage intervals
    const intervalMap: Record<Timeframe, string> = {
      '1D': '5min',
      '1W': '15min',
      '1M': '30min',
      '3M': '60min',
      '1Y': 'daily'
    }

    return this.getIntraday(symbol, intervalMap[timeframe])
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
    } catch {
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
      const take = (name: string) => list.find((i: NSEIndexItem) => i.indexName === name)
      const toIdx = (name: string): IndexData | null => {
        const it = take(name)
        if (!it) return null
        return { name, value: Number(it.last), change: Number(it.change), changePercent: Number(it.percentChange) }
      }
      return ['NIFTY 50', 'NIFTY BANK', 'NIFTY MIDCAP 100', 'NIFTY SMALLCAP 100']
        .map(toIdx)
        .filter(Boolean) as IndexData[]
    } catch {
      return []
    }
  }
}

export class NSEAPIManager {
  yahoo = new YahooFinanceProvider()
  alpha = new AlphaVantageProvider()
  rapid = new RapidAPINSEProvider()
  nse = new UnofficialNSEProvider()

  private getPrimaryProvider(): string {
    return process.env.NEXT_PUBLIC_PRIMARY_PROVIDER || 'yahoo'
  }

  private async tryProviders<T>(
    providers: (() => Promise<T | null>)[],
    fallbackChain?: (() => Promise<T | null>)[]
  ): Promise<T | null> {
    const primary = this.getPrimaryProvider()

    // Try primary provider first if it's not in the default chain
    if (primary === 'alpha' && this.alpha.hasApiKey) {
      const alphaResult = await providers.find(p => p.toString().includes('alpha'))?.()
      if (alphaResult) return alphaResult
    }

    // Try fallback chain
    if (fallbackChain) {
      for (const step of fallbackChain) {
        try {
          const out = await step()
          if (out) return out
        } catch {}
      }
    }

    return null
  }

  async getStockDetails(symbol: string): Promise<Stock | null> {
    const primary = this.getPrimaryProvider()
    console.log(`🔍 [NSEAPIManager] getStockDetails(${symbol}) - Primary provider: ${primary}`)

    if (primary === 'alpha' && this.alpha.hasApiKey) {
      console.log('📡 [NSEAPIManager] Trying Alpha Vantage first...')
      // Try Alpha Vantage first
      const alphaResult = await this.alpha.getStockDetails(symbol)
      if (alphaResult) {
        console.log('✅ [NSEAPIManager] Alpha Vantage success')
        return alphaResult
      }
      console.log('❌ [NSEAPIManager] Alpha Vantage failed, falling back...')

      // Fallback to Yahoo and Rapid
      return this.tryProviders(
        [() => this.yahoo.getStockDetails(symbol), () => this.rapid.getStockDetails(symbol)],
        [() => this.yahoo.getStockDetails(symbol), () => this.rapid.getStockDetails(symbol)]
      )
    }

    console.log('📡 [NSEAPIManager] Using default provider chain: Rapid → Yahoo → Alpha')
    // Default order: Rapid (if configured) → Yahoo → Alpha
    return this.tryProviders(
      [() => this.rapid.getStockDetails(symbol), () => this.yahoo.getStockDetails(symbol), () => this.alpha.getStockDetails(symbol)],
      [() => this.rapid.getStockDetails(symbol), () => this.yahoo.getStockDetails(symbol), () => this.alpha.getStockDetails(symbol)]
    )
  }

  async getMarketIndices(): Promise<IndexData[]> {
    const out = await this.nse.getMarketIndices()
    return out
  }

  async getStockIntraday(symbol: string, timeframe: Timeframe): Promise<ChartDataPoint[]> {
    const primary = this.getPrimaryProvider()

    if (primary === 'alpha' && this.alpha.hasApiKey) {
      // Try Alpha Vantage first
      const alphaResult = await this.alpha.getStockIntraday(symbol, timeframe)
      if (alphaResult.length > 0) return alphaResult

      // Fallback to Yahoo
      return this.yahoo.getStockIntraday(symbol, timeframe)
    }

    // Default: Yahoo first, then Alpha Vantage
    const yahooResult = await this.yahoo.getStockIntraday(symbol, timeframe)
    if (yahooResult.length > 0) return yahooResult

    return this.alpha.getStockIntraday(symbol, timeframe)
  }

  async getStockFundamentals(symbol: string): Promise<import('./api').StockFundamentals | null> {
    const primary = this.getPrimaryProvider()

    if (primary === 'alpha' && this.alpha.hasApiKey) {
      // Try Alpha Vantage first
      const alphaResult = await this.alpha.getFundamentals(symbol)
      if (alphaResult) return alphaResult

      // For now, no fallback for fundamentals since other providers don't implement it
      return null
    }

    // Default: Only Alpha Vantage supports fundamentals
    return this.alpha.getFundamentals(symbol)
  }

  async searchStocks(_query: string): Promise<Stock[]> {
    void _query // Mark as intentionally unused
    // For now, return empty array as this would need a proper search API
    // The client-side code handles mock data separately
    return []
  }
}
