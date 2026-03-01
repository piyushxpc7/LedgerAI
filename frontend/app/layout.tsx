import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LedgerAI — The Operating System for Indian Tax Compliance',
  description: 'AI-powered income tax notice management for CA firms. Turn 3 hours of manual notice work into 90-second evidence confirmation.',
  keywords: 'income tax, notice management, CA firms, AI, India, 143(1), AIS mismatch, TDS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
