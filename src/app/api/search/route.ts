import { NextRequest, NextResponse } from 'next/server'
import { searchStocks } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing query parameter',
          message: 'Please provide a search query using the "q" parameter'
        },
        { status: 400 }
      )
    }
    
    if (query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query too short',
          message: 'Search query must be at least 2 characters long'
        },
        { status: 400 }
      )
    }
    
    const stocks = await searchStocks(query)
    
    return NextResponse.json({
      success: true,
      stocks,
      query,
      count: stocks.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error - Search:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search stocks',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
