import { useQuery } from '@tanstack/react-query'
import { searchStocks } from '@/lib/api'

export function useStockSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['stocks', 'search', query],
    queryFn: () => searchStocks(query),
    enabled: enabled && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
