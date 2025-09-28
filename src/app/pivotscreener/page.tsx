'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePivotScreener } from '@/hooks/usePivotScreener'
import { type IndexCode } from '@/lib/index-constituents'
import type { PivotLevel, PivotScreenerFilters } from '@/app/api/pivotscreener/route'

const PIVOT_LEVELS: { value: PivotLevel, label: string, description: string }[] = [
  { value: 'PP', label: 'Pivot Point (PP)', description: 'Central pivot level' },
  { value: 'S1', label: 'Support 1 (S1)', description: 'First support level' },
  { value: 'S2', label: 'Support 2 (S2)', description: 'Second support level' },
  { value: 'R1', label: 'Resistance 1 (R1)', description: 'First resistance level' },
  { value: 'R2', label: 'Resistance 2 (R2)', description: 'Second resistance level' },
]

const UNIVERSES: { value: IndexCode, label: string }[] = [
  { value: 'NIFTY50', label: 'NIFTY 50' },
  { value: 'NIFTY100', label: 'NIFTY 100' },
  { value: 'NIFTY500', label: 'NIFTY 500' },
  { value: 'MIDCAP', label: 'MIDCAP' },
  { value: 'SMALLCAP', label: 'SMALLCAP' },
]

export default function PivotScreenerPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<PivotScreenerFilters>({
    universe: 'NIFTY50',
    proximity: 'PP',
  })
  
  const { mutateAsync, data, isPending, reset } = usePivotScreener()

  const runScreener = async () => {
    await mutateAsync(filters)
  }

  const clearFilters = () => {
    setFilters({
      universe: 'NIFTY50',
      proximity: 'PP',
    })
    reset()
  }

  const updateFilter = <K extends keyof PivotScreenerFilters>(
    key: K,
    value: PivotScreenerFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleBooleanFilter = (key: keyof PivotScreenerFilters) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] ? undefined : true
    }))
  }

  const formatPrice = (price: number) => `₹${price.toFixed(2)}`
  
  const formatPercentage = (percentage: number) => `${percentage.toFixed(2)}%`

  const getPivotLevelColor = (level: PivotLevel) => {
    switch (level) {
      case 'R2': return 'text-red-700 bg-red-50'
      case 'R1': return 'text-red-600 bg-red-50'
      case 'PP': return 'text-blue-600 bg-blue-50'
      case 'S1': return 'text-green-600 bg-green-50'
      case 'S2': return 'text-green-700 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSetupColor = (setup: string) => {
    switch (setup) {
      case 'BULLISH': return 'text-green-700 bg-green-100'
      case 'BEARISH': return 'text-red-700 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pivot Point Screener</h1>
            <p className="text-gray-600 mt-1">Find stocks near key pivot levels with confluence signals</p>
          </div>
          <button 
            onClick={() => router.push('/')} 
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Home
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Screening Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Universe Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Universe
              </label>
              <select
                value={filters.universe}
                onChange={(e) => updateFilter('universe', e.target.value as IndexCode)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {UNIVERSES.map(universe => (
                  <option key={universe.value} value={universe.value}>
                    {universe.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pivot Level Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proximity to Level
              </label>
              <select
                value={filters.proximity}
                onChange={(e) => updateFilter('proximity', e.target.value as PivotLevel)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PIVOT_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {PIVOT_LEVELS.find(l => l.value === filters.proximity)?.description}
              </p>
            </div>

            {/* Volume Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Volume
              </label>
              <input
                type="number"
                value={filters.volumeMin || ''}
                onChange={(e) => updateFilter('volumeMin', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g. 500000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* RSI Filters */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">RSI Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">RSI Below (Oversold)</label>
                <input
                  type="number"
                  value={filters.rsiBelow || ''}
                  onChange={(e) => updateFilter('rsiBelow', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 35"
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">RSI Above (Overbought)</label>
                <input
                  type="number"
                  value={filters.rsiAbove || ''}
                  onChange={(e) => updateFilter('rsiAbove', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 65"
                  min="0"
                  max="100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Confluence Filters */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Confluence Signals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!filters.macdBullish}
                  onChange={() => toggleBooleanFilter('macdBullish')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">MACD Bullish</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!filters.macdBearish}
                  onChange={() => toggleBooleanFilter('macdBearish')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">MACD Bearish</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!filters.emaTrendUp}
                  onChange={() => toggleBooleanFilter('emaTrendUp')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">EMA Trend Up</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!filters.emaTrendDown}
                  onChange={() => toggleBooleanFilter('emaTrendDown')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">EMA Trend Down</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={runScreener}
              disabled={isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isPending ? 'Scanning...' : 'Run Pivot Screener'}
            </button>
            <button
              onClick={clearFilters}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results Section */}
        {data?.results && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Pivot Screener Results ({data.results.length})
              </h2>
              {data.cached && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Cached
                </span>
              )}
            </div>

            {data.results.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No stocks found matching the selected criteria.</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters and run the screener again.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                      <th className="p-3 font-medium">Symbol</th>
                      <th className="p-3 font-medium">Price</th>
                      <th className="p-3 font-medium">Pivot Level</th>
                      <th className="p-3 font-medium">Distance</th>
                      <th className="p-3 font-medium">RSI</th>
                      <th className="p-3 font-medium">MACD</th>
                      <th className="p-3 font-medium">EMA Trend</th>
                      <th className="p-3 font-medium">Setup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map(row => (
                      <tr 
                        key={row.symbol} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/stock/${row.symbol}`)}
                      >
                        <td className="p-3">
                          <span className="font-semibold text-gray-900">{row.symbol}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{formatPrice(row.price)}</span>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPivotLevelColor(row.proximity.level)}`}>
                            {row.proximity.level}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div className="font-medium">{formatPercentage(row.proximity.percentage)}</div>
                            <div className="text-xs text-gray-500">
                              {formatPrice(row.proximity.distance)}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {row.indicators.rsi ? (
                            <span className={`text-sm font-medium ${
                              row.indicators.rsi < 30 ? 'text-green-600' : 
                              row.indicators.rsi > 70 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {row.indicators.rsi.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            row.indicators.macdSignal === 'BULLISH' ? 'text-green-700 bg-green-100' :
                            row.indicators.macdSignal === 'BEARISH' ? 'text-red-700 bg-red-100' :
                            'text-gray-600 bg-gray-100'
                          }`}>
                            {row.indicators.macdSignal}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            row.indicators.emaSignal === 'UP' ? 'text-green-700 bg-green-100' :
                            row.indicators.emaSignal === 'DOWN' ? 'text-red-700 bg-red-100' :
                            'text-gray-600 bg-gray-100'
                          }`}>
                            {row.indicators.emaSignal}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSetupColor(row.matchedSetup)}`}>
                            {row.matchedSetup}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How Pivot Point Screening Works</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>Pivot Points:</strong> Calculated from last week&apos;s High, Low, and Close prices</p>
            <p>• <strong>Support Levels (S1, S2):</strong> Potential buying opportunities with bullish confluence</p>
            <p>• <strong>Resistance Levels (R1, R2):</strong> Potential selling opportunities with bearish confluence</p>
            <p>• <strong>Confluence:</strong> Additional indicators (RSI, MACD, EMA) that support the pivot signal</p>
          </div>
        </div>
      </div>
    </div>
  )
}
