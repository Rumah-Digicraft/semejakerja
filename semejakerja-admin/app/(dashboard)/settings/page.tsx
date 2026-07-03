'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Globe, Loader2, Save } from 'lucide-react'

interface DomainField {
  key: string
  label: string
  desc: string
  placeholder: string
}

const DOMAIN_FIELDS: DomainField[] = [
  {
    key: 'landing_url',
    label: 'Domain Landing Page',
    desc: 'Dipakai untuk link publik join Semeja Moves, register, & membership.',
    placeholder: 'https://semejakerja.pages.dev',
  },
  {
    key: 'moves_url',
    label: 'Domain Semeja Moves',
    desc: 'Dipakai untuk Public Link Form absensi sesi (…/f/token, …/p/token).',
    placeholder: 'https://moves.semejakerja.com',
  },
]

export default function SettingsPage() {
  const supabase = createClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('app_settings').select('key, value')
      if (error) {
        showToast(`Gagal memuat pengaturan: ${error.message} — pastikan migrasi 013 sudah dijalankan.`)
      } else if (data) {
        setValues(Object.fromEntries(data.map(r => [r.key, r.value])))
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const rows = DOMAIN_FIELDS
      .filter(f => values[f.key]?.trim())
      .map(f => ({
        key: f.key,
        value: values[f.key].trim().replace(/\/$/, ''),
        updated_at: new Date().toISOString(),
      }))

    // .select() so an RLS-blocked upsert (0 rows) surfaces instead of failing silently
    const { data, error } = await supabase.from('app_settings').upsert(rows).select('key')
    if (error || !data?.length) {
      showToast(`Gagal menyimpan: ${error?.message ?? 'tidak ada baris ter-update (cek role admin / RLS)'}`)
    } else {
      showToast('Pengaturan domain tersimpan! Link publik langsung pakai domain baru.')
    }
    setSaving(false)
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm max-w-md">{toast}</div>}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-slate-500 mt-1">Konfigurasi runtime ekosistem — berlaku langsung tanpa deploy ulang</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Globe size={20} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Domain Aktif</h2>
            <p className="text-xs text-slate-500">Ganti di sini saat pindah domain (mis. pages.dev → semejakerja.com)</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {DOMAIN_FIELDS.map(f => <div key={f.key} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          DOMAIN_FIELDS.map(f => (
            <div key={f.key}>
              <label htmlFor={f.key} className="block text-sm font-semibold text-slate-700 mb-1">{f.label}</label>
              <p className="text-xs text-slate-400 mb-2">{f.desc}</p>
              <input
                id={f.key}
                type="url"
                value={values[f.key] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          ))
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}
