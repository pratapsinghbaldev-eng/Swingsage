import { NextRequest, NextResponse } from 'next/server'
import { getStockFundamentals } from '@/lib/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    
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
    
    const fundamentals = await getStockFundamentals(symbol.toUpperCase())
    
    if (!fundamentals) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fundamentals not found',
          message: `No fundamental data found for symbol: ${symbol}`
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      fundamentals,
      symbol,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error - Stock Fundamentals:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock fundamentals',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
