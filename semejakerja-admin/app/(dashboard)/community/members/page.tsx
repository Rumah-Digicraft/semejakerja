'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import type { Membership, UserProfile } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { Search, CheckCircle, XCircle, Loader2, GraduationCap, ChevronDown, CreditCard, Users, Clock, Eye, X, Phone, Briefcase, MapPin, CalendarClock, Tag, History } from 'lucide-react'

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

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  expired: 'Kadaluarsa',
  cancelled: 'Dibatalkan',
  pending_payment: 'Menunggu Pembayaran',
}

const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '62')}`

interface MemberRow {
  profile: UserProfile
  membership?: Membership
  history: Membership[]
}

export default function MembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStudent, setFilterStudent] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
    const historyMap: Record<string, Membership[]> = {}
    memberships?.forEach(m => {
      const existing = memberMap[m.user_id]
      if (!existing || (m.status === 'active' && existing.status !== 'active')) {
        memberMap[m.user_id] = m
      }
      ;(historyMap[m.user_id] ??= []).push(m)
    })

    const rows: MemberRow[] = (profiles ?? []).map(p => ({
      profile: p,
      membership: memberMap[p.id],
      history: historyMap[p.id] ?? [],
    }))
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

  const { page, setPage, pageCount, pageItems, pageSize, total } = usePagination(
    filtered,
    `${search}|${filterTier}|${filterStatus}|${filterStudent}`,
  )

  // Derived from members so the modal stays fresh after load() re-fetches
  const selected = selectedId ? members.find(m => m.profile.id === selectedId) : undefined

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
              ) : pageItems.map(({ profile, membership }) => (
                <tr key={profile.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <button onClick={() => setSelectedId(profile.id)} className="text-left group">
                      <p className="font-medium text-slate-900 group-hover:text-purple-600 transition">{profile.full_name ?? 'Nama belum diisi'}</p>
                      <p className="text-xs text-slate-400">{profile.phone ?? '—'}</p>
                    </button>
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
                      <button
                        onClick={() => setSelectedId(profile.id)}
                        className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 transition w-max"
                      >
                        <Eye size={12} /> Detail
                      </button>
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
        {!loading && <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="member" />}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                {selected.profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.profile.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl font-bold">
                    {(selected.profile.full_name ?? '?').trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.profile.full_name ?? 'Nama belum diisi'}</h2>
                  {selected.profile.nickname && <p className="text-sm text-slate-500">&ldquo;{selected.profile.nickname}&rdquo;</p>}
                  {selected.profile.is_student && (
                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${selected.profile.student_verified_at ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <GraduationCap size={12} />
                      {selected.profile.student_verified_at ? 'Mahasiswa Terverifikasi' : 'Mahasiswa (belum verifikasi)'}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            {/* Profile info */}
            <div className="p-6 space-y-3 border-b border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Profil</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Phone size={15} className="text-slate-400 flex-shrink-0" />
                  {selected.profile.phone ? (
                    <a href={waLink(selected.profile.phone)} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-medium hover:underline">
                      {selected.profile.phone}
                    </a>
                  ) : '—'}
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Briefcase size={15} className="text-slate-400 flex-shrink-0" />
                  {selected.profile.occupation ?? '—'}
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                  {selected.profile.city ?? '—'}
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <CalendarClock size={15} className="text-slate-400 flex-shrink-0" />
                  Bergabung {formatDate(selected.profile.created_at)}
                </div>
              </div>
              {selected.profile.is_student && !selected.profile.student_verified_at && (
                <button
                  onClick={() => handleVerifyKTM(selected.profile.id)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                >
                  <CheckCircle size={12} /> Verif KTM
                </button>
              )}
            </div>

            {/* Current membership */}
            <div className="p-6 space-y-3 border-b border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Membership</h3>
              {selected.membership ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_LABELS[selected.membership.tier]?.color}`}>
                      {TIER_LABELS[selected.membership.tier]?.label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selected.membership.status]}`}>
                      {STATUS_LABELS[selected.membership.status] ?? selected.membership.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2.5">
                      <CalendarClock size={15} className="text-slate-400 flex-shrink-0" />
                      Mulai {formatDate(selected.membership.started_at)}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-slate-400 flex-shrink-0" />
                      {selected.membership.expires_at ? `Berakhir ${formatDate(selected.membership.expires_at)}` : 'Tanpa masa berakhir'}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={15} className="text-slate-400 flex-shrink-0" />
                      {formatCurrency(selected.membership.price_paid)}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Tag size={15} className="text-slate-400 flex-shrink-0" />
                      {selected.membership.promo_code_used ?? 'Tanpa promo'}
                    </div>
                  </div>
                  {selected.membership.status === 'pending_payment' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handlePayment(selected.membership!.id, 'approve')}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                      >
                        <CreditCard size={12} /> Konfirmasi Bayar
                      </button>
                      <button
                        onClick={() => handlePayment(selected.membership!.id, 'reject')}
                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                      >
                        <XCircle size={12} /> Tolak
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">Belum ada membership.</p>
              )}
            </div>

            {/* Membership history */}
            {selected.history.length > 1 && (
              <div className="p-6 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                  <History size={13} /> Riwayat Membership
                </h3>
                <ul className="space-y-2">
                  {selected.history.map(m => (
                    <li key={m.id} className="flex items-center justify-between gap-3 text-sm bg-slate-50 rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TIER_LABELS[m.tier]?.color}`}>
                          {TIER_LABELS[m.tier]?.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[m.status]}`}>
                          {STATUS_LABELS[m.status] ?? m.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(m.created_at)} · {formatCurrency(m.price_paid)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
