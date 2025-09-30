'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePivotScreener } from '@/hooks/usePivotScreener'
import { type IndexCode } from '@/lib/index-constituents'
import type { PivotLevel, PivotScreenerFilters } from '@/app/api/pivotscreener/route'
import { BarChart3, Info } from 'lucide-react'
import type { StrategyName } from '@/lib/strategies'
import { getStrategyDisplayName } from '@/lib/strategies'

const PIVOT_LEVELS: { value: PivotLevel, label: string, description: string }[] = [
  { value: 'PP', label: 'Pivot Point (PP)', description: 'Central pivot level' },
  { value: 'S1', label: 'Support 1 (S1)', description: 'First support level' },
  { value: 'R1', label: 'Resistance 1 (R1)', description: 'First resistance level' },
]

const STRATEGIES: { value: StrategyName, label: string, description: string }[] = [
  { 
    value: 'support-bounce', 
    label: 'Support Bounce', 
    description: 'Daily uptrend + 4H price testing S1-S2 + 1H RSI cross > 40' 
  },
  { 
    value: 'breakout-retest', 
    label: 'Breakout & Retest', 
    description: 'Daily > EMA50 + 4H R1 breakout retest + 1H MACD bullish' 
  },
  { 
    value: 'golden-cross', 
    label: 'Golden Cross', 
    description: 'Daily golden cross + 4H pullback to S1/S2 + 1H RSI > 50' 
  },
  { 
    value: 'camarilla-reversal', 
    label: 'Camarilla Reversal', 
    description: 'Daily MACD divergence + 4H S3 touch & reversal' 
  },
  { 
    value: 'triple-confluence', 
    label: 'Triple Confluence', 
    description: 'Daily EMA uptrend + 4H S1/S2 test + 1H RSI & MACD bullish' 
  },
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
    strategies: [],
  })
  
  const { mutateAsync, data, isPending, reset } = usePivotScreener()

  const runScreener = async () => {
    await mutateAsync(filters)
  }

  const clearFilters = () => {
    setFilters({
      universe: 'NIFTY50',
      strategies: [],
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

  const toggleStrategy = (strategy: StrategyName) => {
    setFilters(prev => {
      const strategies = prev.strategies || []
      const hasStrategy = strategies.includes(strategy)
      return {
        ...prev,
        strategies: hasStrategy 
          ? strategies.filter(s => s !== strategy)
          : [...strategies, strategy]
      }
    })
  }

  const formatPrice = (price: number) => `₹${price.toFixed(2)}`
  
  const formatPercentage = (percentage: number) => `${percentage.toFixed(2)}%`

  // Map new strategies to existing backtest strategies
  const mapToBacktestStrategy = (strategy?: StrategyName): string => {
    if (!strategy) return 'pivot-reversal'
    
    const strategyMap: Record<StrategyName, string> = {
      'support-bounce': 'pivot-reversal',
      'breakout-retest': 'ema-crossover',
      'golden-cross': 'ema-crossover',
      'camarilla-reversal': 'pivot-reversal',
      'triple-confluence': 'rsi-bounce'
    }
    
    return strategyMap[strategy] || 'pivot-reversal'
  }

  const handleBacktest = (symbol: string, strategy?: StrategyName) => {
    // Map to existing backtest strategy
    const backtestStrategy = mapToBacktestStrategy(strategy)
    
    // Navigate to backtest page with pre-filled parameters
    const params = new URLSearchParams({
      symbol,
      strategy: backtestStrategy,
      from: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
      to: new Date().toISOString().split('T')[0], // today
      autoRun: 'true'
    })
    
    router.push(`/backtest?${params.toString()}`)
  }

  const getPivotLevelColor = (level: PivotLevel) => {
    switch (level) {
      case 'R1': return 'text-red-600 bg-red-50'
      case 'PP': return 'text-blue-600 bg-blue-50'
      case 'S1': return 'text-green-600 bg-green-50'
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-700 bg-green-100'
    if (confidence >= 60) return 'text-blue-700 bg-blue-100'
    if (confidence >= 40) return 'text-yellow-700 bg-yellow-100'
    return 'text-gray-700 bg-gray-100'
  }

  const useStrategies = (filters.strategies?.length || 0) > 0
  const useLegacyMode = !useStrategies

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pivot Point Screener</h1>
            <p className="text-gray-600 mt-1">Find stocks with high-probability long setups using pivot strategies</p>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Legacy Pivot Level Selection (only if no strategies selected) */}
            {useLegacyMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proximity to Level (Legacy Mode)
                </label>
                <select
                  value={filters.proximity || 'PP'}
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
            )}
          </div>

          {/* Strategies Section */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-gray-700">Long-Only Strategies</h3>
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="hidden group-hover:block absolute left-0 top-6 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 z-10">
                  Select one or more strategies to scan for high-probability long entries. 
                  Each strategy combines multi-timeframe analysis with pivot points.
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {STRATEGIES.map(strategy => (
                <label 
                  key={strategy.value}
                  className="flex items-start space-x-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.strategies?.includes(strategy.value) || false}
                    onChange={() => toggleStrategy(strategy.value)}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{strategy.label}</span>
                    <div className="group relative inline-block ml-1">
                      <Info className="inline w-3 h-3 text-gray-400 cursor-help" />
                      <div className="hidden group-hover:block absolute left-0 top-5 w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                        {strategy.description}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{strategy.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {useStrategies && (
              <p className="text-xs text-blue-600 mt-2">
                ✓ {filters.strategies?.length} {filters.strategies?.length === 1 ? 'strategy' : 'strategies'} selected
              </p>
            )}
          </div>

          {/* Advanced Filters (only in legacy mode) */}
          {useLegacyMode && (
            <>
              {/* Volume Filter */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Volume
                </label>
                <input
                  type="number"
                  value={filters.volumeMin || ''}
                  onChange={(e) => updateFilter('volumeMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 500000"
                  className="w-full md:w-1/3 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
            </>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={runScreener}
              disabled={isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isPending ? 'Scanning...' : useStrategies ? 'Run Strategy Scan' : 'Run Pivot Screener'}
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
                {useStrategies ? 'Strategy Signals' : 'Pivot Screener Results'} ({data.results.length})
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
                        {useStrategies ? (
                          <>
                            <th className="p-3 font-medium">Matched Strategies</th>
                            <th className="p-3 font-medium">Confidence</th>
                          </>
                        ) : (
                          <>
                            <th className="p-3 font-medium">Pivot Level</th>
                            <th className="p-3 font-medium">Distance</th>
                            <th className="p-3 font-medium">RSI</th>
                            <th className="p-3 font-medium">MACD</th>
                            <th className="p-3 font-medium">EMA Trend</th>
                            <th className="p-3 font-medium">Setup</th>
                          </>
                        )}
                        <th className="p-3 font-medium">Backtest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.map(row => (
                        <tr 
                          key={row.symbol} 
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <button
                              onClick={() => router.push(`/stock/${row.symbol}`)}
                              className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                            >
                              {row.symbol}
                            </button>
                          </td>
                          <td className="p-3">
                            <span className="font-medium">{formatPrice(row.price)}</span>
                          </td>
                          {useStrategies ? (
                            <>
                              <td className="p-3">
                                <div className="space-y-1">
                                  {row.matchedStrategies?.slice(0, 2).map((strategy, idx) => (
                                    <div key={idx} className="text-xs">
                                      <span className="font-medium text-gray-900">
                                        {getStrategyDisplayName(strategy.strategy)}
                                      </span>
                                      <span className="text-gray-500 ml-1">
                                        ({strategy.confidence}%)
                                      </span>
                                    </div>
                                  ))}
                                  {(row.matchedStrategies?.length || 0) > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{(row.matchedStrategies?.length || 0) - 2} more
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`text-sm px-2 py-1 rounded font-semibold ${getConfidenceColor(row.confidence || 0)}`}>
                                  {row.confidence?.toFixed(0)}%
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                          <td className="p-3">
                            <button
                              onClick={() => handleBacktest(
                                row.symbol, 
                                row.matchedStrategies?.[0]?.strategy
                              )}
                              className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors duration-200"
                              title={`Backtest ${row.symbol} strategy`}
                            >
                              <BarChart3 className="w-3 h-3" />
                              <span>Test</span>
                            </button>
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
          <h3 className="text-sm font-medium text-blue-900 mb-2">How This Screener Works</h3>
          <div className="text-sm text-blue-800 space-y-1">
            {useStrategies ? (
              <>
                <p>• <strong>Multi-Timeframe Analysis:</strong> Strategies combine daily trends, 4-hour pivot tests, and 1-hour entry triggers</p>
                <p>• <strong>Long-Only Focus:</strong> All strategies are designed for bullish setups at support levels</p>
                <p>• <strong>Confidence Scoring:</strong> Each signal comes with a confidence score based on condition strength</p>
                <p>• <strong>Backtest Ready:</strong> Click &quot;Test&quot; to immediately backtest the strategy on historical data</p>
              </>
            ) : (
              <>
                <p>• <strong>Pivot Points:</strong> Calculated from last week&apos;s High, Low, and Close prices</p>
                <p>• <strong>Support Levels (S1):</strong> Potential buying opportunities with bullish confluence</p>
                <p>• <strong>Resistance Levels (R1):</strong> Potential selling opportunities with bearish confluence</p>
                <p>• <strong>Confluence:</strong> Additional indicators (RSI, MACD, EMA) that support the pivot signal</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}