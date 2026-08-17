'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import type { CafeSubmission, CafeEdit, CafeReview, CafePhoto } from '@/types'
import { formatDate } from '@/lib/utils/format'
import { CheckCircle, XCircle, Clock, Loader2, MessageSquare, Image, MapPin, Edit } from 'lucide-react'

type TabType = 'submissions' | 'edits' | 'reviews' | 'photos'

const BUCKET = 'cafe-photos'
const MAX_PHOTOS = 15 // batas foto tayang per kafe — samakan dengan PhotoManager.tsx

const EDIT_FIELD_LABELS: Record<string, string> = {
  name: 'Nama Kafe',
  address: 'Alamat',
  phone: 'Telepon',
  website: 'Website',
  open_hours: 'Jam Buka',
}

// Label harga & vibes — samakan dengan PRICE_OPTIONS/VIBE_LEVELS di CafeForm.tsx.
const PRICE_LABELS: Record<number, string> = {
  0: 'Belum ada info harga',
  1: 'Rp 0 - 25.000',
  2: 'Rp 25.000 - 50.000',
  3: 'Rp 50.000 - 150.000',
  4: 'Rp 150.000 - 300.000',
}
const VIBE_LABELS: Record<number, string> = { 1: 'Tenang', 2: 'Sedang', 3: 'Ramai' }

// Sama dengan FACILITY_CONFIG/SCALE_CONFIG di cafes/CafeForm.tsx — cuma
// label buat preview read-only di sini, tidak perlu icon/interaktif.
const FACILITY_LABELS: Array<{ key: string; label: string }> = [
  { key: 'wifi', label: 'WiFi Cepat' },
  { key: 'ac', label: 'AC Sejuk' },
  { key: 'mushola', label: 'Mushola' },
  { key: 'meetingRoom', label: 'Ruang Meeting' },
  { key: 'outdoor', label: 'Area Outdoor' },
  { key: 'heavyMeal', label: 'Makanan Berat' },
]
const SCALE_LABELS: Record<string, { label: string; levels: string[] }> = {
  area: { label: 'Luas Area', levels: ['Belum ada info', 'Kecil', 'Sedang', 'Luas'] },
  motorParking: { label: 'Parkir Motor', levels: ['Tidak ada', 'Sempit', 'Sedang', 'Luas'] },
  carParking: { label: 'Parkir Mobil', levels: ['Tidak ada', 'Sempit', 'Sedang', 'Luas'] },
  outlets: { label: 'Colokan', levels: ['Tidak ada', 'Sedikit', 'Sedang', 'Banyak (tiap meja)'] },
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
}

