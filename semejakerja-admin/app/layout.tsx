import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Semejakerja Admin Panel',
  description: 'Admin panel terpadu untuk platform komunitas Semejakerja',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={cn("font-sans", plusJakartaSans.variable)}>
      <body className={plusJakartaSans.className}>
        {children}
      </body>
    </html>
  )
}
