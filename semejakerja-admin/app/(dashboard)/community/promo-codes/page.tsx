'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { PromoCode, Campaign } from '@/types'
import { formatDate, generatePromoCode } from '@/lib/utils/format'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import { Plus, Tag, Copy, Loader2, X, Infinity as InfinityIcon, Lock, Mail, Trash2 } from 'lucide-react'

// Parse teks bebas (dipisah koma / spasi / baris baru / titik koma) jadi
// daftar email unik, lowercase, tanpa duplikat.
const parseEmails = (raw: string): string[] =>
  Array.from(new Set(
    raw.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean),
  ))

const isValidEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)

const TYPE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  event: 'bg-amber-100 text-amber-700',
  community: 'bg-purple-100 text-purple-700',
  partner: 'bg-emerald-100 text-emerald-700',
  launch: 'bg-fuchsia-100 text-fuchsia-700',
}

export default function PromoCodesPage() {
  const supabase = createClient()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [campaigns, setCampaigns] = useState<Pick<Campaign, 'id' | 'name'>[]>([])
  const [emailsByCode, setEmailsByCode] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterActive, setFilterActive] = useState('all')
  const [filterCampaign, setFilterCampaign] = useState('all')

  // Modal kelola email untuk kode yang sudah ada
  const [emailModal, setEmailModal] = useState<{ id: string; code: string } | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)

  const [form, setForm] = useState({
    code: '',
    type: 'community' as PromoCode['type'],
    discount_percent: 10,
    max_usage: '' as string | number,
    expires_at: '',
    campaign_id: '' as string,
    allowed_emails: '',
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: codeRows }, { data: campRows }, { data: emailRows }] = await Promise.all([
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('campaigns').select('id, name').order('created_at', { ascending: false }),
      supabase.from('promo_code_allowed_emails').select('code_id, email'),
    ])
    setCodes((codeRows ?? []) as PromoCode[])
    setCampaigns((campRows ?? []) as Pick<Campaign, 'id' | 'name'>[])
    const map = new Map<string, string[]>()
    for (const row of (emailRows ?? []) as { code_id: string; email: string }[]) {
      const list = map.get(row.code_id) ?? []
      list.push(row.email)
      map.set(row.code_id, list)
    }
    setEmailsByCode(map)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const campaignName = useMemo(
    () => new Map(campaigns.map(c => [c.id, c.name])),
    [campaigns],
  )

  const filtered = useMemo(() => codes.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false
    if (filterActive === 'active' && !c.is_active) return false
    if (filterActive === 'inactive' && c.is_active) return false
    if (filterCampaign === 'none' && c.campaign_id) return false
    if (filterCampaign !== 'all' && filterCampaign !== 'none' && c.campaign_id !== filterCampaign) return false
    return true
  }), [codes, filterType, filterActive, filterCampaign])

  const { page, setPage, pageCount, pageItems, pageSize, total } =
    usePagination(filtered, `${filterType}|${filterActive}|${filterCampaign}`)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validasi email allow-list dulu (kalau diisi) sebelum menyentuh DB
    const emails = parseEmails(form.allowed_emails)
    const invalid = emails.filter(e => !isValidEmail(e))
    if (invalid.length) { showToast('Email tidak valid: ' + invalid.join(', ')); return }

    setSaving(true)
    const { data: created, error } = await supabase.from('promo_codes').insert({
      code: form.code.toUpperCase(),
      type: form.type,
      discount_percent: form.discount_percent,
      max_usage: form.max_usage === '' ? null : Number(form.max_usage),
      expires_at: form.expires_at || null,
      campaign_id: form.campaign_id || null,
      is_active: true,
    }).select('id').single()
    if (error || !created) {
      setSaving(false)
      showToast('Gagal buat kode: ' + (error?.message ?? 'unknown'))
      return
    }
    if (emails.length) {
      const { error: emailErr } = await supabase.from('promo_code_allowed_emails')
        .insert(emails.map(email => ({ code_id: created.id, email })))
      if (emailErr) {
        setSaving(false)
        showToast('Kode dibuat, tapi email gagal disimpan: ' + emailErr.message)
        setShowModal(false)
        load()
        return
      }
    }
    setSaving(false)
    showToast(emails.length ? `Kode dibuat, dibatasi ke ${emails.length} email` : 'Promo code berhasil dibuat!')
    setShowModal(false)
    setForm({ code: '', type: 'community', discount_percent: 10, max_usage: '', expires_at: '', campaign_id: '', allowed_emails: '' })
    load()
  }

  const handleToggle = async (id: string, currentState: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !currentState }).eq('id', id)
    setCodes(prev => prev.map(c => (c.id === id ? { ...c, is_active: !currentState } : c)))
    showToast(currentState ? 'Kode dinonaktifkan' : 'Kode diaktifkan kembali')
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Hapus promo code "${code}"?`)) return
    await supabase.from('promo_codes').delete().eq('id', id)
    setCodes(prev => prev.filter(c => c.id !== id))
    showToast('Kode dihapus')
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    showToast('Kode disalin!')
  }

  const currentEmails = emailModal ? (emailsByCode.get(emailModal.id) ?? []) : []

  const handleAddEmails = async () => {
    if (!emailModal) return
    const parsed = parseEmails(emailInput)
    const invalid = parsed.filter(e => !isValidEmail(e))
    if (invalid.length) { showToast('Email tidak valid: ' + invalid.join(', ')); return }
    const fresh = parsed.filter(e => !currentEmails.includes(e))
    if (!fresh.length) { showToast('Email sudah ada di daftar'); return }
    setEmailBusy(true)
    const { error } = await supabase.from('promo_code_allowed_emails')
      .insert(fresh.map(email => ({ code_id: emailModal.id, email })))
    setEmailBusy(false)
    if (error) { showToast('Gagal tambah email: ' + error.message); return }
    setEmailsByCode(prev => {
      const next = new Map(prev)
      next.set(emailModal.id, [...currentEmails, ...fresh])
      return next
    })
    setEmailInput('')
    showToast(`${fresh.length} email ditambahkan`)
  }

  const handleRemoveEmail = async (email: string) => {
    if (!emailModal) return
    setEmailBusy(true)
    const { error } = await supabase.from('promo_code_allowed_emails')
      .delete().eq('code_id', emailModal.id).eq('email', email)
    setEmailBusy(false)
    if (error) { showToast('Gagal hapus email: ' + error.message); return }
    setEmailsByCode(prev => {
      const next = new Map(prev)
      const remaining = currentEmails.filter(e => e !== email)
      if (remaining.length) next.set(emailModal.id, remaining)
      else next.delete(emailModal.id)
      return next
    })
    showToast('Email dihapus')
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promo Code</h1>
          <p className="text-slate-500 mt-1">Buat dan kelola kode diskon untuk komunitas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Tipe</option>
            <option value="student">Student</option>
            <option value="event">Event</option>
            <option value="community">Community</option>
            <option value="partner">Partner</option>
            <option value="launch">Launch</option>
          </select>
          <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none max-w-[180px]">
            <option value="all">Semua Campaign</option>
            <option value="none">Tanpa campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
            <Plus size={16} /> Buat Kode
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Kode</th>
                <th className="text-left font-semibold px-5 py-3">Diskon</th>
                <th className="text-left font-semibold px-5 py-3">Expired</th>
                <th className="text-left font-semibold px-5 py-3 min-w-[160px]">Usage</th>
                <th className="text-left font-semibold px-5 py-3">Campaign</th>
                <th className="text-left font-semibold px-5 py-3">Status</th>
                <th className="text-right font-semibold px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td></tr>
              )) : pageItems.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">Belum ada promo code.</td></tr>
              ) : pageItems.map(code => (
                <tr key={code.id} className={`hover:bg-slate-50 transition ${code.is_active ? '' : 'opacity-60'}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-purple-400 shrink-0" />
                      <div>
                        <code className="font-mono font-bold text-slate-800 tracking-wide">{code.code}</code>
                        <span className={`ml-0 block w-fit mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${TYPE_COLORS[code.type] ?? 'bg-slate-100 text-slate-600'}`}>{code.type}</span>
                        {(emailsByCode.get(code.id)?.length ?? 0) > 0 && (
                          <span
                            title={`Khusus: ${emailsByCode.get(code.id)!.join(', ')}`}
                            className="mt-1 inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700"
                          >
                            <Lock size={9} /> {emailsByCode.get(code.id)!.length} EMAIL
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-purple-700">{code.discount_percent}%</td>
                  <td className="px-5 py-3.5">
                    {code.expires_at ? (
                      <span className="text-slate-500 text-xs">{formatDate(code.expires_at)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[11px] font-medium"><InfinityIcon size={11} /> Lifetime</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-slate-700 text-xs mb-1">{code.used_count} {code.max_usage ? `/ ${code.max_usage}` : '/ ∞'}</div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-32">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: code.max_usage ? `${Math.min((code.used_count / code.max_usage) * 100, 100)}%` : (code.used_count > 0 ? '100%' : '0%') }} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {code.campaign_id ? (
                      <Link href={`/community/campaign/${code.campaign_id}`} className="text-xs text-purple-600 hover:underline">{campaignName.get(code.campaign_id) ?? 'Campaign'}</Link>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${code.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{code.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => copyCode(code.code)} title="Salin kode" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Copy size={14} /></button>
                      <button onClick={() => { setEmailModal({ id: code.id, code: code.code }); setEmailInput('') }} title="Kelola email yang boleh pakai" className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400"><Mail size={14} /></button>
                      <button onClick={() => handleToggle(code.id, code.is_active)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${code.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{code.is_active ? 'Off' : 'On'}</button>
                      <button onClick={() => handleDelete(code.id, code.code)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="kode" />
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Buat Promo Code</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kode</label>
                <div className="flex gap-2">
                  <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SEMEJA20" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <button type="button" onClick={() => setForm({ ...form, code: generatePromoCode() })} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-600 transition">Auto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as PromoCode['type'] })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
                    <option value="student">Student</option>
                    <option value="event">Event</option>
                    <option value="community">Community</option>
                    <option value="partner">Partner</option>
                    <option value="launch">Launch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Diskon (%)</label>
                  <input type="number" min={1} max={100} required value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Usage (kosong = ∞)</label>
                  <input type="number" min={1} value={form.max_usage} onChange={e => setForm({ ...form, max_usage: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kadaluarsa</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign (opsional)</label>
                <select value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
                  <option value="">— Tanpa campaign —</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock size={13} className="text-rose-400" /> Batasi ke email tertentu (opsional)
                </label>
                <textarea
                  value={form.allowed_emails}
                  onChange={e => setForm({ ...form, allowed_emails: e.target.value })}
                  rows={2}
                  placeholder="a@email.com, b@email.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-y"
                />
                <p className="text-[11px] text-slate-400 mt-1">Kosongkan = boleh dipakai siapa saja. Pisah beberapa email dengan koma / spasi / baris baru. Dicek dari email akun yang login.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Buat Kode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage allowed-emails modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Lock size={18} className="text-rose-500" /> Email yang boleh pakai</h2>
              <button onClick={() => setEmailModal(null)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Kode <code className="font-mono font-bold text-slate-700">{emailModal.code}</code>. {currentEmails.length ? 'Hanya email di bawah yang bisa menebus kode ini.' : 'Belum dibatasi — saat ini boleh dipakai siapa saja.'}</p>

            <div className="flex gap-2 mb-4">
              <input
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmails() } }}
                placeholder="tambah@email.com"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
              <button onClick={handleAddEmails} disabled={emailBusy || !emailInput.trim()} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-1.5">
                {emailBusy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Tambah
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
              {currentEmails.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">Belum ada email. Kode terbuka untuk semua.</div>
              ) : currentEmails.map(email => (
                <div key={email} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-slate-700 truncate">{email}</span>
                  <button onClick={() => handleRemoveEmail(email)} disabled={emailBusy} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50 shrink-0"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={() => setEmailModal(null)} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700">Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
