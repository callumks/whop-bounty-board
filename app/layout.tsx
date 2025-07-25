import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './client-layout'
import Navbar from '@/components/layout/Navbar'

const inter = Inter({ subsets: ['latin'] })

// This metadata export works because this is a server component
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
        <ClientLayout>
          <Navbar />
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </ClientLayout>
      </body>
    </html>
  )
} 