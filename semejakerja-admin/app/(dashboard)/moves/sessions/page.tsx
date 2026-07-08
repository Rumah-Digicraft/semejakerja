'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSettings } from '@/lib/useAppSettings'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import {
  Plus, Edit2, AlertTriangle, Loader2, X,
  CalendarDays, Users, MapPin, Copy, Check, ExternalLink,
  Target, Activity, Trophy, CircleDot, Clock
} from 'lucide-react'
import Link from 'next/link'

// ── Tipe dari semejamoves-web-apps (tabel: sessions) ──────────────────────
interface SessionSlot { time: string; courts: string }
type SportType = 'funminton' | 'padel' | 'basketball' | 'volleyball'

interface Session {
  id: string
  sport_type: SportType
  session_date: string
  session_slots: SessionSlot[] | null
  venue: string
  max_participants: number
  price_per_person: number
  court_cost: number
  other_cost: number
  other_cost_description: string | null
  notes: string | null
  token: string
  status: 'open' | 'closed' | 'done'
  created_at: string
  participants?: { payment_status: string }[]
}

interface SessionForm {
  sport_type: SportType
  session_date: string
  venue: string
  max_participants: number
  price_per_person: number
  court_cost: number
  other_cost: number
  other_cost_description: string
  notes: string
  status: 'open' | 'closed' | 'done'
}

