import { NextResponse } from 'next/server'
import { getMarketIndices } from '@/lib/api'

export async function GET() {
  try {
    const startTime = Date.now()
    console.log('📊 [API] Market Indices Request')
    
    const indices = await getMarketIndices()
    const responseTime = Date.now() - startTime
    
    console.log(`✅ [API] Market Indices Success: ${indices.length} indices (${responseTime}ms)`)
    
    return NextResponse.json({
      success: true,
      indices,
      timestamp: new Date().toISOString(),
      responseTime
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
