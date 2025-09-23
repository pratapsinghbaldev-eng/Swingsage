import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import StockChart, { TimeframeSelector, type Timeframe } from '../charts/StockChart'
import { type ChartDataPoint } from '@/lib/api'

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  format: (date: Date, formatString: string) => {
    if (formatString === 'HH:mm') return '10:30'
    if (formatString === 'EEE') return 'Mon'
    if (formatString === 'dd/MM') return '01/01'
    if (formatString === 'MMM yy') return 'Jan 24'
    return '01/01'
  }
}))

const mockChartData: ChartDataPoint[] = [
  { time: '2024-01-01T10:00:00Z', price: 100 },
  { time: '2024-01-01T10:05:00Z', price: 102 },
  { time: '2024-01-01T10:10:00Z', price: 98 },
  { time: '2024-01-01T10:15:00Z', price: 105 },
]

describe('StockChart', () => {
  const defaultProps = {
    symbol: 'RELIANCE',
    timeframe: '1D' as Timeframe,
    data: mockChartData,
    loading: false,
    error: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render chart with data', () => {
    render(<StockChart {...defaultProps} />)
    
    expect(screen.getByText('RELIANCE - 1 Day Chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument() // 1D uses area chart
  })

  it('should use line chart for non-1D timeframes', () => {
    render(<StockChart {...defaultProps} timeframe="1W" />)
    
    expect(screen.getByText('RELIANCE - 1 Week Chart')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<StockChart {...defaultProps} loading={true} />)
    
    expect(screen.getByText('Loading 1 Day chart...')).toBeInTheDocument()
    expect(screen.getByText('Loading 1 Day chart...')).toBeInTheDocument()
  })

  it('should show error state', () => {
    render(<StockChart {...defaultProps} error="Failed to load data" />)
    
    expect(screen.getByText(/Failed to load chart data/)).toBeInTheDocument()
    expect(screen.getByText(/Failed to load data/)).toBeInTheDocument()
  })

  it('should show no data state', () => {
    render(<StockChart {...defaultProps} data={[]} />)
    
    expect(screen.getByText('No chart data available')).toBeInTheDocument()
    expect(screen.getByText(/Chart data for RELIANCE/)).toBeInTheDocument()
  })

  it('should call onRetry when retry button is clicked', () => {
    const mockRetry = jest.fn()
    render(<StockChart {...defaultProps} error="Network error" onRetry={mockRetry} />)
    
    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)
    
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('should display correct data points count', () => {
    render(<StockChart {...defaultProps} />)
    
    expect(screen.getByText('4 data points')).toBeInTheDocument()
  })
})

describe('TimeframeSelector', () => {
  const defaultProps = {
    currentTimeframe: '1D' as Timeframe,
    onTimeframeChange: jest.fn(),
    loading: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all timeframe buttons', () => {
    render(<TimeframeSelector {...defaultProps} />)
    
    expect(screen.getByText('1D')).toBeInTheDocument()
    expect(screen.getByText('1W')).toBeInTheDocument()
    expect(screen.getByText('1M')).toBeInTheDocument()
    expect(screen.getByText('3M')).toBeInTheDocument()
    expect(screen.getByText('1Y')).toBeInTheDocument()
  })

  it('should highlight current timeframe', () => {
    render(<TimeframeSelector {...defaultProps} />)
    
    const currentButton = screen.getByText('1D')
    expect(currentButton).toHaveClass('bg-white', 'text-blue-600')
  })

  it('should call onTimeframeChange when button is clicked', () => {
    const mockOnChange = jest.fn()
    render(<TimeframeSelector {...defaultProps} onTimeframeChange={mockOnChange} />)
    
    const weekButton = screen.getByText('1W')
    fireEvent.click(weekButton)
    
    expect(mockOnChange).toHaveBeenCalledWith('1W')
  })

  it('should disable buttons when loading', () => {
    render(<TimeframeSelector {...defaultProps} loading={true} />)
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('should not highlight non-current timeframes', () => {
    render(<TimeframeSelector {...defaultProps} />)
    
    const weekButton = screen.getByText('1W')
    expect(weekButton).not.toHaveClass('bg-white', 'text-blue-600')
    expect(weekButton).toHaveClass('text-gray-600')
  })
})
