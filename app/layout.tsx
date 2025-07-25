'use client';

import './globals.css'
import { Inter } from 'next/font/google'
import React from 'react'
import Navbar from '@/components/layout/Navbar'

// Conditional Whop provider to handle React version compatibility
let WhopIframeSdkProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;

try {
  const whopReact = require('@whop/react');
  WhopIframeSdkProvider = whopReact.WhopIframeSdkProvider;
} catch (error) {
  console.warn('Whop React SDK not available:', error);
  WhopIframeSdkProvider = ({ children }) => <>{children}</>;
}

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
  const ProviderComponent = WhopIframeSdkProvider || (({ children }) => <>{children}</>);
  
  return (
    <html lang="en">
      <body className={inter.className}>
        <ProviderComponent>
          <Navbar />
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </ProviderComponent>
      </body>
    </html>
  )
} 