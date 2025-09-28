import { useMutation } from '@tanstack/react-query'
import type { BacktestRequest, BacktestResponse } from '@/app/api/backtest/route'

export function useBacktest() {
  return useMutation<BacktestResponse, Error, BacktestRequest>({
    mutationFn: async (request) => {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Backtest failed')
      }
      return res.json()
    },
  })
}
