import { searchStocks, getMarketIndices } from '../api'

// Mock environment variables
process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = 'true'

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
})
