'use client'

import { useState } from 'react'
import { ArrowLeft, Search, TrendingUp, TrendingDown } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { useStockSearch } from '@/hooks/useStockSearch'
import { Stock } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import SearchSkeleton from '@/components/ui/SearchSkeleton'

interface SearchScreenProps {
  onBack: () => void
  onStockSelect: (stock: Stock) => void
}

export default function SearchScreen({ onBack, onStockSelect }: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery] = useDebounce(searchQuery, 300)
  
  const { 
    data: stocks, 
    isLoading, 
    isError, 
    refetch 
  } = useStockSearch(debouncedQuery)

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals)
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    if (change < 0) return <TrendingDown className="w-4 h-4" />
    return null
  }

  const handleStockClick = (stock: Stock) => {
    onStockSelect(stock)
  }

  const renderSearchResults = () => {
    if (isLoading) {
      return <SearchSkeleton />
    }

    if (isError) {
      return (
        <ErrorMessage
          message="Failed to search stocks. Please check your connection and try again."
          onRetry={() => refetch()}
          className="py-12"
        />
      )
    }

    if (!stocks || stocks.length === 0) {
      if (debouncedQuery.length >= 2) {
        return (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Results Found</h3>
            <p className="text-gray-500">
              No stocks found for &quot;{debouncedQuery}&quot;
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Try searching with a different company name or stock symbol
            </p>
          </div>
        )
      }
      return null
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Search Results ({stocks.length})
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <LoadingSpinner size="sm" />
            <span>Live data</span>
          </div>
        </div>

        {stocks.map((stock) => (
          <button
            key={`${stock.exchange}:${stock.symbol}`}
            onClick={() => handleStockClick(stock)}
            className="w-full bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                  {stock.name}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {stock.exchange}:{stock.symbol}
                </p>
                {stock.marketCap && (
                  <p className="text-xs text-gray-500">
                    Market Cap: ₹{(stock.marketCap / 100000).toFixed(2)} Cr
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 mb-1">
                  {formatCurrency(stock.ltp)}
                </div>
                <div className={`flex items-center justify-end space-x-1 ${getChangeColor(stock.change)}`}>
                  {getChangeIcon(stock.change)}
                  <span className="text-sm font-medium">
                    {stock.change >= 0 ? '+' : ''}{formatNumber(stock.change)}
                  </span>
                  <span className="text-sm font-medium">
                    ({stock.changePercent >= 0 ? '+' : ''}{formatNumber(stock.changePercent)}%)
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 mr-4"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            {/* Search Input */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search stocks by name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  autoFocus
                />
                {isLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {debouncedQuery.length >= 2 ? (
          renderSearchResults()
        ) : searchQuery.length > 0 ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-500">Type at least 2 characters to search...</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Search NSE/BSE Stocks</h2>
            <p className="text-gray-500 mb-6">
              Enter a company name or stock symbol to get started
            </p>
            
            {/* Search Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Search Tips:</h3>
              <ul className="text-sm text-blue-800 text-left space-y-1">
                <li>• Try &quot;Reliance&quot; or &quot;RELIANCE&quot;</li>
                <li>• Search &quot;TCS&quot; or &quot;Tata Consultancy&quot;</li>
                <li>• Use &quot;HDFC&quot; or &quot;ICICI&quot;</li>
                <li>• Type &quot;Infosys&quot; or &quot;INFY&quot;</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
