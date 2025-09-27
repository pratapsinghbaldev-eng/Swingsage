import { NextRequest, NextResponse } from 'next/server'
import { NSEAPIManager } from '@/lib/nse-api-providers'
import { generateSignals } from '@/lib/signals'

const api = new NSEAPIManager()

export async function GET(_req: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await context.params
    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Missing symbol' }, { status: 400 })
    }

    const bars = await api.getDailyOHLC(symbol, 120)
    const signals = generateSignals(bars)

    return NextResponse.json({ success: true, symbol, count: signals.length, signals, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('API Error - Signals:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate signals' }, { status: 500 })
  }
}


