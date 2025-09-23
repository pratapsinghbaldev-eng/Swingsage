import { NextResponse } from 'next/server'
import { getMarketIndices } from '@/lib/api'

export async function GET() {
  try {
    const indices = await getMarketIndices()
    
    return NextResponse.json({
      success: true,
      indices,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error - Indices:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch market indices',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
