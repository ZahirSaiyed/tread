import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TRS Platform',
  description: 'TRS Mobile Tire Shop — Dispatch Platform',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`dark ${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased bg-black text-white">
        {children}
        <Toaster
          position="bottom-center"
          containerStyle={{
            bottom: 'max(5.5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))',
          }}
          toastOptions={{
            style: {
              background: '#1C1C1E',
              color: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #2C2C2E',
            },
            success: {
              iconTheme: { primary: '#34C759', secondary: '#000000' },
            },
            error: {
              iconTheme: { primary: '#FF3B30', secondary: '#000000' },
            },
          }}
        />
      </body>
    </html>
  )
}
