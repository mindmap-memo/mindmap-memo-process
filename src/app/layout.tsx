import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/react"
import '../scss/App.module.scss'

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
        {children}
        <Analytics />
      </body>
    </html>
  )
}
