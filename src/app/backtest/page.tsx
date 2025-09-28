'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBacktest } from '@/hooks/useBacktest'
import { useStockSearch } from '@/hooks/useStockSearch'
import { useDebounce } from 'use-debounce'
import { Search, X, TrendingUp, TrendingDown, BarChart3, Calendar, Target } from 'lucide-react'
import type { BacktestStrategy } from '@/app/api/backtest/route'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const STRATEGIES: Array<{ value: BacktestStrategy; label: string; description: string }> = [
  {
    value: 'pivot-reversal',
    label: 'Pivot Reversal',
    description: 'Buy near S1/S2 support with RSI < 35 and bullish candle'
  },
  {
    value: 'ema-crossover',
    label: 'EMA Crossover',
    description: 'Buy when price > EMA20 > EMA50 with MACD confirmation'
  },
  {
    value: 'rsi-bounce',
    label: 'RSI Bounce',
    description: 'Buy on RSI bounce from oversold (< 30) above EMA20'
  }
]

export default function BacktestPage() {
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  
  // Form state
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [fromDate, setFromDate] = useState('2024-01-01')
  const [toDate, setToDate] = useState('2024-12-31')
  const [strategy, setStrategy] = useState<BacktestStrategy>('pivot-reversal')
  const [riskPerTrade, setRiskPerTrade] = useState(2)
  const [autoRunExecuted, setAutoRunExecuted] = useState(false)
  
  const [debouncedQuery] = useDebounce(searchQuery, 300)
  
  // Hooks
  const { mutateAsync: runBacktest, data: backtestData, isPending, error, reset } = useBacktest()
  const { data: searchResults, isLoading: isSearchLoading } = useStockSearch(
    debouncedQuery, 
    debouncedQuery.length >= 2
  )
  
  const handleRunBacktest = useCallback(async () => {
    if (!selectedSymbol) return
    
    try {
      await runBacktest({
        symbol: selectedSymbol,
        from: fromDate,
        to: toDate,
        strategy,
        riskPerTrade
      })
    } catch (err) {
      console.error('Backtest failed:', err)
    }
  }, [selectedSymbol, fromDate, toDate, strategy, riskPerTrade, runBacktest])
  
  // Handle query parameters and auto-run
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const symbolParam = urlParams.get('symbol')
    const strategyParam = urlParams.get('strategy') as BacktestStrategy
    const fromParam = urlParams.get('from')
    const toParam = urlParams.get('to')
    const autoRunParam = urlParams.get('autoRun')
    
    if (symbolParam) setSelectedSymbol(symbolParam)
    if (strategyParam && STRATEGIES.find(s => s.value === strategyParam)) setStrategy(strategyParam)
    if (fromParam) setFromDate(fromParam)
    if (toParam) setToDate(toParam)
    
    // Auto-run backtest if requested and not already executed
    if (autoRunParam === 'true' && symbolParam && !autoRunExecuted) {
      setAutoRunExecuted(true)
      // Small delay to ensure state is set
      setTimeout(() => {
        handleRunBacktest()
      }, 100)
    }
  }, [autoRunExecuted, handleRunBacktest])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Show dropdown when there are search results
  useEffect(() => {
    if (debouncedQuery.length >= 2 && searchResults && searchResults.length > 0) {
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }, [debouncedQuery, searchResults])
  
  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol)
    setSearchQuery('')
    setShowDropdown(false)
  }
  
  const clearSymbol = () => {
    setSelectedSymbol('')
    setSearchQuery('')
    setShowDropdown(false)
  }
  
  const clearResults = () => {
    reset()
  }
  
  const formatNumber = (num: number, decimals: number = 2) => num.toFixed(decimals)
  const formatPercentage = (num: number) => `${num >= 0 ? '+' : ''}${formatNumber(num, 2)}%`
  const formatCurrency = (num: number) => `₹${formatNumber(num, 2)}`
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Long-Only Swing Trade Backtest</h1>
            <p className="text-gray-600 mt-1">Test swing trading strategies on historical data</p>
          </div>
          <button 
            onClick={() => router.push('/')} 
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Home
          </button>
        </div>
        
        {/* Configuration Section */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Backtest Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Symbol Selector */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Symbol
              </label>
              <div className="relative" ref={searchRef}>
                {selectedSymbol ? (
                  <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg bg-blue-50">
                    <span className="font-medium text-blue-900">{selectedSymbol}</span>
                    <button
                      onClick={clearSymbol}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search stocks... (e.g., RELIANCE)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (debouncedQuery.length >= 2 && searchResults && searchResults.length > 0) {
                            setShowDropdown(true)
                          }
                        }}
                        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      {isSearchLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <LoadingSpinner size="sm" />
                        </div>
                      )}
                    </div>
                    
                    {/* Search Dropdown */}
                    {showDropdown && searchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                        {searchResults.slice(0, 8).map((stock) => (
                          <button
                            key={`${stock.exchange}:${stock.symbol}`}
                            onClick={() => handleSymbolSelect(stock.symbol)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium text-gray-900">{stock.symbol}</div>
                              <div className="text-xs text-gray-600 truncate">{stock.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                ₹{stock.ltp.toFixed(2)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Strategy Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trading Strategy
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as BacktestStrategy)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STRATEGIES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {STRATEGIES.find(s => s.value === strategy)?.description}
              </p>
            </div>
            
            {/* Risk Per Trade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(parseFloat(e.target.value))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage of account risked per trade
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={handleRunBacktest}
              disabled={!selectedSymbol || isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
            >
              {isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Running Backtest...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  <span>Run Backtest</span>
                </>
              )}
            </button>
            
            {backtestData && (
              <button
                onClick={clearResults}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Clear Results
              </button>
            )}
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error.message}</p>
          </div>
        )}
        
        {/* Results Section */}
        {backtestData && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Win Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(backtestData.metrics.winRate, 1)}%
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Avg Return</span>
                </div>
                <div className={`text-2xl font-bold ${backtestData.metrics.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(backtestData.metrics.avgReturn)}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Profit Factor</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(backtestData.metrics.profitFactor, 2)}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-600">Max Drawdown</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  -{formatNumber(backtestData.metrics.maxDrawdown, 1)}%
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Total Trades</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {backtestData.metrics.totalTrades}
                </div>
              </div>
            </div>
            
            {/* Trades Table */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Trade History ({backtestData.trades.length} trades)
                </h2>
                <div className="text-sm text-gray-600">
                  {backtestData.symbol} • {backtestData.strategy} • {backtestData.period.from} to {backtestData.period.to}
                </div>
              </div>
              
              {backtestData.trades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No trades found for the selected criteria.</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your date range or strategy.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                        <th className="p-3 font-medium">Date</th>
                        <th className="p-3 font-medium">Entry</th>
                        <th className="p-3 font-medium">Stop Loss</th>
                        <th className="p-3 font-medium">Target</th>
                        <th className="p-3 font-medium">Exit</th>
                        <th className="p-3 font-medium">P&L %</th>
                        <th className="p-3 font-medium">R:R</th>
                        <th className="p-3 font-medium">Days</th>
                        <th className="p-3 font-medium">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtestData.trades.map((trade, index) => (
                        <tr 
                          key={index} 
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            trade.outcome === 'WIN' ? 'bg-green-50' : 'bg-red-50'
                          }`}
                        >
                          <td className="p-3 text-sm">{trade.date}</td>
                          <td className="p-3 text-sm font-medium">{formatCurrency(trade.entry)}</td>
                          <td className="p-3 text-sm text-red-600">{formatCurrency(trade.stopLoss)}</td>
                          <td className="p-3 text-sm text-green-600">{formatCurrency(trade.target)}</td>
                          <td className="p-3 text-sm font-medium">{formatCurrency(trade.exit)}</td>
                          <td className={`p-3 text-sm font-bold ${
                            trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(trade.pnl)}
                          </td>
                          <td className="p-3 text-sm">{formatNumber(trade.rr, 2)}</td>
                          <td className="p-3 text-sm">{trade.holdingDays}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              trade.outcome === 'WIN' 
                                ? 'text-green-700 bg-green-100' 
                                : 'text-red-700 bg-red-100'
                            }`}>
                              {trade.outcome}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How Swing Trade Backtesting Works</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>Entry Signals:</strong> Based on technical confluence (pivots, RSI, EMA, MACD)</p>
            <p>• <strong>Risk Management:</strong> Stop loss set below signal candle low with buffer</p>
            <p>• <strong>Profit Targets:</strong> Weekly pivot points (PP, R1) based on strategy</p>
            <p>• <strong>Max Holding:</strong> Trades automatically exit after 21 days if targets not hit</p>
            <p>• <strong>No Overlaps:</strong> New trades only after 5-day gap from previous trade</p>
          </div>
        </div>
      </div>
    </div>
  )
}