const EMPTY_FORM: SessionForm = {
  sport_type: 'funminton',
  session_date: '',
  venue: '',
  max_participants: 24,
  price_per_person: 15000,
  court_cost: 0,
  other_cost: 0,
  other_cost_description: '',
  notes: '',
  status: 'open',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700' },
  closed: { label: 'Closed', color: 'bg-amber-100 text-amber-700' },
  done: { label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
}

const SPORT_CONFIG: Record<SportType, { label: string; color: string; icon: React.ReactNode }> = {
  funminton: { label: 'Funminton', color: 'bg-emerald-100 text-emerald-700', icon: <Target size={16} /> },
  padel: { label: 'Padel', color: 'bg-indigo-100 text-indigo-700', icon: <CircleDot size={16} /> },
  basketball: { label: 'Basketball', color: 'bg-orange-100 text-orange-700', icon: <Activity size={16} /> },
  volleyball: { label: 'Volleyball', color: 'bg-amber-100 text-amber-700', icon: <Trophy size={16} /> },
}

export default function SessionsPage() {
  const supabase = createClient()
  const { landingUrl } = useAppSettings()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSport, setFilterSport] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Session | null>(null)
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM)
  const [slots, setSlots] = useState<SessionSlot[]>([{ time: '', courts: '' }])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    // ── Query dari tabel 'sessions' (semejamoves-web-apps) ──
    let q = supabase
      .from('sessions')
      .select('*, participants(payment_status)')
      .order('session_date', { ascending: false })
    if (filterSport !== 'all') q = q.eq('sport_type', filterSport)
    if (filterStatus !== 'all') q = q.eq('status', filterStatus)
    const { data } = await q
    setSessions(data ?? [])
    setLoading(false)
  }, [filterSport, filterStatus])

  useEffect(() => {
    // Defer a frame so setLoading(true) inside load() isn't a sync
    // setState in the effect body (react-hooks/set-state-in-effect).
    const id = requestAnimationFrame(() => { load() })
    return () => cancelAnimationFrame(id)
  }, [load])

  const openCreate = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setSlots([{ time: '', courts: '' }])
    setShowModal(true)
  }

  const openEdit = (s: Session) => {
    setEditItem(s)
    setForm({
      sport_type: s.sport_type,
      session_date: s.session_date,
      venue: s.venue,
      max_participants: s.max_participants,
      price_per_person: s.price_per_person,
      court_cost: s.court_cost,
      other_cost: s.other_cost,
      other_cost_description: s.other_cost_description ?? '',
      notes: s.notes ?? '',
      status: s.status,
    })
    setSlots(s.session_slots ?? [{ time: '', courts: '' }])
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const cleanSlots = slots.filter(s => s.time || s.courts)
    const payload = {
      ...form,
      session_slots: cleanSlots.length > 0 ? cleanSlots : null,
      other_cost_description: form.other_cost_description || null,
      notes: form.notes || null,
    }

    const { error } = editItem
      ? await supabase.from('sessions').update(payload).eq('id', editItem.id)
      : await supabase.from('sessions').insert(payload)

    setSaving(false)
    if (error) { showToast('Gagal: ' + error.message); return }
    showToast(editItem ? 'Sesi diperbarui!' : 'Sesi baru dibuat!')
    setShowModal(false)
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('sessions').update({ status }).eq('id', id)
    showToast('Status sesi diperbarui!')
    load()
  }

  const copyLink = (token: string, type: SportType) => {
    const sport = type === 'funminton' ? 'f' : 'p'
    // Public join page lives on the landing site; domain aktif dibaca dari app_settings
    const link = `${landingUrl}/moves/join?sport=${sport}&token=${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    showToast('Link public form disalin!')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const updateSlot = (i: number, field: 'time' | 'courts', value: string) => {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  // Stats ringkas
  const totalSessions = sessions.length
  const openSessions = sessions.filter(s => s.status === 'open').length
  const totalParticipants = sessions.reduce((acc, s) => acc + (s.participants?.length ?? 0), 0)

  const { page, setPage, pageCount, pageItems, pageSize, total } = usePagination(
    sessions,
    `${filterSport}|${filterStatus}`,
  )

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
          <h1 className="text-2xl font-bold text-slate-900">Jadwal & Sesi Moves</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Data dari <code className="bg-slate-100 px-1.5 py-0.5 rounded text-purple-600 text-xs">sessions</code> table · semejamoves-web-apps
          </p>
        </div>
        <div className="flex gap-2">
          <select value={filterSport} onChange={e => setFilterSport(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Sport</option>
            <option value="funminton">🏸 Funminton</option>
            <option value="padel">🎾 Padel</option>
            <option value="basketball">🏀 Basketball</option>
            <option value="volleyball">🏐 Volleyball</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="done">Done</option>
          </select>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <Plus size={16} /> Buat Sesi
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3 mb-6">
        {[
          { label: 'Total Sesi', value: totalSessions, color: 'text-slate-700' },
          { label: 'Sesi Open', value: openSessions, color: 'text-blue-600' },
          { label: 'Total Peserta', value: totalParticipants, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl px-4 py-2.5 border border-slate-100 text-center min-w-[90px]">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
              <div className="h-5 bg-slate-100 rounded w-48 mb-3" />
              <div className="h-4 bg-slate-50 rounded w-full" />
            </div>
          ))
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-slate-100 text-center text-slate-400">
            <CalendarDays size={40} className="mx-auto mb-3 text-slate-200" />
            <p>Tidak ada sesi ditemukan.</p>
          </div>
        ) : pageItems.map(session => {
          const sport = SPORT_CONFIG[session.sport_type]
          const participantCount = session.participants?.length ?? 0
          const paidCount = session.participants?.filter(p => p.payment_status === 'approved').length ?? 0
          const fillRate = session.max_participants > 0 ? (participantCount / session.max_participants) * 100 : 0

          return (
            <div key={session.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Title row */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="p-1 bg-slate-100 rounded-md text-slate-700">{sport.icon}</span> {formatDate(session.session_date)}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sport.color}`}>
                      {sport.label}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[session.status]?.color}`}>
                      {STATUS_CONFIG[session.status]?.label}
                    </span>
                  </div>

                  {/* Info row */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500 mb-3">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} /> {session.venue}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={13} />
                      <strong className={participantCount >= session.max_participants ? 'text-red-500' : 'text-slate-700'}>
                        {participantCount}
                      </strong>/{session.max_participants} peserta
                    </span>
                    <span className="text-purple-600 font-medium">
                      {formatCurrency(session.price_per_person)}/orang
                    </span>
                    {session.court_cost > 0 && (
                      <span className="text-slate-400 text-xs">
                        Lapangan: {formatCurrency(session.court_cost)}
                      </span>
                    )}
                  </div>

                  {/* Slot jadwal */}
                  {session.session_slots && session.session_slots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {session.session_slots.map((slot, i) => (
                        <span key={i} className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" /> {slot.time} · {slot.courts}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Payment progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${participantCount > 0 ? (paidCount / participantCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {paidCount}/{participantCount} lunas
                    </span>
                  </div>

                  {session.notes && (
                    <p className="text-xs text-slate-400 mt-2 italic">{session.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <select
                    value={session.status}
                    onChange={e => handleStatusChange(session.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="done">Done</option>
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyLink(session.token, session.sport_type)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                      title="Copy public form link"
                    >
                      {copiedToken === session.token ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => openEdit(session)}
                      className="p-1.5 rounded-lg hover:bg-purple-50 hover:text-purple-600 text-slate-400 transition"
                      title="Edit sesi"
                    >
                      <Edit2 size={14} />
                    </button>
                    <Link
                      href={`/moves/sessions/${session.id}`}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition"
                      title="Lihat detail sesi"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!loading && sessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-3 overflow-hidden">
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="sesi" />
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">{editItem ? 'Edit Sesi' : 'Buat Sesi Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Sport *</label>
                  <select
                    value={form.sport_type}
                    onChange={e => setForm({ ...form, sport_type: e.target.value as SportType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="funminton">🏸 Funminton</option>
                    <option value="padel">🎾 Padel</option>
                    <option value="basketball">🏀 Basketball</option>
                    <option value="volleyball">🏐 Volleyball</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal *</label>
                  <input
                    required type="date"
                    value={form.session_date}
                    onChange={e => setForm({ ...form, session_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Venue / GOR *</label>
                  <input
                    required
                    value={form.venue}
                    onChange={e => setForm({ ...form, venue: e.target.value })}
                    placeholder="GOR Satria Purwokerto"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as SessionForm['status'] })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              {/* Session Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Jadwal & Lapangan</label>
                  <button
                    type="button"
                    onClick={() => setSlots(prev => [...prev, { time: '', courts: '' }])}
                    className="text-xs text-purple-600 font-medium flex items-center gap-1 hover:opacity-80"
                  >
                    <Plus size={12} /> Tambah Slot
                  </button>
                </div>
                <div className="space-y-2">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text" placeholder="19.00–21.00"
                        value={slot.time} onChange={e => updateSlot(i, 'time', e.target.value)}
                        className="w-32 flex-shrink-0 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                      />
                      <input
                        type="text" placeholder="Lapangan 1 & 5"
                        value={slot.courts} onChange={e => updateSlot(i, 'courts', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                      />
                      {slots.length > 1 && (
                        <button type="button" onClick={() => setSlots(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Maks Peserta</label>
                  <input
                    type="number" min={1} required
                    value={form.max_participants}
                    onChange={e => setForm({ ...form, max_participants: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Harga / Orang (Rp)</label>
                  <input
                    type="number" min={0} required
                    value={form.price_per_person}
                    onChange={e => setForm({ ...form, price_per_person: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Biaya Lapangan (Rp)</label>
                  <input
                    type="number" min={0}
                    value={form.court_cost}
                    onChange={e => setForm({ ...form, court_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Biaya Lain (Rp)</label>
                  <input
                    type="number" min={0}
                    value={form.other_cost}
                    onChange={e => setForm({ ...form, other_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              {form.other_cost > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Biaya Lain</label>
                  <input
                    type="text" placeholder="Kok, minum, dll"
                    value={form.other_cost_description}
                    onChange={e => setForm({ ...form, other_cost_description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
                <button
                  type="submit" disabled={saving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editItem ? 'Perbarui Sesi' : 'Simpan Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
