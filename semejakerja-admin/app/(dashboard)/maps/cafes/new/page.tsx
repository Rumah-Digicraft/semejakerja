'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CafeForm from '../CafeForm'
import { type CafeDbPayload, emptyFormValues } from '../lib'
import { ArrowLeft } from 'lucide-react'

export default function NewCafePage() {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleCreate = async (payload: CafeDbPayload) => {
    setSaving(true)
    // Default eksplisit — tabel cafes adalah tabel legacy yang default
    // kolomnya tidak terjamin. `location` (PostGIS) sengaja tak diisi
    // (NOT NULL-nya dilepas di migrasi 015).
    const { data, error } = await supabase
      .from('cafes')
      .insert({ ...payload, rating: 0, total_reviews: 0, clicks: 0, top_review: null })
      .select('id')
      .single()
    setSaving(false)
    if (error || !data) {
      showToast(`Gagal membuat kafe: ${error?.message ?? 'tidak ada baris dibuat (cek role admin / RLS)'}`)
      return
    }
    router.push(`/maps/cafes/${data.id}`)
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <Link href="/maps/cafes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={15} /> Data Kafe
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Tambah Kafe</h1>
        <p className="text-slate-500 mt-1">Kafe baru langsung tampil di peta publik setelah disimpan</p>
      </div>

      <CafeForm
        initial={emptyFormValues()}
        saving={saving}
        submitLabel="Buat Kafe"
        onSubmit={handleCreate}
      />
    </div>
  )
}
