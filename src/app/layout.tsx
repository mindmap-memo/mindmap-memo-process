import type { Metadata, Viewport } from 'next'
import { Analytics } from "@vercel/analytics/react"
import AuthProvider from '../components/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mindmap Memo',
  description: 'Interactive mindmap memo application',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
