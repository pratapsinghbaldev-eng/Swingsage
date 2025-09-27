import { useQuery } from '@tanstack/react-query'

export interface UseSignalsResult {
  success: boolean
  symbol: string
  count: number
  signals: Array<{
    type: 'BUY' | 'SELL'
    indicator: 'RSI' | 'EMA' | 'MACD' | 'BOLLINGER' | 'ATR'
    strength: 'weak' | 'moderate' | 'strong'
    reason: string
    timestamp: string
  }>
  timestamp: string
}

export function useStockSignals(symbol: string) {
  return useQuery<UseSignalsResult>({
    queryKey: ['stocks', 'signals', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${symbol}/signals`)
      if (!res.ok) throw new Error('Failed to fetch signals')
      return res.json()
    },
    enabled: !!symbol,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchInterval: 60 * 1000,
  })
}


