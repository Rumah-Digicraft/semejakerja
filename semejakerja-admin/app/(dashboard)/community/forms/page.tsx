'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Form } from '@/types'
import { formatDate } from '@/lib/utils/format'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { STATUS_LABELS, STATUS_COLORS, wfcTemplateForm } from './lib'
import {
  Plus, ClipboardList, Trash2, Loader2, X, Users, ChevronRight, Store, Sparkles, FileText,
} from 'lucide-react'

type CreateMode = 'wfc' | 'blank'

export default function FormsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [forms, setForms] = useState<Form[]>([])
  const [respCounts, setRespCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<CreateMode>('wfc')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: rows }, { data: resp }] = await Promise.all([
      supabase.from('forms').select('*').order('created_at', { ascending: false }),
      supabase.from('form_responses').select('form_id'),
    ])
    setForms((rows ?? []) as Form[])
    const counts: Record<string, number> = {}
    for (const r of resp ?? []) counts[r.form_id] = (counts[r.form_id] ?? 0) + 1
    setRespCounts(counts)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Defer a frame so setLoading(true) inside load() isn't a sync
    // setState in the effect body (react-hooks/set-state-in-effect).
    const raf = requestAnimationFrame(() => { load() })
    return () => cancelAnimationFrame(raf)
  }, [load])

  const filtered = useMemo(
    () => forms.filter(f => filterStatus === 'all' || f.status === filterStatus),
    [forms, filterStatus],
  )
  const { page, setPage, pageCount, pageItems, pageSize, total } = usePagination(filtered, filterStatus)

  const openCreate = () => { setTitle(''); setMode('wfc'); setShowModal(true) }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = mode === 'wfc'
      ? { title: title.trim(), ...wfcTemplateForm() }
      : { title: title.trim() }
    const { data, error } = await supabase.from('forms').insert(payload).select('id').single()
    setSaving(false)
    if (error) { showToast('Gagal buat form: ' + error.message); return }
    router.push(`/community/forms/${data.id}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: string, formTitle: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Hapus form "${formTitle}"? Semua respons yang masuk ikut terhapus.`)) return
    const { error } = await supabase.from('forms').delete().eq('id', id)
    if (error) { showToast('Gagal hapus: ' + error.message); return }
    setForms(prev => prev.filter(f => f.id !== id))
    showToast('Form dihapus')
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Form Event</h1>
          <p className="text-slate-500 mt-1">Form pendaftaran gaya Google Forms — buat event WFC Bareng Strangers kolab cafe, bagikan link, kumpulkan respons.</p>
        </div>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="open">Terbuka</option>
            <option value="closed">Ditutup</option>
          </select>
          <button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
            <Plus size={16} /> Buat Form
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Form</th>
                <th className="text-left font-semibold px-5 py-3">Cafe</th>
                <th className="text-left font-semibold px-5 py-3">Respons</th>
                <th className="text-left font-semibold px-5 py-3">Dibuat</th>
                <th className="text-left font-semibold px-5 py-3">Status</th>
                <th className="text-right font-semibold px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td></tr>
              )) : pageItems.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-400">Belum ada form. Klik “Buat Form” untuk mulai.</td></tr>
              ) : pageItems.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => router.push(`/community/forms/${f.id}`)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={15} className="text-purple-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800">{f.title || <span className="text-slate-400">Tanpa judul</span>}</div>
                        <div className="text-xs text-slate-400">{f.questions?.length ?? 0} pertanyaan</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {f.cafe_name ? <span className="inline-flex items-center gap-1"><Store size={13} className="text-slate-400" />{f.cafe_name}</span> : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <span className="inline-flex items-center gap-1"><Users size={13} className="text-slate-400" />{respCounts[f.id] ?? 0}{f.quota ? ` / ${f.quota}` : ''}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDate(f.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[f.status]}`}>{STATUS_LABELS[f.status]}</span>
                      {f.show_on_landing && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700">di LP</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => handleDelete(e, f.id, f.title)} title="Hapus" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="form" />
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Buat Form</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul Form</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="WFC Bareng Strangers at Cold 'N Brew" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mulai dari</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMode('wfc')} className={`text-left p-3 rounded-xl border transition ${mode === 'wfc' ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Sparkles size={14} className="text-purple-500" /> Template WFC</span>
                    <span className="block text-xs text-slate-500 mt-1">Pertanyaan bawaan WFC Bareng Strangers</span>
                  </button>
                  <button type="button" onClick={() => setMode('blank')} className={`text-left p-3 rounded-xl border transition ${mode === 'blank' ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><FileText size={14} className="text-slate-500" /> Kosong</span>
                    <span className="block text-xs text-slate-500 mt-1">Bangun pertanyaan dari nol</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Buat &amp; atur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
