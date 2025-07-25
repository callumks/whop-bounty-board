import './globals.css'
import { Inter } from 'next/font/google'
import React from 'react'
import Navbar from '@/components/layout/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Challenges - Whop Creator Challenges',
  description: 'Launch user-generated content challenges and reward participants with USD, USDC, or subscription passes.',
  keywords: 'whop, challenges, ugc, content creation, rewards',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
} 