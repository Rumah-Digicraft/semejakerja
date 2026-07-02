'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Addon } from '@/types'
import { formatCurrency } from '@/lib/utils/format'
import { Edit2, Loader2, X, ToggleLeft, ToggleRight } from 'lucide-react'

export default function ManageAddonPage() {
  const supabase = createClient()
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<Addon | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price_per_session: 0, price_monthly: 0, includes_equipment: false })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('addons').select('*').order('created_at')
    setAddons(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openEdit = (addon: Addon) => {
    setEditItem(addon)
    setForm({ name: addon.name, description: addon.description ?? '', price_per_session: addon.price_per_session, price_monthly: addon.price_monthly, includes_equipment: addon.includes_equipment })
  }

  const handleSave = async () => {
    if (!editItem) return
    setSaving(true)
    const { error } = await supabase.from('addons').update(form).eq('id', editItem.id)
    setSaving(false)
    if (error) { showToast('❌ Gagal: ' + error.message); return }
    showToast('✅ Add-on berhasil diperbarui!')
    setEditItem(null)
    load()
  }

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('addons').update({ is_active: !current }).eq('id', id)
    showToast(current ? '⏸ Add-on dinonaktifkan' : '▶ Add-on diaktifkan')
    load()
  }

  const ADDON_ICONS: Record<string, string> = { Badminton: '🏸', Padel: '🎾' }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Kelola Add-on Olahraga</h1>
        <p className="text-slate-500 mt-1">Atur harga dan ketersediaan add-on olahraga komunitas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse">
            <div className="h-8 bg-slate-100 rounded w-32 mb-4" />
            <div className="h-4 bg-slate-50 rounded w-full mb-2" />
            <div className="h-4 bg-slate-50 rounded w-3/4" />
          </div>
        )) : addons.map(addon => (
          <div key={addon.id} className={`bg-white rounded-2xl p-6 border shadow-sm transition ${addon.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-3xl mb-2">{ADDON_ICONS[addon.name] ?? '🏅'}</div>
                <h3 className="text-xl font-bold text-slate-900">{addon.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{addon.description}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(addon)} className="p-2 rounded-lg hover:bg-purple-50 hover:text-purple-600 text-slate-400 transition">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleToggle(addon.id, addon.is_active)} className={`p-2 rounded-lg transition ${addon.is_active ? 'hover:bg-emerald-50 text-emerald-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                  {addon.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center py-2.5 border-t border-slate-50">
                <span className="text-sm text-slate-500">Harga Drop-in (per sesi)</span>
                <span className="font-bold text-purple-700">{formatCurrency(addon.price_per_session)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-t border-slate-50">
                <span className="text-sm text-slate-500">Pass Bulanan</span>
                <span className="font-bold text-purple-700">{formatCurrency(addon.price_monthly)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-t border-slate-50">
                <span className="text-sm text-slate-500">Termasuk Peralatan</span>
                <span className={`text-sm font-medium ${addon.includes_equipment ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {addon.includes_equipment ? '✓ Ya' : '✗ Tidak'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-t border-slate-50">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`text-sm font-semibold ${addon.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                  {addon.is_active ? '● Aktif' : '● Nonaktif'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Edit {editItem.name}</h2>
              <button onClick={() => setEditItem(null)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Harga Drop-in (Rp)</label>
                  <input type="number" min={0} value={form.price_per_session} onChange={e => setForm({ ...form, price_per_session: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pass Bulanan (Rp)</label>
                  <input type="number" min={0} value={form.price_monthly} onChange={e => setForm({ ...form, price_monthly: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="equipment" checked={form.includes_equipment} onChange={e => setForm({ ...form, includes_equipment: e.target.checked })} className="w-4 h-4 accent-purple-600" />
                <label htmlFor="equipment" className="text-sm text-slate-700">Termasuk peralatan (raket, bola, dll)</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
