import { NextRequest, NextResponse } from 'next/server'
import { getStockDetails } from '@/lib/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const startTime = Date.now()
    
    console.log(`🔍 [API] Stock Details Request: ${symbol}`)
    console.log(`📊 [API] Environment: MOCK_DATA=${process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA}, PRIMARY_PROVIDER=${process.env.NEXT_PUBLIC_PRIMARY_PROVIDER}`)
    
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
    const responseTime = Date.now() - startTime
    
    if (!stock) {
      console.log(`❌ [API] Stock not found: ${symbol} (${responseTime}ms)`)
      return NextResponse.json(
        {
          success: false,
          error: 'Stock not found',
          message: `No stock found with symbol: ${symbol}`
        },
        { status: 404 }
      )
    }
    
    console.log(`✅ [API] Stock Details Success: ${symbol} - Price: ${stock.ltp} (${responseTime}ms)`)
    
    return NextResponse.json({
      success: true,
      stock,
      symbol,
      timestamp: new Date().toISOString(),
      responseTime
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
