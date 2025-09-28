import { useMutation } from '@tanstack/react-query'
import type { PivotScreenerFilters, PivotScreenerRow } from '@/app/api/pivotscreener/route'

export interface PivotScreenerResponse {
  success: boolean
  results: PivotScreenerRow[]
  cached?: boolean
  timestamp: string
}

export function usePivotScreener() {
  return useMutation<PivotScreenerResponse, Error, PivotScreenerFilters>({
    mutationFn: async (filters) => {
      const res = await fetch('/api/pivotscreener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      })
      if (!res.ok) throw new Error('Pivot screener failed')
      return res.json()
    },
  })
}
