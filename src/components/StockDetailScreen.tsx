'use client'

import { useState } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, Calculator, FileText } from 'lucide-react'
import { Stock, type Timeframe } from '@/lib/api'
import { useStockIntraday } from '@/hooks/useStockIntraday'
import { useStockFundamentals } from '@/hooks/useStockFundamentals'
import { useStockIndicators } from '@/hooks/useStockIndicators'
import Tabs, { type TabItem } from '@/components/tabs/Tabs'
import StockChart, { TimeframeSelector } from '@/components/charts/StockChart'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { formatIndicatorValue, getRSIInterpretation, getSignalColor } from '@/lib/indicators'
import { useStockSignals } from '@/hooks/useStockSignals'

interface StockDetailScreenProps {
  stock: Stock
  onBack: () => void
}

export default function StockDetailScreen({ stock, onBack }: StockDetailScreenProps) {
  const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>('1D')
  
  // Fetch data using hooks
  const { data: chartData, isLoading: chartLoading, error: chartError, refetch: refetchChart } = useStockIntraday(stock.symbol, currentTimeframe)
  const { data: fundamentals, isLoading: fundamentalsLoading, error: fundamentalsError, refetch: refetchFundamentals } = useStockFundamentals(stock.symbol)
  const indicators = useStockIndicators(chartData || [])
  const { data: signalsData, isLoading: signalsLoading, error: signalsError, refetch: refetchSignals } = useStockSignals(stock.symbol)

  // Utility functions
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals)
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num)
  }

  const formatLargeNumber = (num: number) => {
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Cr`
    }
    return `₹${num.toLocaleString('en-IN')}`
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-5 h-5" />
    if (change < 0) return <TrendingDown className="w-5 h-5" />
    return null
  }

  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Current Price Section */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Price</h3>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {formatCurrency(stock.ltp)}
            </div>
            <div className={`flex items-center space-x-2 ${getChangeColor(stock.change)}`}>
              {getChangeIcon(stock.change)}
              <span className="text-lg font-medium">
                {stock.change >= 0 ? '+' : ''}{formatCurrency(stock.change)}
              </span>
              <span className="text-lg font-medium">
                ({stock.changePercent >= 0 ? '+' : ''}{formatNumber(stock.changePercent)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stock.marketCap && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Market Cap</h4>
            <p className="text-2xl font-bold text-gray-900">
              {formatLargeNumber(stock.marketCap)}
            </p>
          </div>
        )}

        {stock.volume && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Volume</h4>
            <p className="text-2xl font-bold text-gray-900">
              {stock.volume.toLocaleString('en-IN')}
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Exchange</h4>
          <p className="text-2xl font-bold text-gray-900">{stock.exchange}</p>
        </div>
      </div>
    </div>
  )

  const ChartTab = () => (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Price Chart</h3>
        <TimeframeSelector
          currentTimeframe={currentTimeframe}
          onTimeframeChange={setCurrentTimeframe}
          loading={chartLoading}
        />
      </div>

      {/* Chart */}
      <StockChart
        symbol={stock.symbol}
        timeframe={currentTimeframe}
        data={chartData || []}
        loading={chartLoading}
        error={chartError?.message || null}
        onRetry={refetchChart}
      />
    </div>
  )

  const FundamentalsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Fundamental Analysis</h3>
      
      {fundamentalsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse bg-white rounded-xl shadow-md p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : fundamentalsError ? (
        <ErrorMessage
          message="Failed to load fundamental data"
          onRetry={refetchFundamentals}
        />
      ) : fundamentals ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Market Cap</h4>
            <p className="text-2xl font-bold text-gray-900">
              ₹{(fundamentals.marketCap / 100000).toFixed(2)} Cr
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">P/E Ratio</h4>
            <p className="text-2xl font-bold text-gray-900">
              {fundamentals.peRatio ? fundamentals.peRatio.toFixed(2) : 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">EPS</h4>
            <p className="text-2xl font-bold text-gray-900">
              {fundamentals.eps ? `₹${fundamentals.eps.toFixed(2)}` : 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">52W High</h4>
            <p className="text-2xl font-bold text-green-600">
              ₹{fundamentals.week52High.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">52W Low</h4>
            <p className="text-2xl font-bold text-red-600">
              ₹{fundamentals.week52Low.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Sector</h4>
            <p className="text-2xl font-bold text-gray-900">
              {fundamentals.sector}
            </p>
          </div>

          {fundamentals.dividendYield && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Dividend Yield</h4>
              <p className="text-2xl font-bold text-gray-900">
                {fundamentals.dividendYield.toFixed(2)}%
              </p>
            </div>
          )}

          {fundamentals.pbRatio && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-600 mb-2">P/B Ratio</h4>
              <p className="text-2xl font-bold text-gray-900">
                {fundamentals.pbRatio.toFixed(2)}
              </p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Volume</h4>
            <p className="text-2xl font-bold text-gray-900">
              {fundamentals.volume.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No fundamental data available</p>
        </div>
      )}
    </div>
  )

  const TechnicalsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Technical Analysis</h3>
      
      {chartLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse bg-white rounded-xl shadow-md p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : !indicators.hasData ? (
        <div className="text-center py-12">
          <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No chart data available for technical analysis</p>
          <p className="text-sm text-gray-500 mt-2">
            Switch to the Chart tab to load price data first
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Indicators Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-600 mb-2">RSI (14)</h4>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {formatIndicatorValue(indicators.currentValues.rsi14)}
              </p>
              <p className={`text-sm font-medium ${
                indicators.currentValues.rsi14 && indicators.currentValues.rsi14 >= 70 ? 'text-red-600' :
                indicators.currentValues.rsi14 && indicators.currentValues.rsi14 <= 30 ? 'text-green-600' :
                'text-gray-600'
              }`}>
                {getRSIInterpretation(indicators.currentValues.rsi14)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-600 mb-2">SMA (20)</h4>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                ₹{formatIndicatorValue(indicators.currentValues.sma20)}
              </p>
              <p className="text-sm text-gray-600">Simple Moving Average</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-600 mb-2">EMA (50)</h4>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                ₹{formatIndicatorValue(indicators.currentValues.ema50)}
              </p>
              <p className="text-sm text-gray-600">Exponential Moving Average</p>
            </div>
          </div>

          {/* Crossover Signal */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Moving Average Signal</h4>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-full font-medium ${getSignalColor(indicators.crossoverSignal)} bg-opacity-10`}>
                <span className={`${getSignalColor(indicators.crossoverSignal)}`}>
                  {indicators.crossoverSignal}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {indicators.crossoverSignal === 'BULLISH' && 'SMA(20) is above EMA(50) - Potential upward trend'}
                {indicators.crossoverSignal === 'BEARISH' && 'SMA(20) is below EMA(50) - Potential downward trend'}
                {indicators.crossoverSignal === 'NEUTRAL' && 'No clear trend signal from moving averages'}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Disclaimer:</strong> Technical indicators are based on historical price data and should not be considered as investment advice. 
              Always conduct your own research and consult with financial advisors before making investment decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const SignalsTab = () => {
    type SignalFilter = 'ALL' | 'RSI' | 'EMA' | 'MACD' | 'BOLLINGER' | 'ATR'
    const [filter, setFilter] = useState<SignalFilter>('ALL')
    const all = signalsData?.signals || []
    const list = filter === 'ALL' ? all : all.filter(s => s.indicator === filter)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Signals</h3>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as SignalFilter)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All</option>
              <option value="RSI">RSI</option>
              <option value="EMA">EMA</option>
              <option value="MACD">MACD</option>
              <option value="BOLLINGER">Bollinger</option>
              <option value="ATR">ATR</option>
            </select>
            <button onClick={() => refetchSignals()} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">Refresh</button>
          </div>
        </div>

        {signalsLoading ? (
          <div className="text-gray-600">Loading signals...</div>
        ) : signalsError ? (
          <ErrorMessage message="Failed to load signals" onRetry={refetchSignals} />
        ) : list.length === 0 ? (
          <div className="text-gray-600">No active signals</div>
        ) : (
          <div className="space-y-3">
            {list.map((s, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-md p-4 border border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.type}</span>
                    <span className="text-sm font-medium text-gray-700">{s.indicator}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${s.strength === 'strong' ? 'bg-purple-100 text-purple-700' : s.strength === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{s.strength}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{s.reason}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Define tabs
  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: <OverviewTab />
    },
    {
      id: 'chart',
      label: 'Chart',
      content: <ChartTab />
    },
    {
      id: 'fundamentals',
      label: 'Fundamentals',
      content: <FundamentalsTab />
    },
    {
      id: 'technicals',
      label: 'Technicals',
      content: <TechnicalsTab />
    },
    {
      id: 'signals',
      label: 'Signals',
      content: <SignalsTab />
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 mr-4"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{stock.symbol}</h1>
              <p className="text-sm text-gray-600">{stock.exchange}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stock Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{stock.name}</h2>
            <p className="text-sm text-gray-600">{stock.exchange}:{stock.symbol}</p>
          </div>

          {/* Price Information */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {formatCurrency(stock.ltp)}
              </div>
              <div className={`flex items-center space-x-2 ${getChangeColor(stock.change)}`}>
                {getChangeIcon(stock.change)}
                <span className="text-lg font-medium">
                  {stock.change >= 0 ? '+' : ''}{formatCurrency(stock.change)}
                </span>
                <span className="text-lg font-medium">
                  ({stock.changePercent >= 0 ? '+' : ''}{formatNumber(stock.changePercent)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs tabs={tabs} defaultTab="overview" />
      </main>
    </div>
  )
}
