'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import StockDetailScreen from '@/components/StockDetailScreen'
import { useStockSearch } from '@/hooks/useStockSearch'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'

export default function StockPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = params.symbol as string

  // Get stock details by searching for the symbol
  const { data: stocks, isLoading, isError, refetch } = useStockSearch(symbol, true)
  
  const stock = stocks?.find(s => s.symbol === symbol) || stocks?.[0]

  const handleBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading stock details...</p>
        </div>
      </div>
    )
  }

  if (isError || !stock) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 mr-4"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Stock Details</h1>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage
            message={`Failed to load details for ${symbol}. Please check the symbol and try again.`}
            onRetry={() => refetch()}
          />
        </main>
      </div>
    )
  }

  return <StockDetailScreen stock={stock} onBack={handleBack} />
}
