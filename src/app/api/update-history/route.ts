import { NextRequest, NextResponse } from 'next/server'
import { NSEAPIManager } from '@/lib/nse-api-providers'
import fs from 'fs'
import path from 'path'

const api = new NSEAPIManager()
const CACHE_DIR = path.join(process.cwd(), 'data', 'historical')

async function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { symbol, force = false } = await req.json()
    
    if (!symbol) {
      return NextResponse.json({ 
        success: false, 
        error: 'Symbol is required' 
      }, { status: 400 })
    }
    
    await ensureCacheDir()
    const filePath = path.join(CACHE_DIR, `${symbol}.json`)
    
    // Check if we need to update
    let shouldUpdate = force
    if (!shouldUpdate && fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      const lastUpdated = new Date(data.lastUpdated)
      const now = new Date()
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)
      
      // Update if data is older than 24 hours
      shouldUpdate = hoursSinceUpdate > 24
    } else {
      shouldUpdate = true
    }
    
    if (!shouldUpdate) {
      return NextResponse.json({
        success: true,
        message: 'Data is already up to date',
        symbol,
        cached: true
      })
    }
    
    // Fetch fresh data
    console.log(`Updating historical data for ${symbol}`)
    const bars = await api.getDailyOHLC(symbol, 500) // Get more data for cache
    
    if (bars.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No data available for symbol' 
      }, { status: 404 })
    }
    
    // Save to cache
    const cacheData = {
      symbol,
      lastUpdated: new Date().toISOString(),
      bars
    }
    
    fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'Historical data updated successfully',
      symbol,
      dataPoints: bars.length,
      lastUpdated: cacheData.lastUpdated
    })
    
  } catch (error) {
    console.error('Update history API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update historical data' 
    }, { status: 500 })
  }
}

// GET endpoint to check cache status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    
    if (!symbol) {
      return NextResponse.json({ 
        success: false, 
        error: 'Symbol parameter is required' 
      }, { status: 400 })
    }
    
    await ensureCacheDir()
    const filePath = path.join(CACHE_DIR, `${symbol}.json`)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        symbol,
        cached: false,
        message: 'No cached data available'
      })
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const lastUpdated = new Date(data.lastUpdated)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)
    
    return NextResponse.json({
      success: true,
      symbol,
      cached: true,
      lastUpdated: data.lastUpdated,
      dataPoints: data.bars?.length || 0,
      hoursSinceUpdate: Math.round(hoursSinceUpdate * 100) / 100,
      needsUpdate: hoursSinceUpdate > 24
    })
    
  } catch (error) {
    console.error('Cache status API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check cache status' 
    }, { status: 500 })
  }
}
