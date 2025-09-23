import { useQuery } from '@tanstack/react-query'
import { getStockIntraday, type Timeframe } from '@/lib/api'

export function useStockIntraday(symbol: string, timeframe: Timeframe) {
  return useQuery({
    queryKey: ['stocks', 'intraday', symbol, timeframe],
    queryFn: () => getStockIntraday(symbol, timeframe),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
