'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useScreener } from '@/hooks/useScreener'
import type { ScreenerFilterId } from '@/lib/screener'

const FILTERS: { id: ScreenerFilterId, label: string }[] = [
  { id: 'rsiOversold', label: 'RSI Oversold (<30)' },
  { id: 'rsiOverbought', label: 'RSI Overbought (>70)' },
  { id: 'emaBullish', label: 'EMA Bullish (Price>EMA20>EMA50)' },
  { id: 'emaBearish', label: 'EMA Bearish (Price<EMA20<EMA50)' },
  { id: 'macdBullish', label: 'MACD Bullish Cross' },
  { id: 'macdBearish', label: 'MACD Bearish Cross' },
  { id: 'bbBreakoutUp', label: 'BB Breakout Up (+Vol)' },
  { id: 'bbBreakdown', label: 'BB Breakdown (+Vol)' },
  { id: 'atrSpike', label: 'Volatility Spike (ATR)' },
  { id: 'trendReversal', label: 'Trend Reversal (RSI + EMA)' },
]

export default function ScreenerPage() {
  const router = useRouter()
  const [symbolsInput, setSymbolsInput] = useState('')
  const [selected, setSelected] = useState<ScreenerFilterId[]>(['rsiOversold'])
  const { mutateAsync, data, isPending, reset } = useScreener()

  const runScreener = async () => {
    const symbols = symbolsInput
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
    await mutateAsync({ symbols: symbols.length ? symbols : undefined, filters: selected })
  }

  const toggle = (id: ScreenerFilterId) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stock Screener</h1>
          <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline">Back to Home</button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Symbols (comma-separated)</label>
              <input value={symbolsInput} onChange={(e) => setSymbolsInput(e.target.value)} placeholder="RELIANCE,TCS,INFY" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filters</label>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                  <button key={f.id} onClick={() => toggle(f.id)} className={`px-3 py-2 rounded-lg text-sm border ${selected.includes(f.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button onClick={runScreener} disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isPending ? 'Scanning...' : 'Run Screener'}</button>
            <button onClick={() => { setSelected([]); setSymbolsInput(''); reset() }} className="ml-3 px-4 py-2 border rounded-lg hover:bg-gray-50">Reset</button>
          </div>
        </div>

        {data?.results && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Results ({data.results.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600">
                    <th className="p-2">Symbol</th>
                    <th className="p-2">Price</th>
                    <th className="p-2">Matched Signals</th>
                    <th className="p-2">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map(row => (
                    <tr key={row.symbol} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/stock/${row.symbol}`)}>
                      <td className="p-2 font-semibold">{row.symbol}</td>
                      <td className="p-2">₹{row.price.toFixed(2)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {row.matchedSignals.map((s, i) => (
                            <span key={i} className={`text-xs px-2 py-1 rounded-full ${s.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.indicator}:{s.type}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 font-medium">{row.confidence.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


