import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { GeistPixelGrid } from 'geist/font/pixel'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.startsWith('http')
  ? process.env.NEXT_PUBLIC_APP_URL
  : 'https://frontend-gamma-ten-34.vercel.app'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: 'DevGuardian AI',
  title: 'DevGuardian AI | Terminal3 Verified Software Engineering Agents',
  description:
    'DevGuardian AI is a multi-agent software engineering workspace that uses Terminal3 Agent Auth SDK for verifiable identity, scoped permissions, signed protected actions, and audit-ready deployment gates.',
  keywords: [
    'Terminal3 Agent Auth SDK',
    'DevGuardian AI',
    'AI software engineering agents',
    'agent authentication',
    'developer security automation',
    'auditable AI agents',
    'multi-agent software engineer',
  ],
  authors: [{ name: 'DevGuardian AI' }],
  creator: 'DevGuardian AI',
  publisher: 'DevGuardian AI',
  manifest: '/site.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'DevGuardian AI | Terminal3 Verified Software Engineering Agents',
    description:
      'A multi-agent engineering workspace with Terminal3-backed identity, permissions, signed protected actions, and audit logs.',
    url: '/',
    siteName: 'DevGuardian AI',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'DevGuardian AI Terminal3 verified agent workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevGuardian AI',
    description:
      'Terminal3 verified software engineering agents with scoped permissions and deploy gates.',
    creator: '@devguardian',
    images: ['/og-image.svg'],
  },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: '#F2F1EA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${GeistPixelGrid.variable}`} suppressHydrationWarning>
      <body className="font-mono antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
