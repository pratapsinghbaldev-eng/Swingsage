import { searchStocks, getMarketIndices } from '../api'
import { AlphaVantageProvider } from '../nse-api-providers'

// Mock environment variables
process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = 'true'

// Mock the createAPIClient function from nse-api-providers
jest.mock('../nse-api-providers', () => {
  const actual = jest.requireActual('../nse-api-providers')
  return {
    ...actual,
    createAPIClient: jest.fn(() => ({
      get: jest.fn()
    }))
  }
})

// Import after mock is set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createAPIClient } = require('../nse-api-providers')
const mockCreateAPIClient = createAPIClient as jest.MockedFunction<typeof createAPIClient>
const mockClient = { get: jest.fn() }

mockCreateAPIClient.mockReturnValue(mockClient)

describe('API Functions', () => {
  describe('searchStocks', () => {
    it('should return empty array for empty query', async () => {
      const result = await searchStocks('')
      expect(result).toEqual([])
    })

    it('should return empty array for query less than 2 characters', async () => {
      const result = await searchStocks('T')
      expect(result).toEqual([])
    })

    it('should return filtered stocks for valid query', async () => {
      const result = await searchStocks('Reliance')
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('symbol')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('ltp')
      expect(result[0]).toHaveProperty('change')
      expect(result[0]).toHaveProperty('changePercent')
      expect(result[0]).toHaveProperty('exchange')
    })

    it('should return stocks matching symbol search', async () => {
      const result = await searchStocks('TCS')
      expect(result.length).toBeGreaterThan(0)
      const tcsStock = result.find(stock => stock.symbol === 'TCS')
      expect(tcsStock).toBeDefined()
      expect(tcsStock?.name).toContain('Tata Consultancy')
    })

    it('should return stocks matching company name search', async () => {
      const result = await searchStocks('HDFC')
      expect(result.length).toBeGreaterThan(0)
      const hdfcStock = result.find(stock => stock.name.includes('HDFC'))
      expect(hdfcStock).toBeDefined()
    })

    it('should handle case insensitive search', async () => {
      const lowerResult = await searchStocks('reliance')
      const upperResult = await searchStocks('RELIANCE')
      expect(lowerResult.length).toEqual(upperResult.length)
    })
  })

  describe('getMarketIndices', () => {
    it('should return market indices data', async () => {
      const result = await getMarketIndices()
      expect(result).toHaveLength(4)
      
      const expectedIndices = ['Nifty 50', 'Nifty Bank', 'Nifty Midcap', 'Nifty Smallcap']
      expectedIndices.forEach(indexName => {
        const index = result.find(i => i.name === indexName)
        expect(index).toBeDefined()
        expect(index).toHaveProperty('value')
        expect(index).toHaveProperty('change')
        expect(index).toHaveProperty('changePercent')
      })
    })

    it('should return indices with numeric values', async () => {
      const result = await getMarketIndices()
      result.forEach(index => {
        expect(typeof index.value).toBe('number')
        expect(typeof index.change).toBe('number')
        expect(typeof index.changePercent).toBe('number')
      })
    })
  })

  describe('AlphaVantageProvider', () => {
    let provider: AlphaVantageProvider

    const mockApiKey = 'test-api-key'
    const mockBaseUrl = 'https://test.alphavantage.co'

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks()

      // Mock environment variables
      process.env.ALPHA_VANTAGE_API_KEY = mockApiKey
      process.env.ALPHA_VANTAGE_BASE_URL = mockBaseUrl

      // Create provider instance with mocked env
      provider = new AlphaVantageProvider()
      
      // Replace the provider's client with our mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(provider as any).client = mockClient
    })

    afterEach(() => {
      jest.clearAllMocks()
      delete process.env.ALPHA_VANTAGE_API_KEY
      delete process.env.ALPHA_VANTAGE_BASE_URL
    })

    describe('getQuote', () => {
      beforeEach(() => {
        // Set up default mock response for successful requests
        mockClient.get.mockResolvedValue({
          data: {
            'Global Quote': {
              '01. symbol': 'RELIANCE.NS',
              '02. open': '2450.00',
              '03. high': '2460.00',
              '04. low': '2445.00',
              '05. price': '2456.75',
              '06. volume': '45000000',
              '07. latest trading day': '2024-01-15',
              '08. previous close': '2441.50',
              '09. change': '15.25',
              '10. change percent': '0.625%'
            }
          }
        })
      })

      it('should return null when no API key is provided', async () => {
        delete process.env.ALPHA_VANTAGE_API_KEY
        const noKeyProvider = new AlphaVantageProvider()
        const result = await noKeyProvider.getQuote('RELIANCE')
        expect(result).toBeNull()
      })

      it('should return stock quote for NSE symbol', async () => {
        const result = await provider.getQuote('RELIANCE')

        expect(result).toEqual({
          symbol: 'RELIANCE',
          name: 'RELIANCE',
          exchange: 'NSE',
          ltp: 2456.75,
          change: 15.25,
          changePercent: 0.6246160147450338, // Calculated as (15.25 / 2441.50) * 100
          volume: 45000000,
          previousClose: 2441.50
        })
      })

      it('should return stock quote for BSE symbol', async () => {
        // Update mock to return BSE response
        mockClient.get.mockResolvedValue({
          data: {
            'Global Quote': {
              '01. symbol': 'RELIANCE.BSE',
              '05. price': '2456.75',
              '06. volume': '45000000',
              '08. previous close': '2441.50',
              '09. change': '15.25',
            }
          }
        })

        const result = await provider.getQuote('RELIANCE.BSE')

        expect(result?.exchange).toBe('BSE')
        expect(result?.symbol).toBe('RELIANCE')
      })

      it('should handle rate limit errors gracefully', async () => {
        mockClient.get.mockResolvedValue({
          data: {
            'Note': 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.'
          }
        })

        const result = await provider.getQuote('RELIANCE')
        expect(result).toBeNull()
      })

      it('should handle API errors gracefully', async () => {
        mockClient.get.mockRejectedValue(new Error('API Error'))

        const result = await provider.getQuote('RELIANCE')
        expect(result).toBeNull()
      })
    })

    describe('getIntraday', () => {
      beforeEach(() => {
        // Set up default mock response for successful requests
        mockClient.get.mockResolvedValue({
          data: {
            'Meta Data': {
              '1. Information': 'Intraday Prices',
              '2. Symbol': 'RELIANCE.NS',
              '3. Last Refreshed': '2024-01-15 16:00:00',
              '4. Interval': '5min',
              '5. Output Size': 'Compact',
              '6. Time Zone': 'US/Eastern'
            },
            'Time Series (5min)': {
              '2024-01-15 16:00:00': {
                '1. open': '2455.00',
                '2. high': '2457.00',
                '3. low': '2454.00',
                '4. close': '2456.75',
                '5. volume': '450000'
              },
              '2024-01-15 15:55:00': {
                '1. open': '2453.00',
                '2. high': '2456.00',
                '3. low': '2452.00',
                '4. close': '2455.00',
                '5. volume': '380000'
              }
            }
          }
        })
      })

      it('should return empty array when no API key is provided', async () => {
        delete process.env.ALPHA_VANTAGE_API_KEY
        const noKeyProvider = new AlphaVantageProvider()
        const result = await noKeyProvider.getIntraday('RELIANCE', '5min')
        expect(result).toEqual([])
      })

      it('should return intraday data points', async () => {
        const result = await provider.getIntraday('RELIANCE', '5min')

        expect(result).toHaveLength(2)
        // Results are sorted chronologically (oldest first)
        expect(result[0]).toEqual({
          time: expect.any(String),
          price: 2455.00, // 15:55 entry (older)
          volume: 380000
        })
        expect(result[1]).toEqual({
          time: expect.any(String),
          price: 2456.75, // 16:00 entry (newer)
          volume: 450000
        })
      })

      it('should handle rate limit errors gracefully', async () => {
        mockClient.get.mockResolvedValue({
          data: {
            'Note': 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.'
          }
        })

        const result = await provider.getIntraday('RELIANCE', '5min')
        expect(result).toEqual([])
      })
    })

    describe('getFundamentals', () => {
      beforeEach(() => {
        // Set up default mock response for successful requests
        mockClient.get.mockResolvedValue({
          data: {
            Symbol: 'RELIANCE.NS',
            Name: 'Reliance Industries Ltd',
            Description: 'Reliance Industries Limited is an Indian multinational conglomerate company.',
            MarketCapitalization: '1658000000000',
            PERatio: '28.5',
            PEGRatio: '1.2',
            BookValue: '1245.80',
            DividendPerShare: '9.0',
            DividendYield: '0.35',
            EPS: '86.2',
            RevenueTTM: '500000000000',
            GrossProfitTTM: '200000000000',
            ProfitMargin: '0.15',
            OperatingMarginTTM: '0.12',
            ReturnOnAssetsTTM: '0.08',
            ReturnOnEquityTTM: '0.18',
            RevenuePerShareTTM: '739.5',
            QuarterlyEarningsGrowthYOY: '0.25',
            QuarterlyRevenueGrowthYOY: '0.20',
            AnalystTargetPrice: '2800.00',
            TrailingPE: '28.5',
            ForwardPE: '24.0',
            PriceToSalesRatioTTM: '3.3',
            PriceToBookRatio: '1.97',
            EVToRevenue: '3.5',
            EVToEBITDA: '15.2',
            Beta: '1.2',
            '52WeekHigh': '2856.15',
            '52WeekLow': '2220.30',
            '50DayMovingAverage': '2400.00',
            '200DayMovingAverage': '2350.00',
            SharesOutstanding: '6760000000',
            SharesFloat: '4000000000',
            SharesShort: '15000000',
            SharesShortPriorMonth: '12000000',
            ShortRatio: '2.5',
            ShortPercentOutstanding: '0.002',
            ShortPercentFloat: '0.004',
            PercentInsiders: '0.45',
            PercentInstitutions: '0.35',
            ForwardAnnualDividendRate: '9.0',
            ForwardAnnualDividendYield: '0.35',
            PayoutRatio: '0.25',
            DividendDate: '2024-08-20',
            ExDividendDate: '2024-08-05',
            LastSplitFactor: '1:1',
            LastSplitDate: '2017-09-01'
          }
        })
      })

      it('should return null when no API key is provided', async () => {
        delete process.env.ALPHA_VANTAGE_API_KEY
        const noKeyProvider = new AlphaVantageProvider()
        const result = await noKeyProvider.getFundamentals('RELIANCE')
        expect(result).toBeNull()
      })

      it('should return company fundamentals', async () => {
        const result = await provider.getFundamentals('RELIANCE')

        expect(result).toEqual({
          symbol: 'RELIANCE',
          marketCap: 165800, // 1,658,000,000,000 / 10,000,000 = 165,800 crores
          peRatio: 28.5,
          eps: 86.2,
          week52High: 2856.15,
          week52Low: 2220.30,
          volume: 0, // No Volume field in mock data, defaults to 0
          avgVolume: null,
          sector: 'N/A', // No Sector field in mock data, defaults to 'N/A'
          industry: undefined,
          dividendYield: 0.35,
          bookValue: 1245.80,
          pbRatio: 1.97
        })
      })

      it('should handle rate limit errors gracefully', async () => {
        mockClient.get.mockResolvedValue({
          data: {
            'Note': 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.'
          }
        })

        const result = await provider.getFundamentals('RELIANCE')
        expect(result).toBeNull()
      })
    })

    describe('toAlphaVantageSymbol', () => {
      it('should add .NS suffix to symbols without exchange', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (provider as any).toAlphaVantageSymbol('RELIANCE')
        expect(result).toBe('RELIANCE.NS')
      })

      it('should preserve .NS suffix', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (provider as any).toAlphaVantageSymbol('RELIANCE.NS')
        expect(result).toBe('RELIANCE.NS')
      })

      it('should preserve .BSE suffix', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (provider as any).toAlphaVantageSymbol('RELIANCE.BSE')
        expect(result).toBe('RELIANCE.BSE')
      })
    })
  })
})
