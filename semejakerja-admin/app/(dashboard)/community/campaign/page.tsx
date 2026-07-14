'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Campaign } from '@/types'
import { formatDate } from '@/lib/utils/format'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import {
  OBJECTIVE_LABELS, OBJECTIVE_COLORS, STATUS_LABELS, STATUS_COLORS, OBJECTIVE_OPTIONS,
} from './lib'
import {
  Plus, Megaphone, Trash2, Loader2, X, Rocket, Users, ChevronRight, Circle,
} from 'lucide-react'

export default function CampaignPage() {
  const supabase = createClient()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [form, setForm] = useState({ name: '', objective: 'launch', is_launch: true })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: camps }, { data: leads }] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('campaign_leads').select('campaign_id'),
    ])
    setCampaigns(camps ?? [])
    const counts: Record<string, number> = {}
    for (const l of leads ?? []) counts[l.campaign_id] = (counts[l.campaign_id] ?? 0) + 1
    setLeadCounts(counts)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(
    () => campaigns.filter(c => filterStatus === 'all' || c.status === filterStatus),
    [campaigns, filterStatus],
  )
  const { page, setPage, pageCount, pageItems, pageSize, total } = usePagination(filtered, filterStatus)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase.from('campaigns')
      .insert({ name: form.name, objective: form.objective, is_launch: form.is_launch })
      .select('id').single()
    setSaving(false)
    if (error) { showToast('Gagal buat campaign: ' + error.message); return }
    router.push(`/community/campaign/${data.id}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Hapus campaign "${name}"? Promo code yang nempel tidak ikut terhapus (cuma lepas kaitannya).`)) return
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) { showToast('Gagal hapus: ' + error.message); return }
    setCampaigns(prev => prev.filter(c => c.id !== id))
    showToast('Campaign dihapus')
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaign</h1>
          <p className="text-slate-500 mt-1">Program promo bertarget — termasuk mode launch di halaman Pricing</p>
        </div>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="active">Aktif</option>
            <option value="ended">Selesai</option>
          </select>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
            <Plus size={16} /> Buat Campaign
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Campaign</th>
                <th className="text-left font-semibold px-5 py-3">Objective</th>
                <th className="text-left font-semibold px-5 py-3">Periode</th>
                <th className="text-left font-semibold px-5 py-3">Pendaftar</th>
                <th className="text-left font-semibold px-5 py-3">Status</th>
                <th className="text-right font-semibold px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td></tr>
              )) : pageItems.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-400">Belum ada campaign.</td></tr>
              ) : pageItems.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => router.push(`/community/campaign/${c.id}`)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {c.is_launch ? <Rocket size={15} className="text-fuchsia-500 shrink-0" /> : <Megaphone size={15} className="text-slate-400 shrink-0" />}
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {c.name}
                          {c.is_launch && c.is_published && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                              <Circle size={7} className="fill-green-500 text-green-500" /> LIVE
                            </span>
                          )}
                        </div>
                        {c.headline && <div className="text-xs text-slate-400 truncate max-w-[220px]">{c.headline}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${OBJECTIVE_COLORS[c.objective]}`}>{OBJECTIVE_LABELS[c.objective]}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {c.starts_at || c.ends_at
                      ? `${c.starts_at ? formatDate(c.starts_at) : '…'} – ${c.ends_at ? formatDate(c.ends_at) : '…'}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <span className="inline-flex items-center gap-1"><Users size={13} className="text-slate-400" />{leadCounts[c.id] ?? 0}{c.quota ? ` / ${c.quota}` : ''}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => handleDelete(e, c.id, c.name)} title="Hapus" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="campaign" />
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Buat Campaign</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Campaign</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Launch Website Semeja Kerja" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Objective</label>
                <select value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
                  {OBJECTIVE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={form.is_launch} onChange={e => setForm({ ...form, is_launch: e.target.checked })} className="mt-0.5 accent-purple-600" />
                <span>
                  <span className="block text-sm font-medium text-slate-800">Mode Launch (muka publik)</span>
                  <span className="block text-xs text-slate-500">Nyalakan supaya campaign ini bisa tampil di halaman Pricing sebagai form pendaftaran berhadiah kode diskon.</span>
                </span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Buat &amp; atur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
