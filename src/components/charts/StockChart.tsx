'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format } from 'date-fns'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y'

export interface ChartDataPoint {
  time: string | Date
  price: number
  volume?: number
}

interface StockChartProps {
  symbol: string
  timeframe: Timeframe
  data: ChartDataPoint[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  className?: string
}

const timeframeLabels: Record<Timeframe, string> = {
  '1D': '1 Day',
  '1W': '1 Week', 
  '1M': '1 Month',
  '3M': '3 Months',
  '1Y': '1 Year'
}

export default function StockChart({ 
  symbol, 
  timeframe, 
  data, 
  loading = false, 
  error = null,
  onRetry,
  className = '' 
}: StockChartProps) {
  
  // Format data for Recharts
  const chartData = data.map(point => ({
    ...point,
    time: typeof point.time === 'string' ? point.time : point.time.toISOString(),
    formattedTime: formatTimeForDisplay(point.time, timeframe)
  }))

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (active && payload && payload.length) {
      const price = payload[0].value
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-lg font-semibold text-gray-900">
            ₹{price.toFixed(2)}
          </p>
        </div>
      )
    }
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading {timeframeLabels[timeframe]} chart...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <ErrorMessage
          message={`Failed to load chart data: ${error}`}
          onRetry={onRetry}
          className="h-80"
        />
      </div>
    )
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="text-4xl mb-4">📈</div>
            <p className="text-gray-600">No chart data available</p>
            <p className="text-sm text-gray-500 mt-2">
              Chart data for {symbol} ({timeframeLabels[timeframe]}) is not available
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Determine if we should show area chart (for 1D) or line chart (for longer periods)
  const useAreaChart = timeframe === '1D'
  const strokeColor = getStrokeColor(chartData)
  const fillColor = strokeColor === '#10b981' ? '#10b98120' : '#ef444420'

  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      {/* Chart Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {symbol} - {timeframeLabels[timeframe]} Chart
        </h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>{data.length} data points</span>
          <span>•</span>
          <span>
            {formatTimeForDisplay(data[0]?.time, timeframe)} - {formatTimeForDisplay(data[data.length - 1]?.time, timeframe)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {useAreaChart ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedTime"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                tickFormatter={(value) => `₹${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={strokeColor}
                strokeWidth={2}
                fill={fillColor}
                fillOpacity={0.1}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedTime"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e0e0e0' }}
                tickFormatter={(value) => `₹${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={strokeColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, stroke: strokeColor, strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Footer */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Data refreshed every {timeframe === '1D' ? '1 minute' : '15 minutes'} • 
        Prices in Indian Rupees (₹)
      </div>
    </div>
  )
}

// Utility functions
function formatTimeForDisplay(time: string | Date, timeframe: Timeframe): string {
  const date = typeof time === 'string' ? new Date(time) : time
  
  switch (timeframe) {
    case '1D':
      return format(date, 'HH:mm')
    case '1W':
      return format(date, 'EEE')
    case '1M':
      return format(date, 'dd/MM')
    case '3M':
    case '1Y':
      return format(date, 'MMM yy')
    default:
      return format(date, 'dd/MM')
  }
}

function getStrokeColor(data: { price: number }[]): string {
  if (data.length < 2) return '#6b7280' // gray
  
  const firstPrice = data[0].price
  const lastPrice = data[data.length - 1].price
  
  return lastPrice >= firstPrice ? '#10b981' : '#ef4444' // green or red
}

// Timeframe selector component
interface TimeframeSelectorProps {
  currentTimeframe: Timeframe
  onTimeframeChange: (timeframe: Timeframe) => void
  loading?: boolean
}

export function TimeframeSelector({ 
  currentTimeframe, 
  onTimeframeChange, 
  loading = false 
}: TimeframeSelectorProps) {
  const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']
  
  return (
    <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
      {timeframes.map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => onTimeframeChange(timeframe)}
          disabled={loading}
          className={`
            px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50
            ${
              currentTimeframe === timeframe
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }
          `}
        >
          {timeframe}
        </button>
      ))}
    </div>
  )
}
