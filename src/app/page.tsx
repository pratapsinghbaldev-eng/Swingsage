'use client'

import { useState } from 'react'
import SplashScreen from '@/components/SplashScreen'
import HomeScreen from '@/components/HomeScreen'
import SearchScreen from '@/components/SearchScreen'
import StockDetailScreen from '@/components/StockDetailScreen'
import { Stock } from '@/lib/api'

type Screen = 'splash' | 'home' | 'search' | 'stockDetail'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash')
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)

  const handleSplashComplete = () => {
    setCurrentScreen('home')
  }

  const handleSearchClick = () => {
    setCurrentScreen('search')
  }

  const handleSearchBack = () => {
    setCurrentScreen('home')
  }

  const handleStockSelect = (stock: Stock) => {
    setSelectedStock(stock)
    setCurrentScreen('stockDetail')
  }

  const handleStockDetailBack = () => {
    setCurrentScreen('search')
  }

  return (
    <>
      {currentScreen === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      {currentScreen === 'home' && (
        <HomeScreen onSearchClick={handleSearchClick} />
      )}
      {currentScreen === 'search' && (
        <SearchScreen onBack={handleSearchBack} onStockSelect={handleStockSelect} />
      )}
      {currentScreen === 'stockDetail' && selectedStock && (
        <StockDetailScreen stock={selectedStock} onBack={handleStockDetailBack} />
      )}
    </>
  )
}