import { useMutation } from '@tanstack/react-query'
import type { ScreenerFilterId } from '@/lib/screener'

export interface ScreenerResultRow {
  symbol: string
  name?: string
  price: number
  matchedSignals: Array<{
    type: 'BUY' | 'SELL'
    indicator: 'RSI' | 'EMA' | 'MACD' | 'BOLLINGER' | 'ATR'
    strength: 'weak' | 'moderate' | 'strong'
    reason: string
    timestamp: string
  }>
  confidence: number
}

export function useScreener() {
  return useMutation<{ success: boolean, results: ScreenerResultRow[] }, Error, { symbols?: string[], filters: ScreenerFilterId[] }>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Screener failed')
      return res.json()
    },
  })
}


