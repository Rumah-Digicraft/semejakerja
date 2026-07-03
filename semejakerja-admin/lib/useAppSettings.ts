'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Fallback kalau tabel app_settings belum ada / belum di-seed.
const DEFAULTS: Record<string, string> = {
  landing_url:
    process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://semejakerja.pages.dev',
  moves_url:
    process.env.NEXT_PUBLIC_MOVES_URL ?? 'https://moves.semejakerja.com',
}

/**
 * Konfigurasi runtime dari tabel `app_settings` (domain aktif, dll).
 * Prioritas: nilai DB → env NEXT_PUBLIC_* → default hardcoded.
 * DB menang supaya ganti domain cukup ubah 1 baris tanpa redeploy.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('app_settings').select('key, value')
    if (data) {
      setSettings(Object.fromEntries(data.map(r => [r.key, r.value])))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
  }, [load])

  const get = (key: keyof typeof DEFAULTS) => settings[key] ?? DEFAULTS[key]

  return {
    loading,
    reload: load,
    landingUrl: get('landing_url').replace(/\/$/, ''),
    movesUrl: get('moves_url').replace(/\/$/, ''),
  }
}
