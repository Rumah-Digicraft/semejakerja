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

const EDIT_FIELD_LABELS: Record<string, string> = {
  name: 'Nama Kafe',
  address: 'Alamat',
  phone: 'Telepon',
  website: 'Website',
  open_hours: 'Jam Buka',
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

  const table = { submissions: 'cafe_submissions', edits: 'cafe_edits', reviews: 'cafe_reviews', photos: 'cafe_photos' }[type] as string

  // Buat perbandingan "nilai sekarang → disarankan" di tab edit.
  useEffect(() => {
    if (type !== 'edits' || !item.cafe_id) return
    supabase.from('cafes').select('name, address, phone, website, open_hours').eq('id', item.cafe_id).single()
      .then(({ data }) => setCurrentCafe(data))
  }, [type, item.cafe_id])

  const photoUrl = type === 'photos' && item.storage_path
    ? supabase.storage.from(BUCKET).getPublicUrl(item.storage_path).data.publicUrl
    : null

  const submit = async (status: 'approved' | 'rejected') => {
    setLoading(true)
    const payload: Record<string, any> = { status, review_note: note, reviewed_at: new Date().toISOString() }
    // Foto publik tidak pernah kirim sort_order (default DB = 0) — kalau
    // dibiarkan, foto ini bisa "menyalip" jadi sampul karena tie-break-nya
    // created_at terbaru duluan. Taruh di urutan paling akhir, sama seperti
    // upload admin.
    if (type === 'photos' && status === 'approved') {
      const { count } = await supabase.from('cafe_photos').select('id', { count: 'exact', head: true }).eq('cafe_id', item.cafe_id).eq('status', 'approved')
      payload.sort_order = count ?? 0
    }
    await supabase.from(table).update(payload).eq('id', item.id)
    setLoading(false)
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
            <p className="text-xs text-slate-400 mt-2 text-center">Kalau disetujui, foto ini langsung tayang di galeri foto publik kafe ini.</p>
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
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
          <button onClick={() => submit('rejected')} disabled={loading} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-medium flex items-center gap-1.5">
            <XCircle size={14} /> Tolak
          </button>
          <button onClick={() => submit('approved')} disabled={loading} className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-sm font-medium flex items-center gap-1.5">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Setujui
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ModerasiPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabType>('submissions')
  const [data, setData] = useState<any[]>([])
  const [cafeNames, setCafeNames] = useState<Record<string, string>>({})
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
    const { data } = await supabase.from(tableMap[tab]).select('*').order('created_at', { ascending: false }).limit(50)
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
    setLoading(false)
  }, [tab])

  useEffect(() => { loadCounts(); loadTab() }, [loadCounts, loadTab])

  const { page, setPage, pageCount, pageItems, pageSize, total } = usePagination(data, tab)

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
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit overflow-x-auto">
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
        {!loading && <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="kontribusi" />}
      </div>
    </div>
  )
}
