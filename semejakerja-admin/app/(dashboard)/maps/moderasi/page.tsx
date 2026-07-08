'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import type { CafeSubmission, CafeEdit, CafeReview, CafePhoto } from '@/types'
import { formatDate } from '@/lib/utils/format'
import { CheckCircle, XCircle, Clock, Loader2, MessageSquare, Image, MapPin, Edit } from 'lucide-react'

type TabType = 'submissions' | 'edits' | 'reviews' | 'photos'

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
}

function ReviewModal({ item, type, onClose, onDone }: { item: any, type: string, onClose: () => void, onDone: () => void }) {
  const supabase = createClient()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const table = { submissions: 'cafe_submissions', edits: 'cafe_edits', reviews: 'cafe_reviews', photos: 'cafe_photos' }[type] as string

  const submit = async (status: 'approved' | 'rejected') => {
    setLoading(true)
    await supabase.from(table).update({ status, review_note: note, reviewed_at: new Date().toISOString() }).eq('id', item.id)
    setLoading(false)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-lg text-slate-900 mb-2">Review Kontribusi</h3>
        <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm space-y-1">
          <p><span className="text-slate-500">Dari:</span> <strong>{item.submitter_name || item.reviewer_name || 'Anonim'}</strong></p>
          {item.name && <p><span className="text-slate-500">Kafe:</span> {item.name}</p>}
          {item.comment && <p><span className="text-slate-500">Komentar:</span> {item.comment}</p>}
          {item.rating && <p><span className="text-slate-500">Rating:</span> ⭐ {item.rating}/5</p>}
        </div>
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
        <ReviewModal item={reviewItem} type={tab} onClose={() => setReviewItem(null)} onDone={() => { loadTab(); loadCounts() }} />
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
                    <p>{item.name || item.comment || (item.suggested_data ? 'Edit data kafe' : item.caption || 'Foto kafe')}</p>
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
