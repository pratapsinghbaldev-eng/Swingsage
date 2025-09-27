'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useScreener } from '@/hooks/useScreener'
import { type IndexCode } from '@/lib/index-constituents'
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
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([])
  const [selectedIndices, setSelectedIndices] = useState<IndexCode[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<{ symbol: string, name: string }[]>([])
  const [showSug, setShowSug] = useState(false)
  const [bullish, setBullish] = useState<ScreenerFilterId[]>(['rsiOversold','emaBullish','macdBullish','bbBreakoutUp'])
  const [bearish, setBearish] = useState<ScreenerFilterId[]>(['rsiOverbought','emaBearish','macdBearish','bbBreakdown'])
  const { mutateAsync, data, isPending, reset } = useScreener()
  const [requireTwoPlus, setRequireTwoPlus] = useState(true)
  const [minConfidence, setMinConfidence] = useState(70)
  const [requireWeeklyAgree, setRequireWeeklyAgree] = useState(false)

  const runScreener = async () => {
    const typed = symbolsInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const symbols = Array.from(new Set([...typed, ...selectedSymbols, ...selectedIndices]))
    const filters = Array.from(new Set([...bullish, ...bearish]))
    await mutateAsync({ symbols: symbols.length ? symbols : undefined, filters, minConfidence: minConfidence / 100, requireTwoPlus, requireWeeklyAgree })
  }

  const toggleBull = (id: ScreenerFilterId) => {
    setBullish(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleBear = (id: ScreenerFilterId) => {
    setBearish(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const addSymbol = (sym: string) => {
    setSelectedSymbols(prev => prev.includes(sym) ? prev : [...prev, sym])
    setSearchQuery('')
    setSuggestions([])
    setShowSug(false)
  }

  const removeSymbol = (sym: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== sym))
  }

  const toggleIndex = (code: IndexCode) => {
    setSelectedIndices(prev => prev.includes(code) ? prev.filter(i => i !== code) : [...prev, code])
  }

  const clearAll = () => {
    setSelectedSymbols([])
    setSelectedIndices([])
    setSymbolsInput('')
    setSearchQuery('')
    setSuggestions([])
    setBullish([])
    setBearish([])
    reset()
  }

  const fetchSuggestions = async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return }
    // Reuse existing API /api/search that wraps server-side providers
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) return
    const json: { stocks?: Array<{ symbol: string, name: string }> } = await res.json()
    const items = (json.stocks || []).slice(0, 8).map((s) => ({ symbol: s.symbol, name: s.name }))
    setSuggestions(items)
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Stocks</label>
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); fetchSuggestions(e.target.value); setShowSug(true) }}
                  onFocus={() => setShowSug(true)}
                  placeholder="Type to search (min 3 chars)"
                  className="w-full border rounded-lg px-3 py-2"
                />
                {showSug && suggestions.length > 0 && (
                  <div className="absolute z-50 bg-white border border-gray-200 rounded-lg mt-1 w-full max-h-64 overflow-auto shadow-lg">
                    {suggestions.map(s => (
                      <button key={s.symbol} onClick={() => addSymbol(s.symbol)} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                        <div className="font-medium text-gray-900">{s.symbol}</div>
                        <div className="text-xs text-gray-600">{s.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedSymbols.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSymbols.map(s => (
                    <span key={s} className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 border">
                      {s}
                      <button onClick={() => removeSymbol(s)} className="ml-2 text-gray-500 hover:text-gray-700">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Symbols (comma-separated)</label>
              <input value={symbolsInput} onChange={(e) => setSymbolsInput(e.target.value)} placeholder="RELIANCE,TCS,INFY" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bullish Filters</label>
                  <div className="flex flex-wrap gap-2">
                    {FILTERS.filter(f => ['rsiOversold','emaBullish','macdBullish','bbBreakoutUp','atrSpike','trendReversal'].includes(f.id)).map(f => (
                      <button key={f.id} onClick={() => toggleBull(f.id)} className={`px-3 py-2 rounded-lg text-sm border ${bullish.includes(f.id) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bearish Filters</label>
                  <div className="flex flex-wrap gap-2">
                    {FILTERS.filter(f => ['rsiOverbought','emaBearish','macdBearish','bbBreakdown'].includes(f.id)).map(f => (
                      <button key={f.id} onClick={() => toggleBear(f.id)} className={`px-3 py-2 rounded-lg text-sm border ${bearish.includes(f.id) ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={requireTwoPlus} onChange={(e) => setRequireTwoPlus(e.target.checked)} />
                  <span className="text-sm text-gray-700">Require 2+ indicators</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={requireWeeklyAgree} onChange={(e) => setRequireWeeklyAgree(e.target.checked)} />
                  <span className="text-sm text-gray-700">Require Daily + Weekly agreement</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-700">Min Confidence: {minConfidence}%</label>
                  <input type="range" min={50} max={95} value={minConfidence} onChange={(e) => setMinConfidence(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Indices</label>
                <div className="flex flex-wrap gap-2">
                  {(['NIFTY50','NIFTY100','NIFTY200','NIFTY500','MIDCAP','SMALLCAP'] as IndexCode[]).map(code => (
                    <button key={code} onClick={() => toggleIndex(code)} className={`px-3 py-2 rounded-lg text-sm border ${selectedIndices.includes(code) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                      {code}
                    </button>
                  ))}
                </div>
                {selectedIndices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedIndices.map(ix => (
                      <span key={ix} className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{ix}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">Combine indices with individual stocks. Duplicates are removed automatically.</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button onClick={runScreener} disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isPending ? 'Scanning...' : 'Run Screener'}</button>
            <button onClick={clearAll} className="ml-3 px-4 py-2 border rounded-lg hover:bg-gray-50">Clear All</button>
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


