'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        onComplete()
      }, 300) // Allow fade out animation to complete
    }, 3000) // 3 seconds as per requirements

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Logo */}
      <div className="mb-8 animate-pulse">
        <Image
          src="/logo.png"
          alt="SwingSage Logo"
          width={120}
          height={120}
          className="rounded-xl shadow-2xl"
          priority
        />
      </div>

      {/* Brand Name */}
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
        SwingSage
      </h1>

      {/* Tagline */}
      <p className="text-xl md:text-2xl text-blue-100 font-light text-center max-w-md px-4">
        Smart Stock Analysis Made Simple
      </p>

      {/* Loading indicator */}
      <div className="mt-12 flex space-x-2">
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  )
}
