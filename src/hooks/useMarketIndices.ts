import { useQuery } from '@tanstack/react-query'
import { getMarketIndices } from '@/lib/api'

export function useMarketIndices() {
  return useQuery({
    queryKey: ['market', 'indices'],
    queryFn: getMarketIndices,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}
