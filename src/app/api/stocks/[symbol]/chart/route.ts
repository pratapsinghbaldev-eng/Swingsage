import { NextRequest, NextResponse } from 'next/server'
import { getStockIntraday, type Timeframe } from '@/lib/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const searchParams = request.nextUrl.searchParams
    const timeframe = (searchParams.get('timeframe') || '1D') as Timeframe
    
    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing symbol parameter',
          message: 'Please provide a stock symbol'
        },
        { status: 400 }
      )
    }
    
    const validTimeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid timeframe',
          message: `Timeframe must be one of: ${validTimeframes.join(', ')}`
        },
        { status: 400 }
      )
    }
    
    const data = await getStockIntraday(symbol.toUpperCase(), timeframe)
    
    return NextResponse.json({
      success: true,
      data,
      symbol,
      timeframe,
      count: data.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error - Stock Chart:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock chart data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
