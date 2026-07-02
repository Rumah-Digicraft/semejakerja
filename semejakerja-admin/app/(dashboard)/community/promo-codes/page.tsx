'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PromoCode } from '@/types'
import { formatDate, generatePromoCode } from '@/lib/utils/format'
import { Plus, Tag, Copy, Trash2, Power, Loader2, X } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  event: 'bg-amber-100 text-amber-700',
  community: 'bg-purple-100 text-purple-700',
  partner: 'bg-emerald-100 text-emerald-700',
}

export default function PromoCodesPage() {
  const supabase = createClient()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterActive, setFilterActive] = useState('all')

  const [form, setForm] = useState({
    code: '',
    type: 'community' as PromoCode['type'],
    discount_percent: 10,
    max_usage: '' as string | number,
    expires_at: '',
    is_active: true,
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
    if (filterType !== 'all') q = q.eq('type', filterType)
    if (filterActive === 'active') q = q.eq('is_active', true)
    if (filterActive === 'inactive') q = q.eq('is_active', false)
    const { data } = await q
    setCodes(data ?? [])
    setLoading(false)
  }, [filterType, filterActive])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('promo_codes').insert({
      code: form.code.toUpperCase(),
      type: form.type,
      discount_percent: form.discount_percent,
      max_usage: form.max_usage === '' ? null : Number(form.max_usage),
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    })
    setSaving(false)
    if (error) { showToast('Gagal buat kode: ' + error.message); return }
    showToast('Promo code berhasil dibuat!')
    setShowModal(false)
    setForm({ code: '', type: 'community', discount_percent: 10, max_usage: '', expires_at: '', is_active: true })
    load()
  }

  const handleToggle = async (id: string, currentState: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !currentState }).eq('id', id)
    showToast(currentState ? 'Kode dinonaktifkan' : 'Kode diaktifkan kembali')
    load()
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Hapus promo code "${code}"?`)) return
    await supabase.from('promo_codes').delete().eq('id', id)
    showToast('Kode dihapus')
    load()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    showToast('Kode disalin!')
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promo Code</h1>
          <p className="text-slate-500 mt-1">Buat dan kelola kode diskon untuk komunitas</p>
        </div>
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Tipe</option>
            <option value="student">Student</option>
            <option value="event">Event</option>
            <option value="community">Community</option>
            <option value="partner">Partner</option>
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <Plus size={16} /> Buat Kode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-28 mb-3" />
            <div className="h-4 bg-slate-50 rounded w-full mb-2" />
            <div className="h-3 bg-slate-50 rounded w-20" />
          </div>
        )) : codes.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-slate-400">Belum ada promo code.</div>
        ) : codes.map(code => (
          <div key={code.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition ${code.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Tag size={14} className="text-purple-500" />
                  <code className="text-lg font-bold text-slate-900 tracking-widest">{code.code}</code>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${TYPE_COLORS[code.type]}`}>{code.type}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => copyCode(code.code)} title="Salin kode" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Copy size={14} /></button>
                <button onClick={() => handleToggle(code.id, code.is_active)} title={code.is_active ? 'Nonaktifkan' : 'Aktifkan'} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Power size={14} /></button>
                <button onClick={() => handleDelete(code.id, code.code)} title="Hapus" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Diskon</span>
                <span className="font-semibold text-purple-700">{code.discount_percent}%</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Terpakai</span>
                <span className="font-medium text-slate-700">{code.used_count} / {code.max_usage ?? '∞'}</span>
              </div>
              {code.expires_at && (
                <div className="flex justify-between text-slate-500">
                  <span>Kadaluarsa</span>
                  <span className="text-xs text-slate-500">{formatDate(code.expires_at)}</span>
                </div>
              )}
            </div>
            {/* Usage bar */}
            {code.max_usage && (
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min((code.used_count / code.max_usage) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Buat Promo Code</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kode</label>
                <div className="flex gap-2">
                  <input
                    required
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="SEMEJA20"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button type="button" onClick={() => setForm({ ...form, code: generatePromoCode() })} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-600 transition">Auto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
                    <option value="student">Student</option>
                    <option value="event">Event</option>
                    <option value="community">Community</option>
                    <option value="partner">Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Diskon (%)</label>
                  <input type="number" min={1} max={100} required value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Usage (kosong = ∞)</label>
                  <input type="number" min={1} value={form.max_usage} onChange={e => setForm({ ...form, max_usage: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kadaluarsa</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Buat Kode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
