import { useQuery } from '@tanstack/react-query'
import { getStockFundamentals } from '@/lib/api'

export function useStockFundamentals(symbol: string) {
  return useQuery({
    queryKey: ['stocks', 'fundamentals', symbol],
    queryFn: () => getStockFundamentals(symbol),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000, // 10 minutes - fundamentals don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