function ReviewModal({ item, type, cafeName, onClose, onDone }: { item: any, type: string, cafeName?: string, onClose: () => void, onDone: () => void }) {
  const supabase = createClient()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentCafe, setCurrentCafe] = useState<Record<string, any> | null>(null)
  const [approvedPhotoCount, setApprovedPhotoCount] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const table = { submissions: 'cafe_submissions', edits: 'cafe_edits', reviews: 'cafe_reviews', photos: 'cafe_photos' }[type] as string

  // Buat perbandingan "nilai sekarang → disarankan" di tab edit.
  useEffect(() => {
    if (type !== 'edits' || !item.cafe_id) return
    supabase.from('cafes').select('name, address, phone, website, open_hours').eq('id', item.cafe_id).single()
      .then(({ data }) => setCurrentCafe(data))
  }, [type, item.cafe_id])

  // Kafe dibatasi maksimal MAX_PHOTOS foto tayang — cek dulu sebelum
  // menawarkan tombol approve buat kontribusi foto.
  useEffect(() => {
    if (type !== 'photos' || !item.cafe_id) return
    supabase.from('cafe_photos').select('id', { count: 'exact', head: true }).eq('cafe_id', item.cafe_id).eq('status', 'approved')
      .then(({ count }) => setApprovedPhotoCount(count ?? 0))
  }, [type, item.cafe_id])

  const photoLimitReached = type === 'photos' && (approvedPhotoCount ?? 0) >= MAX_PHOTOS
  // Trigger create_cafe_from_submission (migration 049) menolak approve
  // kalau lat/lng kosong — cek di sini juga supaya tombol Setujui sudah
  // nonaktif dari awal, bukan cuma gagal senyap di server.
  const submissionLocationMissing = type === 'submissions' && (item.lat == null || item.lng == null)

  const photoUrl = type === 'photos' && item.storage_path
    ? supabase.storage.from(BUCKET).getPublicUrl(item.storage_path).data.publicUrl
    : null

  const submit = async (status: 'approved' | 'rejected') => {
    setLoading(true)
    setSubmitError(null)
    // reviewed_by/reviewed_at TIDAK dikirim dari client — trigger
    // set_reviewed_by (migration 048) yang memaksanya dari auth.uid() &
    // now() di server, supaya gak bisa dipalsukan/di-backdate dari sini.
    const payload: Record<string, any> = { status, review_note: note }
    // Foto publik tidak pernah kirim sort_order (default DB = 0) — kalau
    // dibiarkan, foto ini bisa "menyalip" jadi sampul karena tie-break-nya
    // created_at terbaru duluan. Taruh di urutan paling akhir, sama seperti
    // upload admin.
    if (type === 'photos' && status === 'approved') {
      const { count } = await supabase.from('cafe_photos').select('id', { count: 'exact', head: true }).eq('cafe_id', item.cafe_id).eq('status', 'approved')
      // Re-cek langsung ke DB (bukan cuma pakai approvedPhotoCount di state)
      // buat jaga-jaga kalau ada approval lain nyelip di antara modal dibuka
      // dan tombol ini diklik.
      if ((count ?? 0) >= MAX_PHOTOS) {
        setApprovedPhotoCount(count ?? 0)
        setLoading(false)
        return
      }
      payload.sort_order = count ?? 0
    }
    // Approve "submissions" -> trigger create_cafe_from_submission bikin
    // baris cafes baru sekaligus (lihat migration 049); trigger itu bisa
    // RAISE EXCEPTION (mis. lokasi kosong) yang muncul sebagai error di sini.
    const { error } = await supabase.from(table).update(payload).eq('id', item.id)
    setLoading(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg text-slate-900 mb-2">Review Kontribusi</h3>
        <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm space-y-1">
          <p><span className="text-slate-500">Dari:</span> <strong>{item.submitter_name || item.reviewer_name || 'Anonim'}</strong></p>
          {(item.name || cafeName) && <p><span className="text-slate-500">Kafe:</span> {item.name || cafeName}</p>}
          {item.comment && <p><span className="text-slate-500">Komentar:</span> {item.comment}</p>}
          {item.rating && <p><span className="text-slate-500">Rating:</span> ⭐ {item.rating}/5</p>}
        </div>

        {type === 'submissions' && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Detail Usulan</p>
            <p><span className="text-slate-500">Harga:</span> {PRICE_LABELS[item.price_level ?? 0] ?? '–'}</p>
            <p><span className="text-slate-500">Vibes:</span> {VIBE_LABELS[item.vibes ?? 2] ?? '–'}</p>
            {item.facilities && (
              <p>
                <span className="text-slate-500">Fasilitas:</span>{' '}
                {FACILITY_LABELS.filter(f => item.facilities[f.key]).map(f => f.label).join(', ') || '–'}
              </p>
            )}
            {item.scales && (
              <p className="text-xs text-slate-500">
                {Object.entries(SCALE_LABELS).map(([key, cfg]) => `${cfg.label}: ${cfg.levels[item.scales[key] ?? 0]}`).join(' · ')}
              </p>
            )}
            {(item.rating > 0 || item.total_reviews > 0) && (
              <p><span className="text-slate-500">Review Google:</span> ⭐ {item.rating ?? 0} ({item.total_reviews ?? 0} review)</p>
            )}
            {item.open_hours && <p><span className="text-slate-500">Jam:</span> {item.open_hours}</p>}
            {Array.isArray(item.weekday_text) && item.weekday_text.length > 0 && (
              <div className="pt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-500">
                {item.weekday_text.map((line: string) => <span key={line}>{line}</span>)}
              </div>
            )}
            <p>
              <span className="text-slate-500">Lokasi:</span>{' '}
              {submissionLocationMissing ? (
                <span className="text-amber-600 font-medium">Belum diisi kontributor</span>
              ) : (
                <>{item.lat}, {item.lng}</>
              )}
            </p>
            {item.maps_url && (
              <a href={item.maps_url} target="_blank" rel="noreferrer" className="inline-block text-purple-600 hover:underline text-xs font-medium">
                Buka di Google Maps →
              </a>
            )}
            {submissionLocationMissing && (
              <p className="text-xs text-amber-600 font-medium pt-1">
                Tidak bisa disetujui sampai lokasi terisi — reject dan minta kontributor kirim ulang, atau tambahkan kafe ini manual lewat halaman Kafe.
              </p>
            )}
          </div>
        )}

        {type === 'edits' && item.suggested_data && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Perubahan yang Disarankan</p>
            {Object.entries(item.suggested_data as Record<string, string>)
              .filter(([key, value]) => key !== '_notes' && value)
              .map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-slate-400">{EDIT_FIELD_LABELS[key] ?? key}</p>
                  {currentCafe?.[key] ? (
                    <p>
                      <span className="text-slate-400 line-through">{currentCafe[key]}</span>
                      {' → '}
                      <span className="font-medium text-slate-900">{value}</span>
                    </p>
                  ) : (
                    <p className="font-medium text-slate-900">{value}</p>
                  )}
                </div>
              ))}
            {item.notes && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-400">Alasan dari kontributor</p>
                <p className="text-slate-700">{item.notes}</p>
              </div>
            )}
          </div>
        )}

        {type === 'photos' && photoUrl && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
            <img src={photoUrl} alt={item.caption ?? 'Foto kafe'} className="w-full max-w-[220px] mx-auto aspect-[3/4] object-cover rounded-xl border border-slate-100" />
            {item.caption && <p className="text-xs text-slate-500 mt-1.5 text-center">&quot;{item.caption}&quot;</p>}
            {photoLimitReached ? (
              <p className="text-xs text-amber-600 font-medium mt-2 text-center">
                Kafe ini sudah punya {approvedPhotoCount}/{MAX_PHOTOS} foto (maksimal). Hapus foto lama dulu di halaman Kafe sebelum bisa menyetujui foto ini.
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-2 text-center">Kalau disetujui, foto ini langsung tayang di galeri foto publik kafe ini.</p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Review (opsional)</label>
          <textarea
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Alasan approve / reject..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
        </div>
        {submitError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{submitError}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
          <button onClick={() => submit('rejected')} disabled={loading} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-medium flex items-center gap-1.5">
            <XCircle size={14} /> Tolak
          </button>
          <button
            onClick={() => submit('approved')}
            disabled={loading || photoLimitReached || submissionLocationMissing}
            title={photoLimitReached ? `Maksimal ${MAX_PHOTOS} foto per kafe` : submissionLocationMissing ? 'Lokasi belum diisi' : undefined}
            className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Setujui
          </button>
        </div>
      </div>
    </div>
  )
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'pending', label: 'Belum Dicek' },
  { id: 'approved', label: 'Disetujui' },
  { id: 'rejected', label: 'Ditolak' },
  { id: 'all', label: 'Semua' },
]

export default function ModerasiPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabType>('submissions')
  // Default "Belum Dicek" — itu yang paling perlu ditindaklanjuti admin;
  // "Semua"/"Disetujui"/"Ditolak" masih bisa dipilih buat audit riwayat.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [data, setData] = useState<any[]>([])
  const [cafeNames, setCafeNames] = useState<Record<string, string>>({})
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({})
  const [counts, setCounts] = useState({ submissions: 0, edits: 0, reviews: 0, photos: 0 })
  const [loading, setLoading] = useState(true)
  const [reviewItem, setReviewItem] = useState<any>(null)

  const loadCounts = useCallback(async () => {
    const [s, e, r, p] = await Promise.all([
      supabase.from('cafe_submissions').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('cafe_edits').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('cafe_reviews').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('cafe_photos').select('id', { count: 'exact' }).eq('status', 'pending'),
    ])
    setCounts({ submissions: s.count ?? 0, edits: e.count ?? 0, reviews: r.count ?? 0, photos: p.count ?? 0 })
  }, [])

  const loadTab = useCallback(async () => {
    setLoading(true)
    const tableMap = { submissions: 'cafe_submissions', edits: 'cafe_edits', reviews: 'cafe_reviews', photos: 'cafe_photos' }
    // Filter status di query (bukan cuma di client) supaya "ambil 50 baris
    // terlama" itu 50 baris TERLAMA YANG BELUM DICEK, bukan ketiban baris
    // lama yang sebenarnya sudah lama disetujui/ditolak. Ascending = adil,
    // yang antre paling lama duluan direview, tidak keselip entry baru.
    let query = supabase.from(tableMap[tab]).select('*').order('created_at', { ascending: true }).limit(50)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query
    setData(data ?? [])

    // submissions = usulan kafe baru, tidak punya cafe_id (belum ada kafenya).
    // Tab lain cuma nyimpen cafe_id — nama kafenya perlu dicari terpisah biar
    // admin tahu kontribusi ini soal kafe yang mana.
    if (tab !== 'submissions') {
      const ids = [...new Set((data ?? []).map(d => d.cafe_id).filter(Boolean))]
      if (ids.length > 0) {
        const { data: cafes } = await supabase.from('cafes').select('id, name').in('id', ids)
        setCafeNames(Object.fromEntries((cafes ?? []).map(c => [c.id, c.name])))
      } else {
        setCafeNames({})
      }
    }

    // reviewed_by (uuid) → nama/email admin, buat ditampilkan di kolom
    // status ("Direview oleh ..."). admin_directory (migration 048) cuma
    // kebaca kalau yang query juga admin yang login.
    const reviewerIds = [...new Set((data ?? []).map(d => d.reviewed_by).filter(Boolean))]
    if (reviewerIds.length > 0) {
      const { data: admins } = await supabase.from('admin_directory').select('user_id, email, full_name').in('user_id', reviewerIds)
      setReviewerNames(Object.fromEntries((admins ?? []).map(a => [a.user_id, a.full_name || a.email])))
    } else {
      setReviewerNames({})
    }
    setLoading(false)
  }, [tab, statusFilter])

  useEffect(() => { loadCounts(); loadTab() }, [loadCounts, loadTab])

  const { page, setPage, pageCount, pageItems, pageSize, total } = usePagination(data, `${tab}-${statusFilter}`, 10)

  const STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600',
  }

  const tabs = [
    { id: 'submissions', label: 'Kafe Baru', icon: <MapPin size={14} />, count: counts.submissions },
    { id: 'edits', label: 'Edit Info', icon: <Edit size={14} />, count: counts.edits },
    { id: 'reviews', label: 'Ulasan', icon: <MessageSquare size={14} />, count: counts.reviews },
    { id: 'photos', label: 'Foto', icon: <Image size={14} />, count: counts.photos },
  ] as const

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {reviewItem && (
        <ReviewModal
          item={reviewItem}
          type={tab}
          cafeName={cafeNames[reviewItem.cafe_id]}
          onClose={() => setReviewItem(null)}
          onDone={() => { loadTab(); loadCounts() }}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Moderasi Komunitas</h1>
        <p className="text-slate-500 mt-1">Review kontribusi dari pengguna Maps Purwokerto</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 w-fit max-w-full overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as TabType)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              tab === t.id ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon} {t.label} <Badge count={t.count} />
          </button>
        ))}
      </div>

      {/* Filter status */}
      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        <span className="text-xs font-medium text-slate-400 mr-1">Status:</span>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
              statusFilter === f.id
                ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop: full table. Mobile: stacked cards below — "Detail" can
            hold a photo thumbnail + caption or a comment/rating, too dense
            for a narrow column. */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-medium">Kontributor</th>
                <th className="px-5 py-3.5 font-medium">Detail</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Waktu</th>
                <th className="px-5 py-3.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Tidak ada data.</td></tr>
              ) : pageItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{item.submitter_name || item.reviewer_name || 'Anonim'}</p>
                    <p className="text-xs text-slate-400">{item.submitter_wa || item.reviewer_wa || ''}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {tab !== 'submissions' && cafeNames[item.cafe_id] && (
                      <p className="font-medium text-slate-800">{cafeNames[item.cafe_id]}</p>
                    )}
                    {tab === 'photos' && item.storage_path ? (
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
                        <img
                          src={supabase.storage.from(BUCKET).getPublicUrl(item.storage_path).data.publicUrl}
                          alt={item.caption ?? 'Foto kafe'}
                          className="w-9 h-12 rounded-lg object-cover border border-slate-100 shrink-0"
                        />
                        <span>{item.caption || 'Foto kafe'}</span>
                      </div>
                    ) : (
                      <p>{item.name || item.comment || (item.suggested_data ? 'Edit data kafe' : '')}</p>
                    )}
                    {item.rating && <p className="text-xs text-amber-500">⭐ {item.rating}/5</p>}
                    {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[item.status]}`}>
                      {item.status}
                    </span>
                    {item.review_note && <p className="text-xs text-slate-400 mt-0.5">"{item.review_note}"</p>}
                    {item.reviewed_by && (
                      <p className="text-xs text-slate-400 mt-0.5">Direview oleh {reviewerNames[item.reviewed_by] ?? '...'}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">{formatDate(item.created_at)}</td>
                  <td className="px-5 py-4">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => setReviewItem(item)}
                        className="px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-medium transition"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden divide-y divide-slate-50">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
            </div>
          )) : data.length === 0 ? (
            <p className="px-5 py-12 text-center text-slate-400 text-sm">Tidak ada data.</p>
          ) : pageItems.map(item => (
            <div key={item.id} className="p-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.submitter_name || item.reviewer_name || 'Anonim'}</p>
                  <p className="text-xs text-slate-400">{item.submitter_wa || item.reviewer_wa || ''}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[item.status]}`}>
                  {item.status}
                </span>
              </div>

              <div className="text-slate-600 text-sm">
                {tab !== 'submissions' && cafeNames[item.cafe_id] && (
                  <p className="font-medium text-slate-800">{cafeNames[item.cafe_id]}</p>
                )}
                {tab === 'photos' && item.storage_path ? (
                  <div className="flex items-center gap-2.5 mt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
                    <img
                      src={supabase.storage.from(BUCKET).getPublicUrl(item.storage_path).data.publicUrl}
                      alt={item.caption ?? 'Foto kafe'}
                      className="w-9 h-12 rounded-lg object-cover border border-slate-100 shrink-0"
                    />
                    <span>{item.caption || 'Foto kafe'}</span>
                  </div>
                ) : (
                  <p>{item.name || item.comment || (item.suggested_data ? 'Edit data kafe' : '')}</p>
                )}
                {item.rating && <p className="text-xs text-amber-500 mt-0.5">⭐ {item.rating}/5</p>}
                {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                {item.review_note && <p className="text-xs text-slate-400 mt-0.5">&quot;{item.review_note}&quot;</p>}
                {item.reviewed_by && (
                  <p className="text-xs text-slate-400 mt-0.5">Direview oleh {reviewerNames[item.reviewed_by] ?? '...'}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                {item.status === 'pending' && (
                  <button
                    onClick={() => setReviewItem(item)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-medium transition"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!loading && <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="kontribusi" />}
      </div>
    </div>
  )
}
