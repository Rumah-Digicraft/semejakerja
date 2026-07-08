'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { formatDate, formatDatetime, formatCurrency } from '@/lib/utils/format'
import { CheckCircle, XCircle, Search, Download, UserCheck, Clock } from 'lucide-react'

// ── Tipe dari semejamoves-web-apps (tabel: participants) ────────────────────
type SportType = 'funminton' | 'padel' | 'basketball' | 'volleyball'

interface Participant {
  id: string
  session_id: string
  name: string
  phone: string | null
  attended: boolean
  payment_status: 'pending' | 'approved' | 'rejected'
  payment_amount: number | null
  payment_date: string | null
  payment_proof_url: string | null
  ocr_match: boolean | null
  submitted_at: string | null
  created_at: string
  // join
  session?: {
    id: string
    session_date: string
    venue: string
    sport_type: SportType
  } | null
}

interface SessionOption {
  id: string
  session_date: string
  venue: string
  sport_type: SportType
}

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Lunas', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-500' },
}

const SPORT_EMOJI: Record<SportType, string> = {
  funminton: '🏸', padel: '🎾', basketball: '🏀', volleyball: '🏐'
}

export default function ParticipantsPage() {
  const supabase = createClient()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState('all')
  const [filterSport, setFilterSport] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [sessionsRes, participantsRes] = await Promise.all([
      // Ambil semua sesi untuk dropdown
      supabase
        .from('sessions')
        .select('id, session_date, venue, sport_type')
        .order('session_date', { ascending: false })
        .limit(100),
      // Ambil peserta dari tabel 'participants'
      (() => {
        let q = supabase
          .from('participants')
          .select('*, session:sessions(id, session_date, venue, sport_type)')
          .order('created_at', { ascending: false })
        if (selectedSession !== 'all') q = q.eq('session_id', selectedSession)
        if (filterStatus !== 'all') q = q.eq('payment_status', filterStatus)
        return q
      })()
    ])
    setSessions(sessionsRes.data ?? [])

    // Filter sport type (dari join sessions)
    let data = (participantsRes.data ?? []) as Participant[]
    if (filterSport !== 'all') {
      data = data.filter(p => p.session?.sport_type === filterSport)
    }
    setParticipants(data)
    setLoading(false)
  }, [selectedSession, filterSport, filterStatus])

  useEffect(() => { load() }, [load])

  // Konfirmasi pembayaran
  const handleApprove = async (id: string) => {
    await supabase.from('participants').update({
      payment_status: 'approved',
      payment_date: new Date().toISOString().split('T')[0],
    }).eq('id', id)
    showToast('✅ Pembayaran dikonfirmasi (Approved)!')
    load()
  }

  // Tolak pembayaran
  const handleReject = async (id: string) => {
    if (!confirm('Tolak pembayaran peserta ini?')) return
    await supabase.from('participants').update({ payment_status: 'rejected' }).eq('id', id)
    showToast('❌ Pembayaran ditolak')
    load()
  }

  // Toggle kehadiran
  const handleToggleAttend = async (id: string, current: boolean) => {
    await supabase.from('participants').update({ attended: !current }).eq('id', id)
    showToast(current ? '📤 Kehadiran dibatalkan' : '✅ Peserta ditandai hadir!')
    load()
  }

  // Export CSV
  const exportCSV = () => {
    const rows = filtered.map(p => [
      p.name,
      p.phone ?? '',
      p.session?.sport_type ?? '',
      p.session ? formatDate(p.session.session_date) : '',
      p.session?.venue ?? '',
      PAYMENT_STATUS[p.payment_status]?.label ?? '',
      p.payment_amount ? formatCurrency(p.payment_amount) : '',
      p.attended ? 'Hadir' : 'Tidak Hadir',
      p.ocr_match === true ? 'Match' : p.ocr_match === false ? 'No Match' : '',
      p.created_at ? formatDatetime(p.created_at) : '',
    ])
    const csv = [
      ['Nama', 'No HP', 'Sport', 'Tgl Sesi', 'Venue', 'Status Bayar', 'Jumlah Bayar', 'Kehadiran', 'OCR', 'Waktu Daftar'],
      ...rows
    ].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `peserta-moves-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showToast('📥 CSV berhasil didownload!')
  }

  // Filter search
  const filtered = participants.filter(p => {
    const name = (p.name ?? '').toLowerCase()
    const phone = (p.phone ?? '').toLowerCase()
    return !search || name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase())
  })

  const { page, setPage, pageCount, pageItems, pageSize, total } = usePagination(
    filtered,
    `${search}|${selectedSession}|${filterSport}|${filterStatus}`,
  )

  // Mini stats
  const stats = {
    total: filtered.length,
    approved: filtered.filter(p => p.payment_status === 'approved').length,
    pending: filtered.filter(p => p.payment_status === 'pending').length,
    attended: filtered.filter(p => p.attended).length,
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Peserta Semeja Moves</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Data dari <code className="bg-slate-100 px-1.5 py-0.5 rounded text-purple-600 text-xs">participants</code> table · semejamoves-web-apps
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={selectedSession}
          onChange={e => setSelectedSession(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none min-w-[200px]"
        >
          <option value="all">Semua Sesi</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {SPORT_EMOJI[s.sport_type]} {formatDate(s.session_date)} · {s.venue}
            </option>
          ))}
        </select>
        <select value={filterSport} onChange={e => setFilterSport(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="all">Semua Sport</option>
          <option value="funminton">🏸 Funminton</option>
          <option value="padel">🎾 Padel</option>
          <option value="basketball">🏀 Basketball</option>
          <option value="volleyball">🏐 Volleyball</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Lunas</option>
          <option value="rejected">Ditolak</option>
        </select>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / no HP..."
            className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm w-48 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      {/* Mini stats */}
      <div className="flex gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700' },
          { label: 'Lunas', value: stats.approved, color: 'text-emerald-600' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
          { label: 'Hadir', value: stats.attended, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl px-4 py-2.5 border border-slate-100 text-center min-w-[70px]">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-medium">Peserta</th>
                <th className="px-5 py-3.5 font-medium">Sesi</th>
                <th className="px-5 py-3.5 font-medium">Status Bayar</th>
                <th className="px-5 py-3.5 font-medium">Jumlah</th>
                <th className="px-5 py-3.5 font-medium">Kehadiran</th>
                <th className="px-5 py-3.5 font-medium">OCR</th>
                <th className="px-5 py-3.5 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Tidak ada peserta ditemukan.
                  </td>
                </tr>
              ) : pageItems.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition">
                  {/* Peserta */}
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{p.name}</p>
                    {p.phone && (
                      <a
                        href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-purple-600 hover:underline"
                      >
                        {p.phone}
                      </a>
                    )}
                  </td>

                  {/* Sesi */}
                  <td className="px-5 py-4">
                    {p.session ? (
                      <div>
                        <p className="text-xs font-medium text-slate-700">
                          {SPORT_EMOJI[p.session.sport_type]} {formatDate(p.session.session_date)}
                        </p>
                        <p className="text-xs text-slate-400">{p.session.venue}</p>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Status bayar */}
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PAYMENT_STATUS[p.payment_status]?.color}`}>
                      {PAYMENT_STATUS[p.payment_status]?.label}
                    </span>
                    {p.payment_proof_url && (
                      <a
                        href={p.payment_proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1.5 text-xs text-purple-500 underline"
                      >
                        Bukti
                      </a>
                    )}
                  </td>

                  {/* Jumlah bayar */}
                  <td className="px-5 py-4 font-medium text-purple-700 text-sm">
                    {p.payment_amount ? formatCurrency(p.payment_amount) : '—'}
                  </td>

                  {/* Kehadiran */}
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleAttend(p.id, p.attended)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition ${p.attended ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      <UserCheck size={12} />
                      {p.attended ? 'Hadir' : 'Absen'}
                    </button>
                  </td>

                  {/* OCR */}
                  <td className="px-5 py-4">
                    {p.ocr_match === true && <span className="text-xs text-emerald-600 font-medium">✓ Match</span>}
                    {p.ocr_match === false && <span className="text-xs text-red-400 font-medium">✗ Mismatch</span>}
                    {p.ocr_match === null && <span className="text-slate-300 text-xs">—</span>}
                  </td>

                  {/* Aksi */}
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      {p.payment_status === 'pending' && (
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                          title="Approve pembayaran"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {p.payment_status !== 'rejected' && (
                        <button
                          onClick={() => handleReject(p.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition"
                          title="Tolak pembayaran"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="peserta" />}
      </div>
    </div>
  )
}
