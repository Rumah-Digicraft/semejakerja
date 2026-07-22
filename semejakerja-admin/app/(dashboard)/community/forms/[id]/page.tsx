'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppSettings } from '@/lib/useAppSettings'
import type { Form, FormResponse, FormQuestion, FormQuestionType, FormStatus } from '@/types'
import { formatDatetime } from '@/lib/utils/format'
import {
  STATUS_LABELS, STATUS_OPTIONS, STATUS_COLORS, QUESTION_TYPE_OPTIONS,
  needsOptions, isAnswerable, newQuestion, responsesToCsv, downloadCsv, slugifyTitle,
} from '../lib'
import {
  ArrowLeft, Loader2, Save, Copy, Check, ExternalLink, Plus, Trash2,
  ChevronUp, ChevronDown, Users, Download, ClipboardList, GripVertical, Link2, Megaphone,
} from 'lucide-react'

interface SettingsState {
  title: string
  description: string
  cafe_name: string
  event_date: string
  location: string
  quota: string
  whatsapp_group_url: string
  whatsapp_group_label: string
  success_message: string
  status: FormStatus
  show_on_landing: boolean
}

export default function FormDetailPage() {
  const supabase = createClient()
  const id = useParams().id as string
  const { landingUrl } = useAppSettings()

  const [form, setForm] = useState<Form | null>(null)
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [questions, setQuestions] = useState<FormQuestion[]>([])
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data: f } = await supabase.from('forms').select('*').eq('id', id).single()
    if (!f) { setLoading(false); return }
    const row = f as Form
    setForm(row)
    setSettings({
      title: row.title ?? '',
      description: row.description ?? '',
      cafe_name: row.cafe_name ?? '',
      event_date: row.event_date ?? '',
      location: row.location ?? '',
      quota: row.quota != null ? String(row.quota) : '',
      whatsapp_group_url: row.whatsapp_group_url ?? '',
      whatsapp_group_label: row.whatsapp_group_label ?? 'Klik Sini',
      success_message: row.success_message ?? '',
      status: row.status,
      show_on_landing: !!row.show_on_landing,
    })
    setQuestions(Array.isArray(row.questions) ? row.questions : [])

    const { data: resp } = await supabase.from('form_responses')
      .select('*').eq('form_id', id).order('created_at', { ascending: false })
    setResponses((resp ?? []) as FormResponse[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    // Defer a frame so setLoading(true) inside load() isn't a sync
    // setState in the effect body (react-hooks/set-state-in-effect).
    const raf = requestAnimationFrame(() => { load() })
    return () => cancelAnimationFrame(raf)
  }, [load])

  const setS = (k: keyof SettingsState, v: string) =>
    setSettings(s => (s ? ({ ...s, [k]: v } as SettingsState) : s))
  const toggleShowOnLanding = () =>
    setSettings(s => (s ? { ...s, show_on_landing: !s.show_on_landing } : s))

  // ── Builder mutations ─────────────────────────────────────
  const updateQuestion = (qid: string, patch: Partial<FormQuestion>) =>
    setQuestions(qs => qs.map(q => (q.id === qid ? { ...q, ...patch } : q)))

  const changeType = (qid: string, type: FormQuestionType) =>
    setQuestions(qs => qs.map(q => {
      if (q.id !== qid) return q
      const next: FormQuestion = { ...q, type }
      if (needsOptions(type)) { if (!next.options || next.options.length === 0) next.options = ['Opsi 1'] }
      else delete next.options
      return next
    }))

  const removeQuestion = (qid: string) => setQuestions(qs => qs.filter(q => q.id !== qid))

  const moveQuestion = (idx: number, dir: -1 | 1) => setQuestions(qs => {
    const j = idx + dir
    if (j < 0 || j >= qs.length) return qs
    const copy = [...qs]
    ;[copy[idx], copy[j]] = [copy[j], copy[idx]]
    return copy
  })

  const addQuestion = () => setQuestions(qs => [...qs, newQuestion('short_text')])

  const setOption = (qid: string, i: number, val: string) =>
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: (q.options ?? []).map((o, idx) => idx === i ? val : o) } : q))
  const addOption = (qid: string) =>
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: [...(q.options ?? []), `Opsi ${(q.options?.length ?? 0) + 1}`] } : q))
  const removeOption = (qid: string, i: number) =>
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: (q.options ?? []).filter((_, idx) => idx !== i) } : q))

  // ── Save (settings + questions) ───────────────────────────
  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    const cleaned: FormQuestion[] = questions.map(q => {
      const c: FormQuestion = {
        id: q.id,
        type: q.type,
        label: q.label.trim(),
        required: q.type === 'section' ? false : !!q.required,
      }
      if (q.help && q.help.trim()) c.help = q.help
      if (needsOptions(q.type)) c.options = (q.options ?? []).map(o => o.trim()).filter(Boolean)
      return c
    })
    const { error } = await supabase.from('forms').update({
      title: settings.title.trim(),
      description: settings.description || null,
      cafe_name: settings.cafe_name || null,
      event_date: settings.event_date || null,
      location: settings.location || null,
      quota: settings.quota === '' ? null : Number(settings.quota),
      whatsapp_group_url: settings.whatsapp_group_url || null,
      whatsapp_group_label: settings.whatsapp_group_label || null,
      success_message: settings.success_message || null,
      status: settings.status,
      show_on_landing: settings.show_on_landing,
      questions: cleaned,
    }).eq('id', id)
    setSaving(false)
    if (error) { showToast('Gagal simpan: ' + error.message); return }
    showToast('Perubahan tersimpan')
    load()
  }

  // ── Responses actions ─────────────────────────────────────
  const toggleAttended = async (r: FormResponse) => {
    const next = !r.attended
    const { error } = await supabase.from('form_responses').update({ attended: next }).eq('id', r.id)
    if (error) { showToast('Gagal ubah: ' + error.message); return }
    setResponses(prev => prev.map(x => (x.id === r.id ? { ...x, attended: next } : x)))
  }
  const deleteResponse = async (r: FormResponse) => {
    if (!confirm('Hapus respons ini?')) return
    const { error } = await supabase.from('form_responses').delete().eq('id', r.id)
    if (error) { showToast('Gagal hapus: ' + error.message); return }
    setResponses(prev => prev.filter(x => x.id !== r.id))
  }
  const exportCsv = () => {
    if (!form) return
    const csv = responsesToCsv(form.questions ?? [], responses)
    downloadCsv(`${slugifyTitle(form.title)}-respons.csv`, csv)
  }

  const publicUrl = form ? `${landingUrl}/wfc/register?token=${form.token}` : ''
  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    showToast('Link publik disalin!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-8 flex items-center gap-2 text-slate-400"><Loader2 size={18} className="animate-spin" /> Memuat…</div>
  if (!form || !settings) return <div className="p-8 text-slate-400">Form tidak ditemukan. <Link href="/community/forms" className="text-purple-600">Kembali</Link></div>

  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'
  const label = 'block text-sm font-medium text-slate-700 mb-1'
  const answerCols = (form.questions ?? []).filter(q => isAnswerable(q.type))

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <Link href="/community/forms" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"><ArrowLeft size={15} /> Semua Form</Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList size={22} className="text-purple-500 shrink-0" />
          <h1 className="text-2xl font-bold text-slate-900 truncate">{form.title || 'Tanpa judul'}</h1>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${STATUS_COLORS[form.status]}`}>{STATUS_LABELS[form.status]}</span>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm shrink-0">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan
        </button>
      </div>

      {/* Share / public link */}
      <div className={`rounded-2xl border p-5 mb-6 ${form.status === 'open' ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-white'}`}>
        <div className="font-semibold text-slate-800 flex items-center gap-2 mb-2"><Link2 size={16} className="text-slate-400" /> Link publik</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input readOnly value={publicUrl} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 font-mono" />
          <div className="flex gap-2">
            <button onClick={copyLink} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium">
              {copied ? <Check size={15} /> : <Copy size={15} />} Salin
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-medium">
              <ExternalLink size={15} /> Buka
            </a>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {form.status === 'open'
            ? 'Form sedang terbuka — siapa pun dengan link ini bisa mengisi tanpa login.'
            : 'Link baru bisa diisi publik saat Status = Terbuka (ubah di Pengaturan lalu Simpan).'}
        </p>
      </div>

      {/* Tampilkan di landing page */}
      <div className={`rounded-2xl border p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${settings.show_on_landing ? 'border-purple-200 bg-purple-50/50' : 'border-slate-200 bg-white'}`}>
        <div>
          <div className="font-semibold text-slate-800 flex items-center gap-2"><Megaphone size={16} className="text-purple-500" /> Tampilkan di landing page</div>
          <p className="text-xs text-slate-500 mt-1">
            {settings.show_on_landing
              ? 'Event ini dipajang di homepage & halaman /wfc (hanya saat Status = Terbuka). Jangan lupa klik Simpan.'
              : 'Nyalakan untuk memajang event ini di homepage & halaman /wfc buat brand awareness. Hanya tampil kalau Status = Terbuka.'}
          </p>
        </div>
        <button onClick={toggleShowOnLanding} type="button" className={`relative inline-flex h-7 w-12 items-center rounded-full transition shrink-0 ${settings.show_on_landing ? 'bg-purple-500' : 'bg-slate-300'}`}>
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${settings.show_on_landing ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Pengaturan */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <h2 className="font-bold text-slate-800 mb-4">Pengaturan</h2>
        <div className="space-y-4">
          <div><label className={label}>Judul</label><input className={input} value={settings.title} onChange={e => setS('title', e.target.value)} /></div>
          <div>
            <label className={label}>Deskripsi / intro <span className="text-slate-400 font-normal">(tampil di atas form)</span></label>
            <textarea className={input} rows={6} value={settings.description} onChange={e => setS('description', e.target.value)} placeholder="Info event: tanggal, jam, tempat, kuota, syarat follow…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Tanggal event <span className="text-slate-400 font-normal">(buat kartu di landing)</span></label><input type="date" className={input} value={settings.event_date} onChange={e => setS('event_date', e.target.value)} /></div>
            <div><label className={label}>Lokasi</label><input className={input} value={settings.location} onChange={e => setS('location', e.target.value)} placeholder="Cold 'N Brew, Purwokerto" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className={label}>Cafe (kolab)</label><input className={input} value={settings.cafe_name} onChange={e => setS('cafe_name', e.target.value)} placeholder="Cold 'N Brew" /></div>
            <div><label className={label}>Kuota</label><input type="number" min={1} className={input} value={settings.quota} onChange={e => setS('quota', e.target.value)} placeholder="mis. 20 (kosong = tak terbatas)" /></div>
            <div><label className={label}>Status</label>
              <select className={input + ' bg-white'} value={settings.status} onChange={e => setS('status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Link grup WhatsApp</label><input className={input} value={settings.whatsapp_group_url} onChange={e => setS('whatsapp_group_url', e.target.value)} placeholder="https://chat.whatsapp.com/…" /></div>
            <div><label className={label}>Label tombol WhatsApp</label><input className={input} value={settings.whatsapp_group_label} onChange={e => setS('whatsapp_group_label', e.target.value)} placeholder="Klik Sini" /></div>
          </div>
          <div><label className={label}>Pesan setelah submit</label><textarea className={input} rows={2} value={settings.success_message} onChange={e => setS('success_message', e.target.value)} placeholder="Makasih udah daftar! …" /></div>
        </div>
      </div>

      {/* Builder */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">Pertanyaan <span className="text-slate-400 font-normal">({questions.length})</span></h2>
          <button onClick={addQuestion} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-700"><Plus size={14} /> Tambah pertanyaan</button>
        </div>

        {questions.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Belum ada pertanyaan. Klik “Tambah pertanyaan”.</p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center gap-1 pt-1 text-slate-300">
                    <GripVertical size={15} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2">
                      <input
                        className={input}
                        value={q.label}
                        onChange={e => updateQuestion(q.id, { label: e.target.value })}
                        placeholder={q.type === 'section' ? 'Judul bagian' : 'Teks pertanyaan'}
                      />
                      <select className={input + ' bg-white'} value={q.type} onChange={e => changeType(q.id, e.target.value as FormQuestionType)}>
                        {QUESTION_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {q.type === 'section' ? (
                      <textarea className={input} rows={3} value={q.help ?? ''} onChange={e => updateQuestion(q.id, { help: e.target.value })} placeholder="Isi blok info (mis. daftar rules)…" />
                    ) : (
                      <input className={input} value={q.help ?? ''} onChange={e => updateQuestion(q.id, { help: e.target.value })} placeholder="Teks bantuan (opsional)" />
                    )}

                    {needsOptions(q.type) && (
                      <div className="space-y-2">
                        {(q.options ?? []).map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-slate-300 text-xs w-4">{i + 1}.</span>
                            <input className={input} value={opt} onChange={e => setOption(q.id, i, e.target.value)} placeholder={`Opsi ${i + 1}`} />
                            {(q.options?.length ?? 0) > 1 && (
                              <button onClick={() => removeOption(q.id, i)} className="text-slate-300 hover:text-red-400 shrink-0"><Trash2 size={15} /></button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addOption(q.id)} className="text-xs text-purple-600 font-medium flex items-center gap-1 hover:underline"><Plus size={12} /> Tambah opsi</button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {q.type !== 'section' ? (
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                          <input type="checkbox" className="accent-purple-600" checked={!!q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} />
                          Wajib diisi
                        </label>
                      ) : <span className="text-xs text-slate-400">Blok info — tidak ada jawaban</span>}
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30" title="Naik"><ChevronUp size={15} /></button>
                        <button onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30" title="Turun"><ChevronDown size={15} /></button>
                        <button onClick={() => removeQuestion(q.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Hapus"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">Perubahan pertanyaan tersimpan saat klik “Simpan” di atas.</p>
      </div>

      {/* Responses */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-800 flex items-center gap-2"><Users size={16} className="text-slate-400" /> Respons <span className="text-slate-400 font-normal">({responses.length}{form.quota ? ` / ${form.quota}` : ''})</span></span>
          {responses.length > 0 && (
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-700"><Download size={14} /> Export CSV</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Waktu</th>
                {answerCols.map((q, i) => (
                  <th key={q.id} className="text-left font-semibold px-4 py-3 whitespace-nowrap max-w-[220px] truncate" title={q.label}>{q.label || `Pertanyaan ${i + 1}`}</th>
                ))}
                <th className="text-left font-semibold px-4 py-3">Hadir</th>
                <th className="text-right font-semibold px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {responses.length === 0 ? (
                <tr><td colSpan={answerCols.length + 3} className="px-5 py-12 text-center text-slate-400">Belum ada respons.</td></tr>
              ) : responses.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDatetime(r.created_at)}</td>
                  {answerCols.map(q => {
                    const v = r.answers?.[q.id]
                    const text = v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v)
                    return <td key={q.id} className="px-4 py-3 text-slate-700 max-w-[240px]"><span className="line-clamp-3 break-words">{text || <span className="text-slate-300">—</span>}</span></td>
                  })}
                  <td className="px-4 py-3">
                    <button onClick={() => toggleAttended(r)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${r.attended ? 'bg-green-500' : 'bg-slate-300'}`} title="Tandai hadir">
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${r.attended ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteResponse(r)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Hapus respons"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
