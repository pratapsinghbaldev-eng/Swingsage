import {
  sma,
  ema,
  rsi,
  maCrossoverSignal,
  calculateIndicators,
  formatIndicatorValue,
  getRSIInterpretation,
  getSignalColor
} from '../indicators'

describe('Technical Indicators', () => {
  describe('SMA (Simple Moving Average)', () => {
    it('should calculate SMA correctly', () => {
      const prices = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]
      const sma5 = sma(prices, 5)
      
      expect(sma5[0]).toBeNull()
      expect(sma5[1]).toBeNull()
      expect(sma5[2]).toBeNull()
      expect(sma5[3]).toBeNull()
      expect(sma5[4]).toBe(14) // (10+12+14+16+18)/5
      expect(sma5[5]).toBe(16) // (12+14+16+18+20)/5
    })

    it('should handle empty array', () => {
      const result = sma([], 5)
      expect(result).toEqual([])
    })

    it('should handle period larger than data', () => {
      const prices = [10, 12, 14]
      const result = sma(prices, 5)
      expect(result).toEqual([null, null, null])
    })
  })

  describe('EMA (Exponential Moving Average)', () => {
    it('should calculate EMA correctly', () => {
      const prices = [22, 22.15, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29]
      const ema5 = ema(prices, 5)
      
      expect(ema5[0]).toBeNull()
      expect(ema5[1]).toBeNull()
      expect(ema5[2]).toBeNull()
      expect(ema5[3]).toBeNull()
      expect(ema5[4]).toBeCloseTo(22.116, 1) // First EMA is SMA
      expect(ema5[5]).not.toBeNull()
      expect(ema5[5]).toBeCloseTo(22.12, 1)
    })

    it('should handle empty array', () => {
      const result = ema([], 5)
      expect(result).toEqual([])
    })
  })

  describe('RSI (Relative Strength Index)', () => {
    it('should calculate RSI correctly', () => {
      const prices = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 47.37, 47.20, 46.57, 46.03, 46.83, 47.69, 46.49, 46.26]
      const rsi14 = rsi(prices, 14)
      
      expect(rsi14[0]).toBeNull() // First value is always null
      expect(rsi14[14]).not.toBeNull()
      expect(rsi14[15]).not.toBeNull()
      expect(rsi14[15]).toBeGreaterThan(0)
      expect(rsi14[15]).toBeLessThan(100)
    })

    it('should handle upward trend correctly', () => {
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
      const rsi14 = rsi(prices, 14)
      
      expect(rsi14[15]).toBeCloseTo(100, 0) // Should be close to 100 for pure uptrend
    })

    it('should handle downward trend correctly', () => {
      const prices = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10]
      const rsi14 = rsi(prices, 14)
      
      expect(rsi14[15]).toBeCloseTo(0, 0) // Should be close to 0 for pure downtrend
    })
  })

  describe('MA Crossover Signal', () => {
    it('should detect bullish crossover', () => {
      const shortMA = [10, 11, 12, 13, 14]
      const longMA = [12, 12, 12, 12, 12]
      
      const signal = maCrossoverSignal(shortMA, longMA)
      expect(signal).toBe('BULLISH')
    })

    it('should detect bearish crossover', () => {
      const shortMA = [14, 13, 12, 11, 10]
      const longMA = [12, 12, 12, 12, 12]
      
      const signal = maCrossoverSignal(shortMA, longMA)
      expect(signal).toBe('BEARISH')
    })

    it('should return neutral for insufficient data', () => {
      const shortMA = [10]
      const longMA = [12]
      
      const signal = maCrossoverSignal(shortMA, longMA)
      expect(signal).toBe('NEUTRAL')
    })

    it('should return neutral for null values', () => {
      const shortMA = [null, null]
      const longMA = [null, null]
      
      const signal = maCrossoverSignal(shortMA, longMA)
      expect(signal).toBe('NEUTRAL')
    })
  })

  describe('Calculate Indicators', () => {
    it('should calculate all indicators', () => {
      const prices = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50]
      const result = calculateIndicators(prices)
      
      expect(result).toHaveProperty('sma20')
      expect(result).toHaveProperty('ema50')
      expect(result).toHaveProperty('rsi14')
      expect(result).toHaveProperty('crossoverSignal')
      expect(result).toHaveProperty('currentValues')
      
      expect(result.currentValues).toHaveProperty('sma20')
      expect(result.currentValues).toHaveProperty('ema50')
      expect(result.currentValues).toHaveProperty('rsi14')
      expect(result.currentValues).toHaveProperty('crossoverSignal')
    })
  })

  describe('Utility Functions', () => {
    describe('formatIndicatorValue', () => {
      it('should format valid numbers', () => {
        expect(formatIndicatorValue(123.456)).toBe('123.46')
        expect(formatIndicatorValue(123.456, 1)).toBe('123.5')
      })

      it('should handle null values', () => {
        expect(formatIndicatorValue(null)).toBe('N/A')
      })

      it('should handle NaN values', () => {
        expect(formatIndicatorValue(NaN)).toBe('N/A')
      })
    })

    describe('getRSIInterpretation', () => {
      it('should interpret RSI values correctly', () => {
        expect(getRSIInterpretation(75)).toBe('Overbought')
        expect(getRSIInterpretation(25)).toBe('Oversold')
        expect(getRSIInterpretation(60)).toBe('Bullish')
        expect(getRSIInterpretation(40)).toBe('Bearish')
        expect(getRSIInterpretation(null)).toBe('N/A')
      })
    })

    describe('getSignalColor', () => {
      it('should return correct color classes', () => {
        expect(getSignalColor('BULLISH')).toBe('text-green-600')
        expect(getSignalColor('BEARISH')).toBe('text-red-600')
        expect(getSignalColor('NEUTRAL')).toBe('text-gray-600')
      })
    })
  })
})
