'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AdminRole } from '@/types'
import { canAccessPath } from '@/lib/access'

export interface PendingGroup {
  key: string
  label: string
  count: number
  href: string
}

const POLL_MS = 60_000

// Semua tempat yang butuh keputusan admin (approve/reject/verifikasi),
// digerbangi role yang sama seperti sidebar/proxy (lib/access.ts) supaya
// admin tidak lihat notifikasi ke halaman yang tak bisa dia buka.
export function usePendingActions() {
  const supabase = createClient()
  const [groups, setGroups] = useState<PendingGroup[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: roleRow } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle()
    const userRole = (roleRow?.role ?? null) as AdminRole | null
    if (!userRole) { setLoading(false); return }
    const can = (prefix: string) => canAccessPath(prefix, userRole)

    const next: PendingGroup[] = []
    const tasks: Promise<void>[] = []

    if (can('/maps')) {
      const mapsTables: Array<[string, string, string]> = [
        ['cafe_submissions', 'moderasi-kafe-baru', 'Kafe baru menunggu review'],
        ['cafe_edits', 'moderasi-edit', 'Koreksi info kafe menunggu review'],
        ['cafe_reviews', 'moderasi-ulasan', 'Ulasan kafe menunggu review'],
        ['cafe_photos', 'moderasi-foto', 'Foto kafe menunggu review'],
      ]
      for (const [table, key, label] of mapsTables) {
        tasks.push((async () => {
          const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'pending')
          if (count) next.push({ key, label, count, href: '/maps/moderasi' })
        })())
      }
    }

    if (can('/community')) {
      tasks.push((async () => {
        const { count } = await supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('status', 'pending_payment')
        if (count) next.push({ key: 'membership-pending', label: 'Pembayaran membership pending', count, href: '/community/transactions' })
      })())
      tasks.push((async () => {
        const { count } = await supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_student', true).is('student_verified_at', null)
        if (count) next.push({ key: 'ktm-unverified', label: 'KTM mahasiswa belum diverifikasi', count, href: '/community/members' })
      })())
      tasks.push((async () => {
        const { count } = await supabase.from('form_responses').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        if (count) next.push({ key: 'form-pending', label: 'Pendaftaran event menunggu approval', count, href: '/community/forms' })
      })())
    }

    if (can('/moves')) {
      tasks.push((async () => {
        const { count } = await supabase.from('participants').select('id', { count: 'exact', head: true }).eq('payment_status', 'pending')
        if (count) next.push({ key: 'moves-payment', label: 'Pembayaran sesi Moves pending', count, href: '/moves/participants' })
      })())
    }

    if (can('/addon')) {
      tasks.push((async () => {
        const { count } = await supabase.from('addon_dropin').select('id', { count: 'exact', head: true }).eq('payment_status', 'pending')
        if (count) next.push({ key: 'addon-dropin-payment', label: 'Pembayaran drop-in add-on pending', count, href: '/addon/subscribers' })
      })())
    }

    await Promise.all(tasks)
    setGroups(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [load])

  const total = groups.reduce((sum, g) => sum + g.count, 0)
  return { groups, total, loading, refresh: load }
}
