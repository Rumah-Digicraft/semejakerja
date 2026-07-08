'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import type { AddonSubscription, AddonDropin, Addon } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { CheckCircle, XCircle, Download } from 'lucide-react'

type TabType = 'subscriptions' | 'dropin'

export default function SubscribersPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabType>('subscriptions')
  const [subs, setSubs] = useState<AddonSubscription[]>([])
  const [dropins, setDropins] = useState<AddonDropin[]>([])
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAddon, setFilterAddon] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const subPg = usePagination(subs, filterAddon)
  const dropinPg = usePagination(dropins, `${filterAddon}|${filterDate}`)

  const load = useCallback(async () => {
    setLoading(true)
    const [addonsRes, subsRes, dropinRes] = await Promise.all([
      supabase.from('addons').select('*'),
      (() => {
        let q = supabase.from('addon_subscriptions').select('*, addon:addons(*)').order('created_at', { ascending: false })
        if (filterAddon !== 'all') q = q.eq('addon_id', filterAddon)
        return q
      })(),
      (() => {
        let q = supabase.from('addon_dropin').select('*, addon:addons(*)').order('session_date', { ascending: false })
        if (filterAddon !== 'all') q = q.eq('addon_id', filterAddon)
        if (filterDate) q = q.eq('session_date', filterDate)
        return q
      })(),
    ])
    setAddons(addonsRes.data ?? [])
    setSubs(subsRes.data ?? [])
    setDropins(dropinRes.data ?? [])
    setLoading(false)
  }, [filterAddon, filterDate])

  useEffect(() => { load() }, [load])

  const confirmDropin = async (id: string) => {
    await supabase.from('addon_dropin').update({ payment_status: 'paid', confirmed_at: new Date().toISOString() }).eq('id', id)
    showToast('✅ Pembayaran drop-in dikonfirmasi!')
    load()
  }

  const cancelDropin = async (id: string) => {
    if (!confirm('Batalkan drop-in ini?')) return
    await supabase.from('addon_dropin').update({ payment_status: 'cancelled' }).eq('id', id)
    showToast('❌ Drop-in dibatalkan')
    load()
  }

  const exportDropinCSV = () => {
    const rows = dropins.map(d => [d.participant_name ?? '', d.participant_wa ?? '', d.addon?.name ?? '', d.session_date, d.payment_status, d.price_paid ?? ''])
    const csv = [['Nama', 'WA', 'Add-on', 'Tanggal Sesi', 'Status', 'Harga'], ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'dropin.csv'; a.click()
  }

  const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    paid: { label: 'Lunas', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Batal', color: 'bg-red-100 text-red-500' },
  }
  const SUB_STATUS: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-red-100 text-red-500',
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Subscriber & Drop-in</h1>
        <p className="text-slate-500 mt-1">Kelola pass bulanan dan sesi drop-in add-on olahraga</p>
      </div>

      {/* Tab */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
        {[{ id: 'subscriptions', label: '📅 Pass Bulanan' }, { id: 'dropin', label: '🎯 Drop-in' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as TabType)} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={filterAddon} onChange={e => setFilterAddon(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="all">Semua Add-on</option>
          {addons.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {tab === 'dropin' && (
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
        )}
        {tab === 'dropin' && (
          <button onClick={exportDropinCSV} className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium transition ml-auto">
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'subscriptions' ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Subscriber</th>
                  <th className="px-5 py-3.5 font-medium">Add-on</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Mulai</th>
                  <th className="px-5 py-3.5 font-medium">Kadaluarsa</th>
                  <th className="px-5 py-3.5 font-medium">Harga Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>)
                  : subs.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Belum ada subscriber.</td></tr>
                  : subPg.pageItems.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-4 font-medium text-slate-900">{s.user_id.slice(0, 8)}...</td>
                      <td className="px-5 py-4 text-slate-600">{s.addon?.name ?? '—'}</td>
                      <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${SUB_STATUS[s.status]}`}>{s.status}</span></td>
                      <td className="px-5 py-4 text-xs text-slate-400">{formatDate(s.started_at)}</td>
                      <td className="px-5 py-4 text-xs text-slate-400">{s.expires_at ? formatDate(s.expires_at) : '—'}</td>
                      <td className="px-5 py-4 text-purple-700 font-medium">{s.price_paid ? formatCurrency(s.price_paid) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Peserta</th>
                  <th className="px-5 py-3.5 font-medium">No WA</th>
                  <th className="px-5 py-3.5 font-medium">Add-on</th>
                  <th className="px-5 py-3.5 font-medium">Tanggal Sesi</th>
                  <th className="px-5 py-3.5 font-medium">Status Bayar</th>
                  <th className="px-5 py-3.5 font-medium">Harga</th>
                  <th className="px-5 py-3.5 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>)
                  : dropins.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Belum ada drop-in.</td></tr>
                  : dropinPg.pageItems.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-4 font-medium text-slate-900">{d.participant_name ?? '—'}</td>
                      <td className="px-5 py-4 text-slate-500">{d.participant_wa ?? '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{d.addon?.name ?? '—'}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{formatDate(d.session_date)}</td>
                      <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PAYMENT_STATUS[d.payment_status]?.color}`}>{PAYMENT_STATUS[d.payment_status]?.label}</span></td>
                      <td className="px-5 py-4 font-medium text-purple-700">{d.price_paid ? formatCurrency(d.price_paid) : '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          {d.payment_status === 'pending' && <button onClick={() => confirmDropin(d.id)} className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"><CheckCircle size={14} /></button>}
                          {d.payment_status !== 'cancelled' && <button onClick={() => cancelDropin(d.id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition"><XCircle size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && (tab === 'subscriptions'
          ? <Pagination page={subPg.page} pageCount={subPg.pageCount} total={subPg.total} pageSize={subPg.pageSize} onPageChange={subPg.setPage} itemLabel="subscriber" />
          : <Pagination page={dropinPg.page} pageCount={dropinPg.pageCount} total={dropinPg.total} pageSize={dropinPg.pageSize} onPageChange={dropinPg.setPage} itemLabel="drop-in" />)}
      </div>
    </div>
  )
}
