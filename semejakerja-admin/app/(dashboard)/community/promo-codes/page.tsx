'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { PromoCode, Campaign } from '@/types'
import { formatDate, generatePromoCode } from '@/lib/utils/format'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { Plus, Tag, Copy, Loader2, X, Infinity as InfinityIcon } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  event: 'bg-amber-100 text-amber-700',
  community: 'bg-purple-100 text-purple-700',
  partner: 'bg-emerald-100 text-emerald-700',
  launch: 'bg-fuchsia-100 text-fuchsia-700',
}

export default function PromoCodesPage() {
  const supabase = createClient()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [campaigns, setCampaigns] = useState<Pick<Campaign, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterActive, setFilterActive] = useState('all')
  const [filterCampaign, setFilterCampaign] = useState('all')

  const [form, setForm] = useState({
    code: '',
    type: 'community' as PromoCode['type'],
    discount_percent: 10,
    max_usage: '' as string | number,
    expires_at: '',
    campaign_id: '' as string,
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: codeRows }, { data: campRows }] = await Promise.all([
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('campaigns').select('id, name').order('created_at', { ascending: false }),
    ])
    setCodes((codeRows ?? []) as PromoCode[])
    setCampaigns((campRows ?? []) as Pick<Campaign, 'id' | 'name'>[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const campaignName = useMemo(
    () => new Map(campaigns.map(c => [c.id, c.name])),
    [campaigns],
  )

  const filtered = useMemo(() => codes.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false
    if (filterActive === 'active' && !c.is_active) return false
    if (filterActive === 'inactive' && c.is_active) return false
    if (filterCampaign === 'none' && c.campaign_id) return false
    if (filterCampaign !== 'all' && filterCampaign !== 'none' && c.campaign_id !== filterCampaign) return false
    return true
  }), [codes, filterType, filterActive, filterCampaign])

  const { page, setPage, pageCount, pageItems, pageSize, total } =
    usePagination(filtered, `${filterType}|${filterActive}|${filterCampaign}`)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('promo_codes').insert({
      code: form.code.toUpperCase(),
      type: form.type,
      discount_percent: form.discount_percent,
      max_usage: form.max_usage === '' ? null : Number(form.max_usage),
      expires_at: form.expires_at || null,
      campaign_id: form.campaign_id || null,
      is_active: true,
    })
    setSaving(false)
    if (error) { showToast('Gagal buat kode: ' + error.message); return }
    showToast('Promo code berhasil dibuat!')
    setShowModal(false)
    setForm({ code: '', type: 'community', discount_percent: 10, max_usage: '', expires_at: '', campaign_id: '' })
    load()
  }

  const handleToggle = async (id: string, currentState: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !currentState }).eq('id', id)
    setCodes(prev => prev.map(c => (c.id === id ? { ...c, is_active: !currentState } : c)))
    showToast(currentState ? 'Kode dinonaktifkan' : 'Kode diaktifkan kembali')
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Hapus promo code "${code}"?`)) return
    await supabase.from('promo_codes').delete().eq('id', id)
    setCodes(prev => prev.filter(c => c.id !== id))
    showToast('Kode dihapus')
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
        <div className="flex flex-wrap gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Tipe</option>
            <option value="student">Student</option>
            <option value="event">Event</option>
            <option value="community">Community</option>
            <option value="partner">Partner</option>
            <option value="launch">Launch</option>
          </select>
          <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none max-w-[180px]">
            <option value="all">Semua Campaign</option>
            <option value="none">Tanpa campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
            <Plus size={16} /> Buat Kode
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Kode</th>
                <th className="text-left font-semibold px-5 py-3">Diskon</th>
                <th className="text-left font-semibold px-5 py-3">Expired</th>
                <th className="text-left font-semibold px-5 py-3 min-w-[160px]">Usage</th>
                <th className="text-left font-semibold px-5 py-3">Campaign</th>
                <th className="text-left font-semibold px-5 py-3">Status</th>
                <th className="text-right font-semibold px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td></tr>
              )) : pageItems.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">Belum ada promo code.</td></tr>
              ) : pageItems.map(code => (
                <tr key={code.id} className={`hover:bg-slate-50 transition ${code.is_active ? '' : 'opacity-60'}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-purple-400 shrink-0" />
                      <div>
                        <code className="font-mono font-bold text-slate-800 tracking-wide">{code.code}</code>
                        <span className={`ml-0 block w-fit mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${TYPE_COLORS[code.type] ?? 'bg-slate-100 text-slate-600'}`}>{code.type}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-purple-700">{code.discount_percent}%</td>
                  <td className="px-5 py-3.5">
                    {code.expires_at ? (
                      <span className="text-slate-500 text-xs">{formatDate(code.expires_at)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[11px] font-medium"><InfinityIcon size={11} /> Lifetime</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-slate-700 text-xs mb-1">{code.used_count} {code.max_usage ? `/ ${code.max_usage}` : '/ ∞'}</div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-32">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: code.max_usage ? `${Math.min((code.used_count / code.max_usage) * 100, 100)}%` : (code.used_count > 0 ? '100%' : '0%') }} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {code.campaign_id ? (
                      <Link href={`/community/campaign/${code.campaign_id}`} className="text-xs text-purple-600 hover:underline">{campaignName.get(code.campaign_id) ?? 'Campaign'}</Link>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${code.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{code.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => copyCode(code.code)} title="Salin kode" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Copy size={14} /></button>
                      <button onClick={() => handleToggle(code.id, code.is_active)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${code.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{code.is_active ? 'Off' : 'On'}</button>
                      <button onClick={() => handleDelete(code.id, code.code)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="kode" />
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
                  <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SEMEJA20" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <button type="button" onClick={() => setForm({ ...form, code: generatePromoCode() })} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-600 transition">Auto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as PromoCode['type'] })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
                    <option value="student">Student</option>
                    <option value="event">Event</option>
                    <option value="community">Community</option>
                    <option value="partner">Partner</option>
                    <option value="launch">Launch</option>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign (opsional)</label>
                <select value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
                  <option value="">— Tanpa campaign —</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
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
