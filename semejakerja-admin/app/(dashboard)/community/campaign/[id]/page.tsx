'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, PromoCode, CampaignLead, UserProfile } from '@/types'
import { formatCurrency, formatDate, formatDatetime } from '@/lib/utils/format'
import {
  OBJECTIVE_OPTIONS, STATUS_LABELS, computeStats, computeRoi, targetProgress, type UsageRow,
} from '../lib'
import {
  ArrowLeft, Rocket, Loader2, Save, Users, Ticket, TrendingUp, Wallet,
  BadgePercent, Circle, ExternalLink, Tag,
} from 'lucide-react'

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const fromDateInput = (v: string) => (v ? new Date(v).toISOString() : null)

export default function CampaignDetailPage() {
  const supabase = createClient()
  const id = useParams().id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [leads, setLeads] = useState<CampaignLead[]>([])
  const [usages, setUsages] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState<Record<string, unknown> | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data: camp } = await supabase.from('campaigns').select('*').eq('id', id).single()
    if (!camp) { setLoading(false); return }
    setCampaign(camp)
    setForm({
      name: camp.name, objective: camp.objective, description: camp.description ?? '',
      status: camp.status, starts_at: toDateInput(camp.starts_at), ends_at: toDateInput(camp.ends_at),
      target_metric: camp.target_metric ?? 'signups', target_value: camp.target_value ?? '',
      budget: camp.budget ?? '', discount_percent: camp.discount_percent ?? 30,
      quota: camp.quota ?? '', code_valid_days: camp.code_valid_days ?? 14,
      headline: camp.headline ?? '', subheadline: camp.subheadline ?? '',
      cta_label: camp.cta_label ?? 'Daftar sekarang',
    })

    const { data: codeRows } = await supabase.from('promo_codes').select('*').eq('campaign_id', id).order('created_at', { ascending: false })
    const codeList = (codeRows ?? []) as PromoCode[]
    setCodes(codeList)

    // Leads + merge profil (tidak ada FK langsung leads->user_profiles)
    const { data: leadRows } = await supabase.from('campaign_leads')
      .select('*, promo_code:promo_codes(code, is_active, expires_at)')
      .eq('campaign_id', id).order('created_at', { ascending: false })
    const leadList = (leadRows ?? []) as CampaignLead[]
    const userIds = [...new Set(leadList.map(l => l.user_id))]
    if (userIds.length) {
      const { data: profiles } = await supabase.from('user_profiles').select('id, full_name, phone').in('id', userIds)
      const pmap = new Map((profiles ?? []).map(p => [p.id, p as UserProfile]))
      leadList.forEach(l => { l.user_profile = pmap.get(l.user_id) })
    }
    setLeads(leadList)

    // Usage untuk statistik diskon/pemasukan.
    // Supabase menge-embed memberships sebagai array (tanpa generated types),
    // padahal FK-nya to-one → normalkan ambil elemen pertama.
    const codeIds = codeList.map(c => c.id)
    if (codeIds.length) {
      const { data: usageRows } = await supabase.from('promo_code_usages')
        .select('code_id, membership:memberships(price_paid)').in('code_id', codeIds)
      const dmap = new Map(codeList.map(c => [c.id, c.discount_percent]))
      type Priced = { price_paid: number | null }
      const rows = (usageRows ?? []) as Array<{ code_id: string; membership: Priced | Priced[] | null }>
      setUsages(rows.map(u => {
        const m = Array.isArray(u.membership) ? u.membership[0] : u.membership
        return {
          code_id: u.code_id,
          discount_percent: dmap.get(u.code_id) ?? 0,
          price_paid: m?.price_paid ?? null,
        }
      }))
    } else {
      setUsages([])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const stats = campaign ? computeStats(codes, usages, leads.length) : null
  const roi = stats ? computeRoi(stats) : null
  const progress = campaign && stats ? targetProgress(campaign, stats) : null
  const isLive = !!campaign?.is_launch && !!campaign?.is_published && campaign?.status === 'active'

  const set = (k: string, v: unknown) => setForm(f => (f ? { ...f, [k]: v } : f))

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    const { error } = await supabase.from('campaigns').update({
      name: form.name, objective: form.objective, description: form.description || null,
      status: form.status, starts_at: fromDateInput(form.starts_at as string), ends_at: fromDateInput(form.ends_at as string),
      target_metric: form.target_metric || null,
      target_value: form.target_value === '' ? null : Number(form.target_value),
      budget: form.budget === '' ? null : Number(form.budget),
      discount_percent: form.discount_percent === '' ? null : Number(form.discount_percent),
      quota: form.quota === '' ? null : Number(form.quota),
      code_valid_days: Number(form.code_valid_days) || 14,
      headline: form.headline || null, subheadline: form.subheadline || null,
      cta_label: form.cta_label || null,
    }).eq('id', id)
    setSaving(false)
    if (error) { showToast('Gagal simpan: ' + error.message); return }
    showToast('Perubahan tersimpan')
    load()
  }

  const togglePublish = async () => {
    if (!campaign) return
    setPublishing(true)
    const next = !campaign.is_published
    const { error } = await supabase.from('campaigns').update({ is_published: next }).eq('id', id)
    setPublishing(false)
    if (error) { showToast('Gagal ubah publikasi: ' + error.message); return }
    setCampaign({ ...campaign, is_published: next })
    showToast(next ? 'Campaign dipublikasikan' : 'Publikasi dimatikan')
  }

  if (loading) return <div className="p-8 flex items-center gap-2 text-slate-400"><Loader2 size={18} className="animate-spin" /> Memuat…</div>
  if (!campaign || !form) return <div className="p-8 text-slate-400">Campaign tidak ditemukan. <Link href="/community/campaign" className="text-purple-600">Kembali</Link></div>

  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'
  const label = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <Link href="/community/campaign" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"><ArrowLeft size={15} /> Semua Campaign</Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {campaign.is_launch && <Rocket size={22} className="text-fuchsia-500" />}
          <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
          {isLive && <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600"><Circle size={8} className="fill-green-500 text-green-500" /> LIVE</span>}
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan
        </button>
      </div>

      {/* Launch publish switch */}
      {campaign.is_launch && (
        <div className={`rounded-2xl border p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${campaign.is_published ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-white'}`}>
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-2"><Rocket size={16} className="text-fuchsia-500" /> Mode Launch di halaman Pricing</div>
            <p className="text-xs text-slate-500 mt-1">
              {isLive
                ? 'Sedang tayang: halaman Pricing menampilkan harga + form pendaftaran.'
                : campaign.is_published
                  ? 'Publikasi ON, tapi belum tayang. Pastikan Status = Aktif dan berada dalam periode.'
                  : 'Matikan/nyalakan untuk menampilkan section launch di website.'}
            </p>
          </div>
          <button onClick={togglePublish} disabled={publishing} className={`relative inline-flex h-7 w-12 items-center rounded-full transition shrink-0 ${campaign.is_published ? 'bg-green-500' : 'bg-slate-300'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${campaign.is_published ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={<Users size={16} />} label="Pendaftar" value={`${stats!.lead_count}${campaign.quota ? ` / ${campaign.quota}` : ''}`} />
        <StatCard icon={<Ticket size={16} />} label="Penukaran" value={String(stats!.redemptions)} />
        <StatCard icon={<BadgePercent size={16} />} label="Total Diskon" value={formatCurrency(stats!.total_discount)} />
        <StatCard icon={<Wallet size={16} />} label="Pemasukan" value={formatCurrency(stats!.total_revenue)} />
        <StatCard icon={<TrendingUp size={16} />} label="ROI" value={roi === null ? '—' : `${roi.toFixed(1)}×`} />
      </div>

      {/* Target progress */}
      {progress !== null && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 font-medium">Target {campaign.target_metric === 'revenue' ? 'pemasukan' : 'pendaftar'}</span>
            <span className="text-slate-500">
              {campaign.target_metric === 'revenue' ? formatCurrency(stats!.total_revenue) : stats!.lead_count}
              {' / '}
              {campaign.target_metric === 'revenue' ? formatCurrency(campaign.target_value!) : campaign.target_value}
              <span className="ml-2 font-semibold text-purple-600">{Math.round(progress * 100)}%</span>
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* General config */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Pengaturan Umum</h2>
          <div className="space-y-4">
            <div><label className={label}>Nama</label><input className={input} value={form.name as string} onChange={e => set('name', e.target.value)} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={label}>Objective</label>
                <select className={input + ' bg-white'} value={form.objective as string} onChange={e => set('objective', e.target.value)}>
                  {OBJECTIVE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div><label className={label}>Status</label>
                <select className={input + ' bg-white'} value={form.status as string} onChange={e => set('status', e.target.value)}>
                  {(['draft', 'active', 'ended'] as const).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div><label className={label}>Deskripsi (internal)</label><textarea className={input} rows={2} value={form.description as string} onChange={e => set('description', e.target.value)} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={label}>Mulai</label><input type="date" className={input} value={form.starts_at as string} onChange={e => set('starts_at', e.target.value)} /></div>
              <div><label className={label}>Selesai</label>
                <input type="date" className={input} value={form.ends_at as string} onChange={e => set('ends_at', e.target.value)} />
                {form.starts_at ? (
                  <button type="button" onClick={() => { const d = new Date(form.starts_at as string); d.setDate(d.getDate() + 7); set('ends_at', d.toISOString().slice(0, 10)) }} className="text-[11px] text-purple-600 mt-1 hover:underline">+ 1 minggu dari mulai</button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className={label}>Metrik target</label>
                <select className={input + ' bg-white'} value={form.target_metric as string} onChange={e => set('target_metric', e.target.value)}>
                  <option value="signups">Pendaftar</option>
                  <option value="revenue">Pemasukan</option>
                </select>
              </div>
              <div><label className={label}>Nilai target</label><input type="number" min={0} className={input} value={form.target_value as string} onChange={e => set('target_value', e.target.value)} /></div>
              <div><label className={label}>Budget diskon</label><input type="number" min={0} className={input} value={form.budget as string} onChange={e => set('budget', e.target.value)} /></div>
            </div>
          </div>
        </div>

        {/* Launch config */}
        {campaign.is_launch && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><Rocket size={16} className="text-fuchsia-500" /> Konten Launch</h2>
            <p className="text-xs text-slate-400 mb-4">Tampil di halaman Pricing saat campaign LIVE.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className={label}>Diskon (%)</label><input type="number" min={1} max={100} className={input} value={form.discount_percent as string} onChange={e => set('discount_percent', e.target.value)} /></div>
                <div><label className={label}>Kuota</label><input type="number" min={1} placeholder="∞" className={input} value={form.quota as string} onChange={e => set('quota', e.target.value)} /></div>
                <div><label className={label}>Kode berlaku (hari)</label><input type="number" min={1} className={input} value={form.code_valid_days as string} onChange={e => set('code_valid_days', e.target.value)} /></div>
              </div>
              <div><label className={label}>Headline</label><input className={input} placeholder="Jadi Founding Member Semeja Kerja" value={form.headline as string} onChange={e => set('headline', e.target.value)} /></div>
              <div><label className={label}>Subheadline</label><textarea className={input} rows={2} placeholder="Daftar sekarang, dapat diskon 30% seumur membership." value={form.subheadline as string} onChange={e => set('subheadline', e.target.value)} /></div>
              <div><label className={label}>Label tombol (CTA)</label><input className={input} value={form.cta_label as string} onChange={e => set('cta_label', e.target.value)} /></div>
            </div>
          </div>
        )}
      </div>

      {/* Leads */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2"><Users size={16} className="text-slate-400" /> Pendaftar <span className="text-slate-400 font-normal">({leads.length})</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Nama</th>
                <th className="text-left font-semibold px-5 py-3">WhatsApp</th>
                <th className="text-left font-semibold px-5 py-3">Kode</th>
                <th className="text-left font-semibold px-5 py-3">Status</th>
                <th className="text-left font-semibold px-5 py-3">Daftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Belum ada pendaftar.</td></tr>
              ) : leads.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{l.user_profile?.full_name ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-5 py-3 text-slate-500">{l.user_profile?.phone ?? '—'}</td>
                  <td className="px-5 py-3"><code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{l.promo_code?.code ?? '—'}</code></td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${l.status === 'redeemed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {l.status === 'redeemed' ? 'Sudah pakai' : 'Terdaftar'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{formatDatetime(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attached promo codes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 font-bold text-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-2"><Tag size={16} className="text-slate-400" /> Promo Code di campaign ini <span className="text-slate-400 font-normal">({codes.length})</span></span>
          <Link href="/community/promo-codes" className="text-xs text-purple-600 hover:underline flex items-center gap-1">Kelola <ExternalLink size={12} /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Kode</th>
                <th className="text-left font-semibold px-5 py-3">Diskon</th>
                <th className="text-left font-semibold px-5 py-3">Terpakai</th>
                <th className="text-left font-semibold px-5 py-3">Kadaluarsa</th>
                <th className="text-left font-semibold px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Belum ada kode. Kode launch dibuat otomatis saat orang mendaftar.</td></tr>
              ) : codes.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3"><code className="font-mono text-xs font-bold text-slate-700">{c.code}</code></td>
                  <td className="px-5 py-3 text-purple-700 font-semibold">{c.discount_percent}%</td>
                  <td className="px-5 py-3 text-slate-600">{c.used_count} / {c.max_usage ?? '∞'}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{c.expires_at ? formatDate(c.expires_at) : 'Lifetime'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">{icon}<span>{label}</span></div>
      <div className="text-lg font-bold text-slate-800 truncate">{value}</div>
    </div>
  )
}
