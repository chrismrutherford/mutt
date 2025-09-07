import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MUTT - Multi-User Text Terminal',
  description: 'Multi-User Text Terminal for tactical communications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
