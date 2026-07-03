'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Static export has no server, so route the entry point client-side.
// The dashboard layout enforces auth (redirects to /login when signed out).
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return null
}
