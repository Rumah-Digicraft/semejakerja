'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Membership, UserProfile } from '@/types'
import { formatDatetime, formatCurrency } from '@/lib/utils/format'
import { Search, CheckCircle, XCircle, Wallet, Clock, Receipt, Tag } from 'lucide-react'

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  nyantai: { label: 'Nyantai', color: 'bg-slate-100 text-slate-600' },
  nongkrong: { label: 'Nongkrong', color: 'bg-blue-100 text-blue-700' },
  mode_serius: { label: 'Mode Serius', color: 'bg-purple-100 text-purple-700' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700' },
  expired: { label: 'Kadaluarsa', color: 'bg-slate-100 text-slate-500' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-500' },
  pending_payment: { label: 'Menunggu Pembayaran', color: 'bg-amber-100 text-amber-700' },
}

interface TransactionRow extends Membership {
  profile?: UserProfile
}

export default function TransactionsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: memberships }, { data: profiles }] = await Promise.all([
      supabase.from('memberships').select('*').order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('*'),
    ])

    const profileMap: Record<string, UserProfile> = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    const merged: TransactionRow[] = (memberships ?? []).map(m => ({ ...m, profile: profileMap[m.user_id] }))
    setRows(merged)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handlePayment = async (membershipId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'active' : 'cancelled'
    // .select() so an RLS-blocked update (0 rows) surfaces instead of failing silently
    const { data, error } = await supabase.from('memberships').update({ status }).eq('id', membershipId).select('id')
    if (error || !data?.length) {
      showToast(`Gagal update pembayaran: ${error?.message ?? 'tidak ada baris ter-update (cek role admin / RLS)'}`)
      return
    }
    showToast(action === 'approve' ? 'Berhasil: Pembayaran dikonfirmasi!' : 'Pembayaran ditolak')
    load()
  }

  const filtered = rows.filter(r => {
    const name = (r.profile?.full_name ?? '').toLowerCase()
    const phone = (r.profile?.phone ?? '').toLowerCase()
    if (search && !name.includes(search.toLowerCase()) && !phone.includes(search.toLowerCase()) && !(r.promo_code_used ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterTier !== 'all' && r.tier !== filterTier) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  const totalRevenue = rows.filter(r => r.status === 'active' && r.price_paid).reduce((sum, r) => sum + r.price_paid, 0)
  const pendingCount = rows.filter(r => r.status === 'pending_payment').length

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaksi Membership</h1>
          <p className="text-slate-500 mt-1">Riwayat pembelian & verifikasi pembayaran membership</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pendapatan Membership</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><Clock size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Menunggu Verifikasi</p>
            <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Receipt size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Transaksi</p>
            <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / WA / promo..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm w-56 focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Tier</option>
            <option value="nyantai">Nyantai</option>
            <option value="nongkrong">Nongkrong</option>
            <option value="mode_serius">Mode Serius</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="pending_payment">Menunggu Pembayaran</option>
            <option value="expired">Kadaluarsa</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-medium">Member</th>
                <th className="px-5 py-3.5 font-medium">Tier</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Harga</th>
                <th className="px-5 py-3.5 font-medium">Promo</th>
                <th className="px-5 py-3.5 font-medium">Tanggal</th>
                <th className="px-5 py-3.5 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Tidak ada transaksi ditemukan.</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{row.profile?.full_name ?? 'Nama belum diisi'}</p>
                    <p className="text-xs text-slate-400">{row.profile?.phone ?? '—'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_LABELS[row.tier]?.color}`}>
                      {TIER_LABELS[row.tier]?.label ?? row.tier}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_LABELS[row.status]?.color}`}>
                      {STATUS_LABELS[row.status]?.label ?? row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{row.price_paid ? formatCurrency(row.price_paid) : 'Gratis'}</td>
                  <td className="px-5 py-4">
                    {row.promo_code_used ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Tag size={12} /> {row.promo_code_used}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">{formatDatetime(row.created_at)}</td>
                  <td className="px-5 py-4">
                    {row.status === 'pending_payment' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePayment(row.id, 'approve')}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium flex items-center gap-1 transition w-max"
                        >
                          <CheckCircle size={12} /> Konfirmasi
                        </button>
                        <button
                          onClick={() => handlePayment(row.id, 'reject')}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium flex items-center gap-1 transition w-max"
                        >
                          <XCircle size={12} /> Tolak
                        </button>
                      </div>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">{filtered.length} transaksi</div>
      </div>
    </div>
  )
}
