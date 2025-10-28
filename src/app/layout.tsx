import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/react"
import AuthProvider from '../components/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mindmap Memo',
  description: 'Interactive mindmap memo application',
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
