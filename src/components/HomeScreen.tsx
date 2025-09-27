'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useDebounce } from 'use-debounce'
import { useMarketIndices } from '@/hooks/useMarketIndices'
import { useStockSearch } from '@/hooks/useStockSearch'
import ErrorMessage from '@/components/ui/ErrorMessage'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface HomeScreenProps {
  onSearchClick?: () => void
}

export default function HomeScreen({ onSearchClick }: HomeScreenProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [debouncedQuery] = useDebounce(searchQuery, 300)
  const searchRef = useRef<HTMLDivElement>(null)
  
  const { 
    data: indices, 
    isLoading, 
    isError, 
    refetch, 
    isFetching 
  } = useMarketIndices()

  const { 
    data: searchResults, 
    isLoading: isSearchLoading 
  } = useStockSearch(debouncedQuery, debouncedQuery.length >= 2)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Show dropdown when there are search results
  useEffect(() => {
    if (debouncedQuery.length >= 2 && searchResults && searchResults.length > 0) {
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }, [debouncedQuery, searchResults])

  const handleRefresh = () => {
    refetch()
  }

  const handleStockSelect = (symbol: string) => {
    router.push(`/stock/${symbol}`)
    setSearchQuery('')
    setShowDropdown(false)
  }

  const handleSearchFocus = () => {
    if (debouncedQuery.length >= 2 && searchResults && searchResults.length > 0) {
      setShowDropdown(true)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setShowDropdown(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-4">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="SwingSage Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <h1 className="text-xl font-bold text-gray-900">SwingSage</h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md ml-8" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search stocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {isSearchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}

                {/* Search Dropdown */}
                {showDropdown && searchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {searchResults.slice(0, 8).map((stock) => (
                      <button
                        key={`${stock.exchange}:${stock.symbol}`}
                        onClick={() => handleStockSelect(stock.symbol)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {stock.symbol}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {stock.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{stock.ltp.toFixed(2)}
                          </div>
                          <div className={`text-xs ${getChangeColor(stock.change)}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Screener Button */}
            <button
              onClick={() => router.push('/screener')}
              className="hidden md:inline-flex px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Stock Screener
            </button>

            {/* Search Icon for mobile */}
            {onSearchClick && (
              <button
                onClick={onSearchClick}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg md:hidden"
                aria-label="Search stocks"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Market Overview</h2>
          <p className="text-gray-600">Live market indices at a glance</p>
        </div>

        {/* Refresh Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium text-gray-700">
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <ErrorMessage
            message="Failed to load market indices. Please check your connection and try again."
            onRetry={handleRefresh}
          />
        )}

        {/* Index Cards Grid */}
        {indices && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {indices.map((index) => (
            <div
              key={index.name}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-200"
            >
              {/* Index Name */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{index.name}</h3>
                <div className={`flex items-center space-x-1 ${getChangeColor(index.change)}`}>
                  {getChangeIcon(index.change)}
                </div>
              </div>

              {/* Current Value */}
              <div className="mb-3">
                <span className="text-3xl font-bold text-gray-900">
                  {formatNumber(index.value)}
                </span>
              </div>

              {/* Change Information */}
              <div className="flex items-center space-x-4">
                <span className={`text-sm font-medium ${getChangeColor(index.change)}`}>
                  {index.change >= 0 ? '+' : ''}{formatNumber(index.change)}
                </span>
                <span className={`text-sm font-medium ${getChangeColor(index.changePercent)}`}>
                  {index.changePercent >= 0 ? '+' : ''}{formatNumber(index.changePercent)}%
                </span>
              </div>

              {/* Progress Bar (Visual indicator) */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      index.change >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(Math.abs(index.changePercent) * 20, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Market data is delayed by 15 minutes. Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </main>
    </div>
  )
}
