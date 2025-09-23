import { NextRequest, NextResponse } from 'next/server'
import { getStockDetails } from '@/lib/api'

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
    
    const stock = await getStockDetails(symbol.toUpperCase())
    
    if (!stock) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stock not found',
          message: `No stock found with symbol: ${symbol}`
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      stock,
      symbol,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error - Stock Details:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
