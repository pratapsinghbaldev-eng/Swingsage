import { useMemo } from 'react'
import { calculateIndicators } from '@/lib/indicators'
import { type ChartDataPoint } from '@/lib/api'

export function useStockIndicators(chartData: ChartDataPoint[]) {
  return useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        sma20: [],
        ema50: [],
        rsi14: [],
        crossoverSignal: 'NEUTRAL' as const,
        currentValues: {
          sma20: null,
          ema50: null,
          rsi14: null,
          crossoverSignal: 'NEUTRAL' as const
        },
        isLoading: false,
        hasData: false
      }
    }

    const prices = chartData.map(point => point.price)
    const indicators = calculateIndicators(prices)
    
    return {
      ...indicators,
      isLoading: false,
      hasData: true
    }
  }, [chartData])
}
