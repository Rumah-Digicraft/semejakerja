'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppSettings } from '@/lib/useAppSettings'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { 
  Check, X, Copy, Image as ImageIcon, Trash2, Plus, Settings, 
  ArrowLeft, ChevronRight, CheckCircle, XCircle, MapPin, Users,
  Target, Activity, Trophy, CircleDot, AlertCircle, Calendar
} from 'lucide-react'
import Link from 'next/link'

type SportType = 'funminton' | 'padel' | 'basketball' | 'volleyball'

interface PollingConfig {
  enabled: boolean
  question: string
  options: string[]
}

interface AnnouncementConfig {
  enabled: boolean
  type: 'next_session' | 'libur' | 'custom'
  title: string
  date: string
  caption: string
}

interface Session {
  id: string
  sport_type: SportType
  session_date: string
  venue: string
  max_participants: number
  price_per_person: number
  court_cost: number
  other_cost: number
  other_cost_description: string | null
  notes: string | null
  token: string
  status: 'open' | 'closed' | 'done'
  polling_config: PollingConfig | null
  announcement_config: AnnouncementConfig | null
}

interface Participant {
  id: string
  session_id: string
  name: string
  phone: string | null
  attended: boolean
  payment_status: 'pending' | 'approved' | 'rejected'
  payment_proof_url: string | null
  ocr_raw: any | null
  ocr_match: boolean | null
  kritik_saran: string | null
  polling_hari: string | null
}

const SPORT_CONFIG: Record<SportType, { icon: React.ReactNode }> = {
  funminton: { icon: <Target size={24} className="text-emerald-600" /> },
  padel: { icon: <CircleDot size={24} className="text-indigo-600" /> },
  basketball: { icon: <Activity size={24} className="text-orange-600" /> },
  volleyball: { icon: <Trophy size={24} className="text-amber-600" /> },
}

