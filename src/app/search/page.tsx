'use client'

import { useRouter } from 'next/navigation'
import SearchScreen from '@/components/SearchScreen'
import { Stock } from '@/lib/api'

export default function SearchPage() {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  const handleStockSelect = (stock: Stock) => {
    router.push(`/stock/${stock.symbol}`)
  }

  return <SearchScreen onBack={handleBack} onStockSelect={handleStockSelect} />
}
