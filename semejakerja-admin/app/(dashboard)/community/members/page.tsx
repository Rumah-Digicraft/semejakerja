'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Membership, UserProfile } from '@/types'
import { formatDate } from '@/lib/utils/format'
import { Search, CheckCircle, XCircle, Loader2, GraduationCap, ChevronDown, CreditCard, Users, Clock } from 'lucide-react'

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  nyantai: { label: 'Nyantai', color: 'bg-slate-100 text-slate-600' },
  nongkrong: { label: 'Nongkrong', color: 'bg-blue-100 text-blue-700' },
  mode_serius: { label: 'Mode Serius', color: 'bg-purple-100 text-purple-700' },
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-500',
  pending_payment: 'bg-amber-100 text-amber-700',
}

interface MemberRow {
  profile: UserProfile
  membership?: Membership
}

export default function MembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStudent, setFilterStudent] = useState('all')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data: profiles } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
    const { data: memberships } = await supabase.from('memberships').select('*').order('created_at', { ascending: false })

    // Per user, prefer the row that actually drives their access: an active
    // membership first, else the newest row (pending/expired/cancelled).
    const memberMap: Record<string, Membership> = {}
    memberships?.forEach(m => {
      const existing = memberMap[m.user_id]
      if (!existing || (m.status === 'active' && existing.status !== 'active')) {
        memberMap[m.user_id] = m
      }
    })

    const rows: MemberRow[] = (profiles ?? []).map(p => ({ profile: p, membership: memberMap[p.id] }))
    setMembers(rows)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleVerifyKTM = async (userId: string) => {
    // .select() so an RLS-blocked update (0 rows) surfaces instead of failing silently
    const { data, error } = await supabase.from('user_profiles').update({
      student_verified_at: new Date().toISOString()
    }).eq('id', userId).select('id')
    if (error || !data?.length) {
      showToast(`Gagal verifikasi KTM: ${error?.message ?? 'tidak ada baris ter-update (cek role admin / RLS)'}`)
      return
    }
    showToast('Berhasil: KTM diverifikasi!'); load()
  }

  const handleChangeTier = async (userId: string, membershipId: string, tier: string) => {
    const { data, error } = await supabase.from('memberships').update({ tier }).eq('id', membershipId).select('id')
    if (error || !data?.length) {
      showToast(`Gagal ubah tier: ${error?.message ?? 'tidak ada baris ter-update (cek role admin / RLS)'}`)
      return
    }
    showToast('Berhasil: Tier berhasil diubah!'); load()
  }

  const handlePayment = async (membershipId: string, action: 'approve' | 'reject') => {
    const status = action === 'approve' ? 'active' : 'cancelled'
    const { data, error } = await supabase.from('memberships').update({ status }).eq('id', membershipId).select('id')
    if (error || !data?.length) {
      showToast(`Gagal update pembayaran: ${error?.message ?? 'tidak ada baris ter-update (cek role admin / RLS)'}`)
      return
    }
    showToast(action === 'approve' ? 'Berhasil: Pembayaran dikonfirmasi!' : 'Pembayaran ditolak')
    load()
  }

  const filtered = members.filter(m => {
    const name = (m.profile.full_name ?? '').toLowerCase()
    const phone = (m.profile.phone ?? '').toLowerCase()
    if (search && !name.includes(search.toLowerCase()) && !phone.includes(search.toLowerCase())) return false
    if (filterTier !== 'all' && m.membership?.tier !== filterTier) return false
    if (filterStatus !== 'all' && (m.membership?.status ?? 'none') !== filterStatus) return false
    if (filterStudent === 'student' && !m.profile.is_student) return false
    if (filterStudent === 'non_student' && m.profile.is_student) return false
    return true
  })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Member</h1>
          <p className="text-slate-500 mt-1">Kelola profil & membership komunitas Semejakerja</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Users size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Member Aktif</p>
            <p className="text-2xl font-bold text-slate-900">{members.filter(m => m.membership?.status === 'active').length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><Clock size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Menunggu Pembayaran</p>
            <p className="text-2xl font-bold text-slate-900">{members.filter(m => m.membership?.status === 'pending_payment').length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><GraduationCap size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Mahasiswa Verified</p>
            <p className="text-2xl font-bold text-slate-900">{members.filter(m => m.profile.is_student && m.profile.student_verified_at).length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / no WA..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm w-48 focus:outline-none focus:ring-2 focus:ring-purple-400" />
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
          <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua</option>
            <option value="student">Mahasiswa</option>
            <option value="non_student">Non-mahasiswa</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-medium">Anggota</th>
                <th className="px-5 py-3.5 font-medium">Tier Membership</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Bergabung</th>
                <th className="px-5 py-3.5 font-medium">Mahasiswa</th>
                <th className="px-5 py-3.5 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Tidak ada member ditemukan.</td></tr>
              ) : filtered.map(({ profile, membership }) => (
                <tr key={profile.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{profile.full_name ?? 'Nama belum diisi'}</p>
                    <p className="text-xs text-slate-400">{profile.phone ?? '—'}</p>
                  </td>
                  <td className="px-5 py-4">
                    {membership ? (
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_LABELS[membership.tier]?.color}`}>
                          {TIER_LABELS[membership.tier]?.label}
                        </span>
                        <select
                          value={membership.tier}
                          onChange={e => handleChangeTier(profile.id, membership.id, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                        >
                          <option value="nyantai">Nyantai</option>
                          <option value="nongkrong">Nongkrong</option>
                          <option value="mode_serius">Mode Serius</option>
                        </select>
                      </div>
                    ) : <span className="text-slate-400 text-xs">Belum ada membership</span>}
                  </td>
                  <td className="px-5 py-4">
                    {membership ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[membership.status]}`}>
                        {membership.status}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">{formatDate(profile.created_at)}</td>
                  <td className="px-5 py-4">
                    {profile.is_student ? (
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-blue-500" />
                        {profile.student_verified_at ? (
                          <span className="text-xs text-emerald-600 font-medium">Verified</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Belum verify</span>
                        )}
                      </div>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2">
                      {profile.is_student && !profile.student_verified_at && (
                        <button
                          onClick={() => handleVerifyKTM(profile.id)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium flex items-center gap-1 transition w-max"
                        >
                          <CheckCircle size={12} /> Verif KTM
                        </button>
                      )}
                      
                      {membership?.status === 'pending_payment' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePayment(membership.id, 'approve')}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium flex items-center gap-1 transition w-max"
                          >
                            <CreditCard size={12} /> Konfirmasi Bayar
                          </button>
                          <button
                            onClick={() => handlePayment(membership.id, 'reject')}
                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium flex items-center gap-1 transition w-max"
                          >
                            <XCircle size={12} /> Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">{filtered.length} member</div>
      </div>
    </div>
  )
}