export default function SessionDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const supabase = createClient()
  const { movesUrl } = useAppSettings()

  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'peserta' | 'pembayaran' | 'ringkasan'>('peserta')
  
  // Modals state
  const [newParticipant, setNewParticipant] = useState({ name: '', phone: '' })
  const [addMode, setAddMode] = useState<'manual' | 'wa'>('manual')
  const [waText, setWaText] = useState('')
  const [detectedNames, setDetectedNames] = useState<{ name: string; checked: boolean }[]>([])
  const [isEditCostModalOpen, setIsEditCostModalOpen] = useState(false)
  const [costForm, setCostForm] = useState({ court_cost: 0, additional_court_cost: 0, other_costs: [] as {desc: string, amount: number}[] })
  const [isCopied, setIsCopied] = useState(false)
  const [isPollingModalOpen, setIsPollingModalOpen] = useState(false)
  const [pollingForm, setPollingForm] = useState<PollingConfig>({ enabled: false, question: 'Minggu depan mau main kapan?', options: ['Jumat Malam', 'Sabtu Pagi'] })
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false)
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementConfig>({ enabled: false, type: 'next_session', title: 'Funminton Malam Minggu', date: '', caption: 'no cap minggu depan kita minton lagi bestie, jangan ghosting ya fr fr' })
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const getParsedOtherCosts = (sessionData: Session | null) => {
    if (!sessionData) return []
    try {
      if (sessionData.other_cost_description?.startsWith('[')) {
        return JSON.parse(sessionData.other_cost_description)
      }
    } catch(e) {}
    if (sessionData.other_cost > 0 || sessionData.other_cost_description) {
      return [{ desc: sessionData.other_cost_description || 'Biaya Lain', amount: sessionData.other_cost }]
    }
    return []
  }

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data: sessionData } = await supabase.from('sessions').select('*').eq('id', id).single()
    const { data: participantsData } = await supabase.from('participants').select('*').eq('session_id', id).order('created_at', { ascending: true })
    
    if (sessionData) {
      setSession(sessionData)
      setCostForm({
        court_cost: sessionData.court_cost,
        additional_court_cost: 0,
        other_costs: getParsedOtherCosts(sessionData)
      })
      if (sessionData.polling_config) setPollingForm(sessionData.polling_config)
      if (sessionData.announcement_config) setAnnouncementForm(sessionData.announcement_config)
    }
    if (participantsData) setParticipants(participantsData)
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { loadData() }, [loadData])

  const handleCopyLink = () => {
    if (!session) return
    const prefix = session.sport_type === 'funminton' ? 'f' : 'p'
    const link = `${movesUrl}/${prefix}/${session.token}`
    navigator.clipboard.writeText(link)
    setIsCopied(true)
    showToast('Link disalin!')
    setTimeout(() => setIsCopied(false), 2000)
  }

  // --- ACTIONS ---
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    const names = newParticipant.name.split('\n').filter(n => n.trim())
    const inserts = names.map(n => ({
      session_id: id, name: n.trim(), phone: newParticipant.phone || null
    }))
    await supabase.from('participants').insert(inserts)
    setNewParticipant({ name: '', phone: '' })
    showToast(`${names.length} peserta ditambahkan`)
    loadData()
  }

  const handleDetectNames = () => {
    const matches = [...waText.matchAll(/^\d+\.\s+(.+)/gm)]
    const names = matches.map(m => m[1].trim()).filter(Boolean)
    setDetectedNames(names.map(name => ({ name, checked: true })))
  }

  const toggleDetected = (i: number) => {
    setDetectedNames(prev => prev.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item))
  }

  const handleAddFromWA = async () => {
    if (!id) return
    const inserts = detectedNames.filter(d => d.checked).map(d => ({ session_id: id, name: d.name, phone: null }))
    if (inserts.length === 0) return
    await supabase.from('participants').insert(inserts)
    setWaText(''); setDetectedNames([]); setAddMode('manual')
    showToast(`${inserts.length} peserta di-import`)
    loadData()
  }

  const toggleAttendance = async (pid: string, current: boolean) => {
    await supabase.from('participants').update({ attended: !current }).eq('id', pid)
    loadData()
  }

  const updatePaymentStatus = async (pid: string, status: 'approved' | 'rejected') => {
    await supabase.from('participants').update({ payment_status: status }).eq('id', pid)
    loadData()
  }

  const deleteParticipant = async (pid: string) => {
    if (!confirm('Hapus peserta ini?')) return
    await supabase.from('participants').delete().eq('id', pid)
    showToast('Peserta dihapus')
    loadData()
  }

  const handleUpdateCosts = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !session) return
    const totalOtherCost = costForm.other_costs.reduce((sum, cost) => sum + cost.amount, 0)
    const otherCostDesc = JSON.stringify(costForm.other_costs)
    await supabase.from('sessions').update({
      court_cost: costForm.court_cost + costForm.additional_court_cost,
      other_cost: totalOtherCost,
      other_cost_description: otherCostDesc
    }).eq('id', id)
    setIsEditCostModalOpen(false)
    showToast('Biaya diperbarui')
    loadData()
  }

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    await supabase.from('sessions').update({ announcement_config: announcementForm }).eq('id', id)
    setIsAnnouncementModalOpen(false)
    showToast('Pengumuman disimpan')
    loadData()
  }

  const handleSavePolling = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    await supabase.from('sessions').update({ polling_config: pollingForm }).eq('id', id)
    setIsPollingModalOpen(false)
    showToast('Polling disimpan')
    loadData()
  }

  const markAsDone = async () => {
    if (!session || !id) return
    if (!confirm('Tutup sesi dan masukkan ke laporan keuangan (cashflow)?')) return

    const totalIncome = participants.filter(p => p.payment_status === 'approved').length * session.price_per_person
    const entries = []

    if (session.court_cost > 0) {
      entries.push({ session_id: id, sport_type: session.sport_type, entry_date: new Date().toISOString().split('T')[0], category: 'outcome', description: 'Sewa Lapangan', amount: session.court_cost, source: 'auto' })
    }
    const parsedOtherCosts = getParsedOtherCosts(session)
    parsedOtherCosts.forEach((cost: any) => {
      if (cost.amount > 0) entries.push({ session_id: id, sport_type: session.sport_type, entry_date: new Date().toISOString().split('T')[0], category: 'outcome', description: cost.desc || 'Biaya Lain', amount: cost.amount, source: 'auto' })
    })
    if (totalIncome > 0) {
      entries.push({ session_id: id, sport_type: session.sport_type, entry_date: new Date().toISOString().split('T')[0], category: 'income', description: 'Iuran Peserta', amount: totalIncome, source: 'auto' })
    }

    if (entries.length > 0) await supabase.from('cashflow_entries').insert(entries)
    await supabase.from('sessions').update({ status: 'done' }).eq('id', id)
    showToast('Sesi selesai & cashflow dicatat')
    loadData()
  }

  const deleteSession = async () => {
    if (!id) return
    if (!confirm('Yakin ingin menghapus sesi ini beserta seluruh pesertanya secara permanen?')) return
    await supabase.from('cashflow_entries').delete().eq('session_id', id)
    await supabase.from('participants').delete().eq('session_id', id)
    await supabase.from('sessions').delete().eq('id', id)
    router.push('/moves/sessions')
  }

  if (loading || !session) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const totalIncome = participants.filter(p => p.payment_status === 'approved').length * session.price_per_person
  const totalOutcome = session.court_cost + session.other_cost
  const profit = totalIncome - totalOutcome

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/moves/sessions" className="hover:text-purple-600 flex items-center gap-1 transition">
          <ArrowLeft size={14} /> Sesi Moves
        </Link>
        <ChevronRight size={14} />
        <span className="text-slate-800 font-medium">Detail Sesi</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <span className="p-1.5 bg-slate-100 rounded-xl">{SPORT_CONFIG[session.sport_type].icon}</span> 
              {formatDate(session.session_date)}
            </div>
            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
              session.status === 'open' ? 'bg-blue-100 text-blue-700' :
              session.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {session.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {session.venue}</span>
            <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {session.max_participants} Maks Peserta</span>
            <span className="flex items-center gap-1.5 font-medium text-purple-600"><span className="px-1 bg-purple-100 text-purple-600 rounded text-xs font-bold">Rp</span> {formatCurrency(session.price_per_person)}/orang</span>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={deleteSession} className="flex-1 md:flex-none text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition border border-red-100">
            <Trash2 size={16} /> Hapus Sesi
          </button>
          {session.status === 'open' && (
            <button onClick={markAsDone} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition shadow-sm">
              <CheckCircle size={16} /> Selesaikan Sesi
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
        {(['peserta', 'pembayaran', 'ringkasan'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 font-semibold capitalize transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB: PESERTA */}
      {activeTab === 'peserta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-medium w-12 text-center">#</th>
                    <th className="p-4 font-medium">Peserta</th>
                    <th className="p-4 font-medium text-center">Status</th>
                    <th className="p-4 font-medium text-center">Hadir</th>
                    <th className="p-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {participants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 text-slate-400 text-xs text-center">{idx + 1}</td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        {p.phone && <span className="block text-xs text-slate-400">{p.phone}</span>}
                      </td>
                      <td className="p-4 text-center">
                        {p.payment_status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                            Lunas
                          </span>
                        ) : p.payment_status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">
                            Ditolak
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-600">
                            Menunggu
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleAttendance(p.id, p.attended)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition ${p.attended ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          <Check size={16} />
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => deleteParticipant(p.id)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 mx-auto flex transition">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {participants.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada peserta.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            {/* Form Tambah Peserta */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Tambah Peserta</h3>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setAddMode('manual')} className={`px-3 py-1 text-xs font-semibold rounded-md transition ${addMode === 'manual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Manual</button>
                  <button onClick={() => setAddMode('wa')} className={`px-3 py-1 text-xs font-semibold rounded-md transition ${addMode === 'wa' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500'}`}>Import WA</button>
                </div>
              </div>

              {addMode === 'manual' ? (
                <form onSubmit={handleAddParticipant} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nama (Bisa multiple baris)</label>
                    <textarea required rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" placeholder="Andi&#10;Budi&#10;Citra"
                      value={newParticipant.name} onChange={e => setNewParticipant({...newParticipant, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">No. HP (Opsional)</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      value={newParticipant.phone} onChange={e => setNewParticipant({...newParticipant, phone: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-purple-500 transition">Tambahkan</button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Paste teks dari WA</label>
                    <textarea rows={5} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" placeholder="1. Gafar&#10;2. Afif&#10;3. Ilham"
                      value={waText} onChange={e => { setWaText(e.target.value); setDetectedNames([]); }} />
                  </div>
                  <button type="button" onClick={handleDetectNames} disabled={!waText.trim()}
                    className="w-full bg-slate-800 text-white py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition">
                    Deteksi Nama
                  </button>
                  {detectedNames.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 mt-2">
                      <div className="text-xs text-slate-500 font-medium mb-2">{detectedNames.filter(d => d.checked).length} dari {detectedNames.length} nama dipilih</div>
                      <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                        {detectedNames.map((item, i) => (
                          <label key={i} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition ${item.checked ? 'bg-purple-50' : 'bg-white'}`}>
                            <input type="checkbox" checked={item.checked} onChange={() => toggleDetected(i)} className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" />
                            <span className="text-sm font-medium text-slate-800">{item.name}</span>
                          </label>
                        ))}
                      </div>
                      <button type="button" onClick={handleAddFromWA} disabled={detectedNames.filter(d => d.checked).length === 0}
                        className="w-full mt-3 bg-purple-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-purple-500 disabled:opacity-50 transition">
                        Import {detectedNames.filter(d => d.checked).length} Peserta
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Public Link Form */}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-5 border border-purple-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1">Public Link Form</h3>
              <p className="text-xs text-slate-500 mb-4">Bagikan link ini ke grup WA agar peserta bisa daftar & bayar mandiri.</p>
              <div className="flex items-center gap-2">
                <input readOnly value={`${movesUrl}/${session.sport_type === 'funminton' ? 'f' : 'p'}/${session.token}`} className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none" />
                <button onClick={handleCopyLink} className={`p-2 rounded-xl transition text-white shadow-sm flex-shrink-0 ${isCopied ? 'bg-emerald-500' : 'bg-purple-600 hover:bg-purple-500'}`}>
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Pengumuman */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Settings size={16} className="text-slate-400" /> Pengumuman</h3>
                <button onClick={() => setIsAnnouncementModalOpen(true)} className="text-xs text-purple-600 font-semibold hover:underline">Edit</button>
              </div>
              {session.announcement_config?.enabled ? (
                <div className={`p-3 rounded-xl border ${session.announcement_config.type === 'libur' ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full mb-1.5 uppercase ${session.announcement_config.type === 'libur' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {session.announcement_config.type.replace('_', ' ')}
                  </span>
                  <p className="text-sm font-bold text-slate-900">{session.announcement_config.title}</p>
                  {session.announcement_config.date && <p className="text-xs text-slate-600 mt-0.5">{session.announcement_config.date}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">Pengumuman belum diaktifkan.</p>
              )}
            </div>

            {/* Polling */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Settings size={16} className="text-slate-400" /> Polling Form</h3>
                <button onClick={() => setIsPollingModalOpen(true)} className="text-xs text-purple-600 font-semibold hover:underline">Edit</button>
              </div>
              {session.polling_config?.enabled ? (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full mb-1.5 uppercase bg-blue-100 text-blue-700">Aktif</span>
                  <p className="text-sm font-semibold text-slate-800">{session.polling_config.question}</p>
                  <ul className="mt-2 space-y-1 ml-1 border-l-2 border-slate-200 pl-2">
                    {session.polling_config.options.map((opt, i) => (
                      <li key={i} className="text-xs text-slate-500 font-medium">{opt}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">Polling belum diaktifkan.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: PEMBAYARAN */}
      {activeTab === 'pembayaran' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-medium">Nama</th>
                  <th className="p-4 font-medium">Status Bayar</th>
                  <th className="p-4 font-medium">Bukti Foto</th>
                  <th className="p-4 font-medium">Data OCR</th>
                  <th className="p-4 font-medium text-center">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {participants.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-semibold text-slate-900">{p.name}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        p.payment_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        p.payment_status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.payment_status.toUpperCase()}
                      </span>
                      {p.ocr_match === false && <span className="ml-2 text-[10px] uppercase font-bold text-red-500 border border-red-200 px-1.5 py-0.5 rounded">Flagged OCR</span>}
                      {p.ocr_match === true && <span className="ml-2 text-[10px] uppercase font-bold text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded">OCR Match</span>}
                    </td>
                    <td className="p-4">
                      {p.payment_proof_url ? (
                        <a href={p.payment_proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-purple-600 font-medium hover:underline text-xs bg-purple-50 px-2 py-1 rounded-lg w-fit">
                          <ImageIcon size={14} /> Lihat Bukti
                        </a>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-4 text-xs text-slate-500 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={JSON.stringify(p.ocr_raw)}>
                      {p.ocr_raw ? <code className="bg-slate-100 px-1 rounded">{JSON.stringify(p.ocr_raw).substring(0, 30)}...</code> : <span className="italic text-slate-300">Belum upload</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => updatePaymentStatus(p.id, 'approved')} className={`p-1.5 rounded-lg transition ${p.payment_status === 'approved' ? 'bg-emerald-100 text-emerald-600 cursor-default' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`} title="Approve">
                          <CheckCircle size={18} />
                        </button>
                        <button onClick={() => updatePaymentStatus(p.id, 'rejected')} className={`p-1.5 rounded-lg transition ${p.payment_status === 'rejected' ? 'bg-red-100 text-red-500 cursor-default' : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500'}`} title="Reject">
                          <XCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada data pembayaran.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: RINGKASAN */}
      {activeTab === 'ringkasan' && (() => {
        const pollingOptions = session.polling_config?.options ?? []
        const pollCounts = pollingOptions.map(opt => ({
          label: opt, count: participants.filter(p => p.polling_hari === opt).length
        }))
        const totalVotes = pollCounts.reduce((s, o) => s + o.count, 0)
        const saranList = participants.filter(p => p.kritik_saran)

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Kehadiran & Kapasitas</h3>
              <div className="space-y-1">
                <div className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                  <span className="text-slate-500">Kapasitas Sesi</span>
                  <span className="font-semibold text-slate-900">{session.max_participants} orang</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                  <span className="text-slate-500">Total Terdaftar</span>
                  <span className="font-semibold text-slate-900">{participants.length} orang</span>
                </div>
                <div className="flex justify-between items-center py-2 text-sm">
                  <span className="text-slate-500">Total Hadir di Lapangan</span>
                  <span className="font-bold text-emerald-600">{participants.filter(p => p.attended).length} orang</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900">Ringkasan Keuangan</h3>
                <button onClick={() => setIsEditCostModalOpen(true)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition">
                  Edit Biaya
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                  <span className="text-slate-500">Total Pemasukan (Iuran Lunas)</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                  <span className="text-slate-500">Sewa Lapangan</span>
                  <span className="font-semibold text-red-500">-{formatCurrency(session.court_cost)}</span>
                </div>
                {getParsedOtherCosts(session).map((cost: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                    <span className="text-slate-500">Biaya Lain: <span className="italic">{cost.desc || '-'}</span></span>
                    <span className="font-semibold text-red-500">-{formatCurrency(cost.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-slate-100 text-base font-bold">
                <span className="text-slate-900 uppercase text-xs tracking-wider">Profit / Rugi Bersih</span>
                <span className={`px-3 py-1 rounded-lg ${profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {formatCurrency(profit)}
                </span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1">{session.polling_config?.question ?? 'Hasil Polling'}</h3>
              {!session.polling_config?.enabled && <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3 font-medium">Polling belum diaktifkan di form.</p>}
              {totalVotes === 0 ? (
                <p className="text-sm text-slate-400 italic mt-3 bg-slate-50 p-4 rounded-xl text-center">Belum ada peserta yang mem-vote.</p>
              ) : (
                <div className="space-y-4 mt-4">
                  {pollCounts.map(({ label, count }) => {
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-slate-800 font-semibold">{label}</span>
                          <span className="text-slate-500 font-medium">{count} vote ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-3 mt-3 border-t border-slate-50">
                    <p className="text-xs text-slate-400 font-medium text-center">Total <strong className="text-slate-700">{totalVotes}</strong> dari {participants.length} peserta sudah vote</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col max-h-[400px]">
              <h3 className="font-bold text-slate-900 mb-4">Kritik & Saran</h3>
              {saranList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400 font-medium">Belum ada saran masuk dari peserta.</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                  {saranList.map(p => (
                    <div key={p.id} className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">{p.name}</p>
                      <p className="text-sm text-slate-800 leading-relaxed">"{p.kritik_saran}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}


      {/* MODALS */}
      {/* 1. Modal Edit Cost */}
      {isEditCostModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto pt-10">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-5">Update Biaya Operasional</h2>
            <form onSubmit={handleUpdateCosts} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sewa Lapangan (Awal)</label>
                  <input type="number" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={costForm.court_cost} onChange={e => setCostForm({...costForm, court_cost: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tambah Jam (Rp)</label>
                  <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={costForm.additional_court_cost} onChange={e => setCostForm({...costForm, additional_court_cost: Number(e.target.value)})} />
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center text-sm">
                <span className="text-blue-800 font-medium">Total Sewa Lapangan:</span>
                <span className="font-bold text-blue-900">{formatCurrency(costForm.court_cost + costForm.additional_court_cost)}</span>
              </div>
              
              <div className="space-y-3 pt-3 mt-3 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-600">Biaya Lain-lain</label>
                  <button type="button" onClick={() => setCostForm({...costForm, other_costs: [...costForm.other_costs, {desc: '', amount: 0}]})} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition">
                    <Plus size={12} /> Tambah
                  </button>
                </div>
                {costForm.other_costs.map((cost, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1 space-y-2">
                      <input type="text" placeholder="Keterangan (mis: Kok, Air, Medis)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-400"
                        value={cost.desc} onChange={e => {
                          const newCosts = [...costForm.other_costs]
                          newCosts[idx].desc = e.target.value
                          setCostForm({...costForm, other_costs: newCosts})
                        }} />
                      <input type="number" placeholder="Nominal Rp" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-400"
                        value={cost.amount || ''} onChange={e => {
                          const newCosts = [...costForm.other_costs]
                          newCosts[idx].amount = Number(e.target.value)
                          setCostForm({...costForm, other_costs: newCosts})
                      }} />
                    </div>
                    <button type="button" onClick={() => setCostForm({...costForm, other_costs: costForm.other_costs.filter((_, i) => i !== idx)})} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition mt-0.5"><Trash2 size={15} /></button>
                  </div>
                ))}
                {costForm.other_costs.length === 0 && <p className="text-xs text-slate-400 italic bg-white border border-dashed border-slate-200 p-3 rounded-xl text-center">Tidak ada biaya operasional ekstra.</p>}
              </div>

              <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
                <button type="button" onClick={() => { setIsEditCostModalOpen(false); loadData(); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium">Batal</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-500 shadow-sm transition">Simpan Biaya</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Announcement */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto pt-10">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-5">Pengaturan Pengumuman</h2>
            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                <span className="text-sm font-bold text-slate-800">Tampilkan di form peserta</span>
                <div onClick={() => setAnnouncementForm(f => ({ ...f, enabled: !f.enabled }))} className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${announcementForm.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${announcementForm.enabled ? 'translate-x-6' : ''}`} />
                </div>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Tipe Pengumuman</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'next_session', label: 'Next Session' },
                    { value: 'libur', label: 'Libur' },
                    { value: 'custom', label: 'Custom' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => {
                        const defaults = opt.value === 'libur'
                          ? { title: 'Libur Minggu Depan', caption: 'minggu depan moves fun badminton libur dulu ya bestie, see you next time!' }
                          : opt.value === 'next_session'
                          ? { title: 'Sesi Rutin Berikutnya', caption: 'no cap minggu depan kita minton lagi bestie, jangan ghosting ya fr fr' }
                          : { title: '', caption: '' }
                        setAnnouncementForm(f => ({ ...f, type: opt.value, ...defaults }))
                      }}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition ${announcementForm.type === opt.value ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{announcementForm.type === 'libur' ? 'Judul' : 'Judul Sesi'}</label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              {announcementForm.type !== 'libur' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal / Info Tambahan</label>
                  <input type="text" placeholder="Sabtu, 23 Mei 2026" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={announcementForm.date} onChange={e => setAnnouncementForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Caption</label>
                <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={announcementForm.caption} onChange={e => setAnnouncementForm(f => ({ ...f, caption: e.target.value }))} />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider">Preview Card di Form</p>
                <div className={`border rounded-xl p-3 shadow-sm bg-white ${announcementForm.type === 'libur' ? 'border-red-200' : 'border-emerald-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {announcementForm.type === 'libur' ? <AlertCircle className="w-4 h-4 text-red-500" /> : <Calendar className="w-4 h-4 text-emerald-600" />}
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${announcementForm.type === 'libur' ? 'text-red-500' : 'text-emerald-600'}`}>
                      {announcementForm.type === 'libur' ? 'Pengumuman' : 'Next Session'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{announcementForm.title || '—'}</p>
                  {announcementForm.date && <p className="text-xs text-slate-500 mt-0.5">{announcementForm.date}</p>}
                  {announcementForm.caption && <p className={`text-xs mt-1.5 font-medium ${announcementForm.type === 'libur' ? 'text-red-700' : 'text-emerald-700'}`}>{announcementForm.caption}</p>}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAnnouncementModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium">Batal</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-500 shadow-sm">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Polling */}
      {isPollingModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto pt-10">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-5">Pengaturan Polling</h2>
            <form onSubmit={handleSavePolling} className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                <span className="text-sm font-bold text-slate-800">Tampilkan polling di form peserta</span>
                <div onClick={() => setPollingForm(f => ({ ...f, enabled: !f.enabled }))} className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${pollingForm.enabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${pollingForm.enabled ? 'translate-x-6' : ''}`} />
                </div>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pertanyaan Polling</label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={pollingForm.question} onChange={e => setPollingForm(f => ({ ...f, question: e.target.value }))} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-600">Pilihan Jawaban</label>
                  <button type="button" onClick={() => setPollingForm(f => ({ ...f, options: [...f.options, ''] }))} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition">
                    <Plus size={12} /> Tambah
                  </button>
                </div>
                <div className="space-y-2">
                  {pollingForm.options.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                      <div className="flex-shrink-0 w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-bold text-slate-400 shadow-sm">{i+1}</div>
                      <input type="text" required placeholder={`Pilihan ${i + 1}`} className="flex-1 px-3 py-1.5 bg-transparent border-none text-sm focus:outline-none"
                        value={opt} onChange={e => setPollingForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? e.target.value : o) }))} />
                      {pollingForm.options.length > 2 && (
                        <button type="button" onClick={() => setPollingForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition mr-1">
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsPollingModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium">Batal</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-500 shadow-sm">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
