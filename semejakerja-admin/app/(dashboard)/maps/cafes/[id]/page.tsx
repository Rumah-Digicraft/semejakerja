'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Cafe, SpeedTest } from '@/types'
import CafeForm from '../CafeForm'
import { type CafeDbPayload, cafeToFormValues } from '../lib'
import { ArrowLeft, Gauge, MousePointerClick, Star, Trash2, Users } from 'lucide-react'

const TIER_COLORS: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-600',
  verified: 'bg-blue-100 text-blue-700',
  partner: 'bg-purple-100 text-purple-700',
  sponsor: 'bg-amber-100 text-amber-700',
}

export default function EditCafePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [cafe, setCafe] = useState<Cafe | null>(null)
  const [tests, setTests] = useState<SpeedTest[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    const [cafeRes, testsRes] = await Promise.all([
      supabase.from('cafes').select('*').eq('id', id).single(),
      supabase.from('speed_tests').select('*').eq('cafe_id', id).order('created_at', { ascending: false }).limit(200),
    ])
    if (cafeRes.error || !cafeRes.data) setNotFound(true)
    else setCafe(cafeRes.data)
    setTests(testsRes.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleUpdate = async (payload: CafeDbPayload) => {
    setSaving(true)
    const { data, error } = await supabase.from('cafes').update(payload).eq('id', id).select('id')
    setSaving(false)
    if (error || !data?.length) {
      showToast(`Gagal menyimpan: ${error?.message ?? 'tidak ada baris ter-update (cek role admin / RLS)'}`)
      return
    }
    showToast('Perubahan disimpan')
    load()
  }

  const handleDelete = async () => {
    if (!cafe) return
    if (!confirm(`Hapus kafe "${cafe.name}" secara permanen? Data speedtest-nya ikut terhapus.`)) return
    const { data, error } = await supabase.from('cafes').delete().eq('id', id).select('id')
    if (error) {
      showToast(error.code === '23503'
        ? 'Gagal: masih ada data terkait (review/foto/edit komunitas) untuk kafe ini.'
        : `Gagal menghapus: ${error.message}`)
      return
    }
    if (!data?.length) { showToast('Gagal menghapus: tidak ada baris terhapus (cek role admin / RLS)'); return }
    router.push('/maps/cafes')
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-5">
        <div className="h-5 bg-slate-100 rounded w-40 animate-pulse" />
        <div className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !cafe) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-slate-600 font-medium mb-2">Kafe tidak ditemukan</p>
          <Link href="/maps/cafes" className="text-sm text-purple-600 hover:text-purple-500">← Kembali ke Data Kafe</Link>
        </div>
      </div>
    )
  }

  const rating = Number(cafe.rating) || 0
  const stats = [
    { icon: <Star size={13} className="text-amber-400" />, label: rating > 0 ? `${rating.toFixed(1)} rating` : 'Belum ada rating' },
    { icon: <Users size={13} className="text-blue-400" />, label: `${cafe.total_reviews ?? 0} ulasan` },
    { icon: <MousePointerClick size={13} className="text-emerald-400" />, label: `${cafe.clicks ?? 0} klik` },
    { icon: <Gauge size={13} className="text-purple-400" />, label: `${tests.length} speedtest` },
  ]

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <Link href="/maps/cafes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={15} /> Data Kafe
      </Link>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 truncate">{cafe.name}</h1>
            <span className={`px-2 py-1 rounded-full text-[11px] font-bold capitalize ${TIER_COLORS[cafe.tier] ?? TIER_COLORS.basic}`}>
              {cafe.tier ?? 'basic'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {stats.map(s => (
              <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 border border-red-100 transition self-start md:self-auto"
        >
          <Trash2 size={15} /> Hapus
        </button>
      </div>

      <CafeForm
        initial={cafeToFormValues(cafe)}
        speedTests={tests}
        saving={saving}
        submitLabel="Simpan Perubahan"
        onSubmit={handleUpdate}
      />
    </div>
  )
}
