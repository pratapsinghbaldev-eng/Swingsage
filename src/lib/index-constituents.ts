export type IndexCode = 'NIFTY50' | 'NIFTY100' | 'NIFTY200' | 'NIFTY500' | 'MIDCAP' | 'SMALLCAP'

// Minimal curated sets to keep calls bounded; can be expanded later
export const INDICES: Record<IndexCode, string[]> = {
  NIFTY50: [
    'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','BHARTIARTL','ITC','KOTAKBANK','LT','SBIN','ASIANPAINT','MARUTI','BAJFINANCE','HCLTECH','AXISBANK','WIPRO','ONGC','TATAMOTORS','SUNPHARMA','ULTRACEMCO','TECHM','TITAN','POWERGRID','NESTLEIND','JSWSTEEL','NTPC','BAJAJFINSV','DRREDDY','TATACONSUM','HEROMOTOCO','BRITANNIA','COALINDIA','CIPLA','DIVISLAB','EICHERMOT','GRASIM','HINDALCO','INDUSINDBK','SHREECEM','TATASTEEL','ADANIPORTS','APOLLOHOSP','BPCL','GODREJCP','HDFCLIFE','ICICIPRULI','SBILIFE','M&M','PIDILITIND'
  ],
  NIFTY100: [],
  NIFTY200: [],
  NIFTY500: [],
  MIDCAP: [],
  SMALLCAP: [],
}

export function resolveSymbols(input: Array<string | IndexCode>): string[] {
  const set = new Set<string>()
  for (const item of input) {
    if (item in INDICES) {
      for (const s of INDICES[item as IndexCode]) set.add(s)
    } else {
      set.add(String(item).toUpperCase())
    }
  }
  return Array.from(set)
}


