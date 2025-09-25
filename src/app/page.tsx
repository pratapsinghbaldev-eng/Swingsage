'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SplashScreen from '@/components/SplashScreen'
import HomeScreen from '@/components/HomeScreen'

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const router = useRouter()

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  const handleSearchClick = () => {
    router.push('/search')
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  return <HomeScreen onSearchClick={handleSearchClick} />
}