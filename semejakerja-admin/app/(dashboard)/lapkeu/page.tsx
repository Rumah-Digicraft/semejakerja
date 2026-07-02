'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { CashflowEntry, BusinessLineFinancial, MonthlyFinancial } from '@/types'
import {
  TrendingUp, TrendingDown, Wallet, BarChart2, PieChart,
  Download, RefreshCw, Info, BookOpen, Briefcase,
  Map, Users, Dumbbell, Bike, ChevronDown, ChevronUp, FileText,
  MapPin, CheckCircle, AlertTriangle, AlertCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend
} from 'recharts'

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b']

const LINE_META = {
  maps:      { label: 'Maps Purwokerto',    icon: <MapPin size={24} className="text-blue-500" />, desc: 'Direktori kafe & WFC', bmcLabel: 'Key Partner (Kafe Partner)' },
  community: { label: 'Community Membership', icon: <Users size={24} className="text-purple-500" />, desc: 'Subscription tier anggota', bmcLabel: 'Revenue Stream (Membership Fee)' },
  moves:     { label: 'Semeja Moves',        icon: <Dumbbell size={24} className="text-emerald-500" />, desc: 'Kelas olahraga per sesi', bmcLabel: 'Revenue Stream (Pay-per-Session)' },
  addon:     { label: 'Add-on Olahraga',     icon: <Bike size={24} className="text-orange-500" />, desc: 'Badminton & Padel', bmcLabel: 'Revenue Stream (Pass Bulanan + Drop-in)' },
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function safeNum(n: unknown): number { return typeof n === 'number' && !isNaN(n) ? n : 0 }

function getMonthKey(dateStr: string) {
  const [y, m] = dateStr.split('-')
  return `${y}-${m}`
}

function calcMarginColor(margin: number) {
  if (margin >= 60) return 'text-emerald-600'
  if (margin >= 30) return 'text-amber-600'
  return 'text-red-500'
}

// ── TOOLTIP CUSTOM ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── BILINGUAL GLOSSARY ────────────────────────────────────────────────────────
const GLOSSARY = [
  { biz: 'Revenue', awam: 'Uang Masuk / Pemasukan', desc: 'Total pendapatan yang diterima dari semua sumber' },
  { biz: 'Cost / Expense', awam: 'Uang Keluar / Pengeluaran', desc: 'Total biaya yang dikeluarkan untuk operasional' },
  { biz: 'Gross Profit', awam: 'Untung Kotor', desc: 'Pemasukan dikurangi pengeluaran, sebelum biaya overhead' },
  { biz: 'Net Profit', awam: 'Untung Bersih / Sisa', desc: 'Yang benar-benar tersisa setelah semua pengeluaran' },
  { biz: 'Margin (%)', awam: 'Persentase Untung', desc: 'Dari setiap Rp 100 yang masuk, berapa yang jadi untung' },
  { biz: 'MRR', awam: 'Pendapatan Rutin per Bulan', desc: 'Pemasukan tetap dari member yang bayar langganan' },
  { biz: 'Revenue Stream', awam: 'Sumber Uang Masuk', desc: 'Cara-cara bisnis menghasilkan uang' },
  { biz: 'Cost Structure', awam: 'Struktur Pengeluaran', desc: 'Rincian dari mana saja uang keluar' },
  { biz: 'BMC', awam: 'Peta Bisnis (Business Model Canvas)', desc: 'Gambaran besar bagaimana bisnis bekerja & menghasilkan uang' },
]

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function LapkeuPage() {
  const supabase = createClient()

  // Data state
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([])
  const [memberRevenue, setMemberRevenue] = useState<{ price_paid: number; created_at: string }[]>([])
  const [addonDropinRev, setAddonDropinRev] = useState<{ price_paid: number | null; created_at: string; session_date: string }[]>([])
  const [addonSubRev, setAddonSubRev] = useState<{ price_paid: number | null; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [filterMonth, setFilterMonth] = useState('all')
  const [mode, setMode] = useState<'bisnis' | 'awam'>('awam')
  const [activeTab, setActiveTab] = useState<'overview' | 'maps' | 'community' | 'moves' | 'addon'>('overview')
  const [showGlossary, setShowGlossary] = useState(false)

  // Load all data
  const load = useCallback(async () => {
    setLoading(true)
    const [cfRes, memRes, dropinRes, subRes] = await Promise.all([
      supabase.from('cashflow_entries').select('*').order('entry_date'),
      supabase.from('memberships').select('price_paid, created_at').eq('status', 'active'),
      supabase.from('addon_dropin').select('price_paid, created_at, session_date').eq('payment_status', 'paid'),
      supabase.from('addon_subscriptions').select('price_paid, created_at').eq('status', 'active'),
    ])
    setCashflow(cfRes.data ?? [])
    setMemberRevenue(memRes.data ?? [])
    setAddonDropinRev(dropinRes.data ?? [])
    setAddonSubRev(subRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── FILTER HELPER ─────────────────────────────────────────────────────────
  function inPeriod(dateStr: string) {
    if (!dateStr) return false
    const [y, m] = dateStr.split('-')
    if (filterYear !== 'all' && y !== filterYear) return false
    if (filterMonth !== 'all' && m !== filterMonth) return false
    return true
  }

  // ── COMPUTED DATA ─────────────────────────────────────────────────────────
  const filteredCashflow = cashflow.filter(e => inPeriod(e.entry_date))

  // --- Moves/Funminton/Padel from cashflow_entries ---
  const movesIncome = filteredCashflow.filter(e => e.category === 'income').reduce((s, e) => s + e.amount, 0)
  const movesExpense = filteredCashflow.filter(e => e.category === 'outcome').reduce((s, e) => s + e.amount, 0)

  // --- Community from memberships ---
  const communityIncome = memberRevenue.filter(m => inPeriod(m.created_at.split('T')[0])).reduce((s, m) => s + safeNum(m.price_paid), 0)

  // --- Addon ---
  const addonDropin = addonDropinRev.filter(d => inPeriod(d.session_date)).reduce((s, d) => s + safeNum(d.price_paid), 0)
  const addonSub = addonSubRev.filter(s => inPeriod(s.created_at.split('T')[0])).reduce((acc, s) => acc + safeNum(s.price_paid), 0)
  const addonIncome = addonDropin + addonSub

  // --- Maps (manualy estimated from notes in cashflow or partner fees — currently 0 unless tagged) ---
  const mapsIncome = filteredCashflow.filter(e => e.description?.toLowerCase().includes('partner') || e.description?.toLowerCase().includes('kafe')).reduce((s, e) => e.category === 'income' ? s + e.amount : s, 0)

  const lines: BusinessLineFinancial[] = [
    { line: 'maps', label: LINE_META.maps.label, icon: LINE_META.maps.icon, income: mapsIncome, expense: 0, grossProfit: mapsIncome, margin: mapsIncome > 0 ? 100 : 0, transactions: 0 },
    { line: 'community', label: LINE_META.community.label, icon: LINE_META.community.icon, income: communityIncome, expense: 0, grossProfit: communityIncome, margin: communityIncome > 0 ? 100 : 0, transactions: memberRevenue.length },
    { line: 'moves', label: LINE_META.moves.label, icon: LINE_META.moves.icon, income: movesIncome, expense: movesExpense, grossProfit: movesIncome - movesExpense, margin: movesIncome > 0 ? ((movesIncome - movesExpense) / movesIncome) * 100 : 0, transactions: filteredCashflow.length },
    { line: 'addon', label: LINE_META.addon.label, icon: LINE_META.addon.icon, income: addonIncome, expense: 0, grossProfit: addonIncome, margin: addonIncome > 0 ? 100 : 0, transactions: addonDropinRev.length + addonSubRev.length },
  ]

  const totalIncome = lines.reduce((s, l) => s + l.income, 0)
  const totalExpense = lines.reduce((s, l) => s + l.expense, 0)
  const totalProfit = totalIncome - totalExpense
  const totalMargin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0

  // ── MONTHLY CHART DATA ────────────────────────────────────────────────────
  const monthlyMap: Record<string, MonthlyFinancial> = {}
  cashflow.filter(e => filterYear === 'all' || e.entry_date.startsWith(filterYear)).forEach(e => {
    const [y, m] = e.entry_date.split('-')
    const key = `${y}-${m}`
    if (!monthlyMap[key]) monthlyMap[key] = { month: MONTHS[parseInt(m) - 1], income: 0, expense: 0, profit: 0 }
    if (e.category === 'income') monthlyMap[key].income += e.amount
    else monthlyMap[key].expense += e.amount
    monthlyMap[key].profit = monthlyMap[key].income - monthlyMap[key].expense
  })
  const monthlyData = Object.values(monthlyMap).slice(-12)

  // ── PIE DATA ─────────────────────────────────────────────────────────────
  const pieData = lines.filter(l => l.income > 0).map(l => ({ name: l.label, value: l.income }))

  // ── YEARS for filter ──────────────────────────────────────────────────────
  const years = Array.from(new Set(cashflow.map(e => e.entry_date.split('-')[0]))).sort().reverse()

  // ── EXPORT CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Lini Bisnis', 'Pemasukan', 'Pengeluaran', 'Profit', 'Margin %'],
      ...lines.map(l => [l.label, l.income, l.expense, l.grossProfit, l.margin.toFixed(1)]),
      ['', '', '', '', ''],
      ['TOTAL', totalIncome, totalExpense, totalProfit, totalMargin.toFixed(1)],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `lapkeu-semejakerja-${filterYear}-${filterMonth}.csv`
    a.click()
  }

  // ── PERFORMANCE VERDICT ────────────────────────────────────────────────────
  const verdict = () => {
    if (totalMargin >= 60) return { icon: <TrendingUp size={24} className="text-emerald-600" />, msg: mode === 'awam' ? 'Mantap! Bisnis lagi bagus banget bulan ini.' : 'High margin — business performing above benchmark', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
    if (totalMargin >= 30) return { icon: <CheckCircle size={24} className="text-blue-600" />, msg: mode === 'awam' ? 'Lumayan bagus. Ada ruang untuk lebih baik lagi.' : 'Healthy margin — consistent but room for optimization', color: 'text-blue-600 bg-blue-50 border-blue-200' }
    if (totalMargin >= 0) return { icon: <AlertTriangle size={24} className="text-amber-600" />, msg: mode === 'awam' ? 'Masih untung, tapi tipis. Perlu perhatian lebih.' : 'Thin margin — cost structure review recommended', color: 'text-amber-600 bg-amber-50 border-amber-200' }
    return { icon: <AlertCircle size={24} className="text-red-600" />, msg: mode === 'awam' ? 'Bulan ini rugi. Biaya lebih besar dari pemasukan.' : 'Operating at a loss — urgent cost review needed', color: 'text-red-600 bg-red-50 border-red-200' }
  }
  const v = verdict()

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-3">
      <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">Memuat data keuangan...</p>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Wallet size={24} className="text-purple-600" /> Laporan Keuangan</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {mode === 'awam' ? 'Versi mudah dipahami — cocok untuk semua orang' : 'Versi bisnis (BMC) — Revenue Streams & Cost Structure'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Mode Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setMode('awam')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${mode === 'awam' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>
              <BookOpen size={13} /> Bahasa Awam
            </button>
            <button onClick={() => setMode('bisnis')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${mode === 'bisnis' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>
              <Briefcase size={13} /> Bahasa Bisnis
            </button>
          </div>

          {/* Filters */}
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Tahun</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
            <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Bulan</option>
            {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
          </select>

          {/* Actions */}
          <button onClick={load} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition"><RefreshCw size={16} /></button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 text-slate-600 transition">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── PERFORMANCE BADGE ─────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border ${v.color}`}>
        <span className="p-1 bg-white/50 rounded-lg">{v.icon}</span>
        <p className="font-medium text-sm">{v.msg}</p>
        <span className="ml-auto font-bold text-lg">{totalMargin.toFixed(1)}% margin</span>
      </div>

      {/* ── SUMMARY CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: mode === 'awam' ? 'Uang Masuk' : 'Total Revenue',
            sublabel: mode === 'awam' ? 'Semua pemasukan dari 4 lini' : 'Gross Revenue — all streams',
            value: formatCurrency(totalIncome),
            color: 'border-l-emerald-500', numColor: 'text-emerald-700'
          },
          {
            label: mode === 'awam' ? 'Uang Keluar' : 'Total Cost',
            sublabel: mode === 'awam' ? 'Semua pengeluaran operasional' : 'Operating Expenses (OPEX)',
            value: formatCurrency(totalExpense),
            color: 'border-l-red-400', numColor: 'text-red-600'
          },
          {
            label: mode === 'awam' ? 'Sisa / Untung' : 'Net Profit',
            sublabel: mode === 'awam' ? 'Yang benar-benar tersisa' : 'Gross Profit (Revenue – Cost)',
            value: formatCurrency(totalProfit),
            color: totalProfit >= 0 ? 'border-l-purple-500' : 'border-l-red-500',
            numColor: totalProfit >= 0 ? 'text-purple-700' : 'text-red-600'
          },
          {
            label: mode === 'awam' ? '% Untung' : 'Profit Margin',
            sublabel: mode === 'awam' ? 'Dari Rp100 masuk, untung berapa?' : 'Net Margin — efficiency ratio',
            value: `${totalMargin.toFixed(1)}%`,
            color: 'border-l-amber-400', numColor: calcMarginColor(totalMargin)
          },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-2xl p-5 border border-slate-100 border-l-4 ${card.color} shadow-sm`}>
            <p className="text-xs font-semibold text-slate-500 mb-0.5">{card.label}</p>
            <p className="text-xs text-slate-400 mb-2">{card.sublabel}</p>
            <p className={`text-xl font-bold ${card.numColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── CHARTS ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <BarChart2 size={16} className="text-purple-500" /> {mode === 'awam' ? 'Tren Uang Masuk vs Keluar per Bulan' : 'Monthly Revenue vs Cost Trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">{mode === 'awam' ? 'Dari data cashflow historis' : 'Based on cashflow_entries (Moves lini) — 12 months'}</p>
          {monthlyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Belum ada data cashflow</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={2}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" name={mode === 'awam' ? 'Masuk' : 'Revenue'} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={mode === 'awam' ? 'Keluar' : 'Cost'} fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <PieChart size={16} className="text-purple-500" /> {mode === 'awam' ? 'Sumber Uang Masuk' : 'Revenue Mix by Stream'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">{mode === 'awam' ? 'Dari mana uang paling banyak datang' : 'Revenue contribution per Business Line'}</p>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RPieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </RPieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── PER LINI BISNIS ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Briefcase size={20} className="text-purple-600" /> {mode === 'awam' ? 'Rincian per Lini Bisnis' : 'Financial Performance by Business Line'}
          </h2>
          <span className="text-xs text-slate-400">{mode === 'awam' ? '(4 bidang usaha Semejakerja)' : '(4 Value Propositions)'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lines.map((line, i) => {
            const meta = LINE_META[line.line]
            const marginColor = calcMarginColor(line.margin)
            return (
              <div key={line.line} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition">
                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="p-2 bg-slate-50 rounded-xl">{line.icon}</span>
                    <div>
                      <h3 className="font-bold text-slate-900">{line.label}</h3>
                      <p className="text-xs text-slate-400">{mode === 'awam' ? meta.desc : meta.bmcLabel}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className={`text-xl font-bold ${marginColor}`}>{line.margin.toFixed(0)}%</p>
                      <p className="text-[10px] text-slate-400">{mode === 'awam' ? 'margin' : 'gross margin'}</p>
                    </div>
                  </div>
                  {/* Margin bar */}
                  <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(line.margin, 100))}%` }} />
                  </div>
                </div>

                {/* Financials */}
                <div className="px-5 py-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-emerald-500" />
                      {mode === 'awam' ? 'Uang Masuk' : 'Revenue'}
                    </span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(line.income)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                      <TrendingDown size={13} className="text-red-400" />
                      {mode === 'awam' ? 'Uang Keluar' : 'Cost (COGS + OPEX)'}
                    </span>
                    <span className="font-semibold text-red-500">{formatCurrency(line.expense)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <span className="text-sm font-medium text-slate-700">
                      {mode === 'awam' ? '✨ Sisa / Untung' : 'Gross Profit'}
                    </span>
                    <span className={`font-bold text-base ${line.grossProfit >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                      {formatCurrency(line.grossProfit)}
                    </span>
                  </div>

                  {/* Kontribusi ke total */}
                  {totalIncome > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-slate-400">
                        {mode === 'awam'
                          ? `Kontribusi ke total: ${((line.income / totalIncome) * 100).toFixed(1)}% dari semua pemasukan`
                          : `Revenue Contribution: ${((line.income / totalIncome) * 100).toFixed(1)}% of total revenue`}
                      </p>
                    </div>
                  )}

                  {/* Mode bisnis: BMC context */}
                  {mode === 'bisnis' && (
                    <div className="pt-2 border-t border-slate-50">
                      <p className="text-xs text-slate-400 italic">{meta.bmcLabel}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── P&L STATEMENT ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-purple-600" /> {mode === 'awam' ? 'Ringkasan Keuangan (Laporan Laba Rugi)' : 'P&L Statement (Profit & Loss)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'awam' ? 'Rekap lengkap semua uang masuk dan keluar' : 'Condensed Income Statement — all business lines'}
            </p>
          </div>
          <FileText size={18} className="text-slate-300" />
        </div>
        <div className="p-5">
          <table className="w-full text-sm">
            <tbody className="space-y-1">
              {/* Revenue section */}
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                <td colSpan={2} className="pb-2 pt-1">{mode === 'awam' ? '▶ PEMASUKAN' : '▶ REVENUE'}</td>
              </tr>
              {lines.map(l => l.income > 0 && (
                <tr key={l.line} className="hover:bg-slate-50/50">
                  <td className="py-1.5 pl-4 text-slate-600 flex items-center gap-2"><span className="scale-75">{l.icon}</span> {l.label}</td>
                  <td className="py-1.5 text-right text-emerald-700 font-medium">{formatCurrency(l.income)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-100">
                <td className="py-2 pl-4 font-bold text-slate-800">{mode === 'awam' ? 'Total Masuk' : 'Total Revenue'}</td>
                <td className="py-2 text-right font-bold text-emerald-700 text-base">{formatCurrency(totalIncome)}</td>
              </tr>

              {/* Cost section */}
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                <td colSpan={2} className="pb-2 pt-4">{mode === 'awam' ? '▶ PENGELUARAN' : '▶ COST OF GOODS SOLD (COGS) + OPEX'}</td>
              </tr>
              {lines.map(l => l.expense > 0 && (
                <tr key={l.line} className="hover:bg-slate-50/50">
                  <td className="py-1.5 pl-4 text-slate-600 flex items-center gap-2"><span className="scale-75">{l.icon}</span> {l.label}</td>
                  <td className="py-1.5 text-right text-red-500 font-medium">({formatCurrency(l.expense)})</td>
                </tr>
              ))}
              {totalExpense === 0 && (
                <tr><td className="py-1.5 pl-4 text-slate-400 italic" colSpan={2}>Belum ada data pengeluaran terkategori</td></tr>
              )}
              <tr className="border-t border-slate-100">
                <td className="py-2 pl-4 font-bold text-slate-800">{mode === 'awam' ? 'Total Keluar' : 'Total Expenses'}</td>
                <td className="py-2 text-right font-bold text-red-500 text-base">({formatCurrency(totalExpense)})</td>
              </tr>

              {/* Net Profit */}
              <tr className={`border-t-2 ${totalProfit >= 0 ? 'border-purple-200' : 'border-red-200'}`}>
                <td className="pt-3 font-bold text-slate-900 text-base">
                  {mode === 'awam' ? 'SISA / UNTUNG BERSIH' : 'NET PROFIT / LOSS'}
                </td>
                <td className={`pt-3 text-right font-bold text-xl ${totalProfit >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                  {formatCurrency(totalProfit)}
                </td>
              </tr>
              <tr>
                <td className="pt-1 text-xs text-slate-400">
                  {mode === 'awam'
                    ? `Dari setiap Rp 100 yang masuk, Rp ${totalMargin.toFixed(0)} adalah untung bersih`
                    : `Net Profit Margin: ${totalMargin.toFixed(1)}%`}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BMC CONTEXT (Bisnis mode only) ──────────────────────────────────── */}
      {mode === 'bisnis' && (
        <div className="bg-gradient-to-br from-purple-50 to-slate-50 rounded-2xl border border-purple-100 p-6">
          <h2 className="font-bold text-purple-800 mb-1 flex items-center gap-2"><BookOpen size={18} /> Business Model Canvas — Konteks Keuangan</h2>
          <p className="text-xs text-purple-600 mb-4">Peta bagaimana Semejakerja menghasilkan dan membelanjakan uang</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: 'Revenue Streams', items: ['Membership subscription fee (Nyantai/Nongkrong/Mode Serius)', 'Pay-per-session Semeja Moves', 'Drop-in Add-on (Badminton/Padel)', 'Pass bulanan Add-on', 'Partner fee Maps Purwokerto'] },
              { title: 'Cost Structure', items: ['Biaya lapangan/venue (variable)', 'Biaya instruktur Moves (variable)', 'Biaya peralatan olahraga', 'Biaya operasional komunitas (fixed)', 'Marketing & promotion'] },
              { title: 'Key Metrics', items: [`MRR Community: ${formatCurrency(communityIncome)}`, `Moves Revenue: ${formatCurrency(movesIncome)}`, `Addon Revenue: ${formatCurrency(addonIncome)}`, `Total Margin: ${totalMargin.toFixed(1)}%`] },
              { title: 'Growth Levers', items: ['Tingkatkan jumlah partner kafe Maps', 'Naikkan fill rate sesi Moves (min 80%)', 'Konversi drop-in ke pass bulanan', 'Tier upgrade nyantai → mode_serius'] },
            ].map(section => (
              <div key={section.title} className="bg-white rounded-xl p-4 border border-purple-100">
                <h4 className="font-semibold text-purple-800 text-sm mb-2">{section.title}</h4>
                <ul className="space-y-1">
                  {section.items.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                      <span className="text-purple-400 mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GLOSSARY ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowGlossary(!showGlossary)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <Info size={16} className="text-purple-500" />
            <span className="font-semibold text-slate-700 text-sm">
              {mode === 'awam' ? '📖 Glosarium: Istilah yang Dipakai' : '📖 Financial Glossary — Bisnis vs Awam'}
            </span>
          </div>
          {showGlossary ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {showGlossary && (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {GLOSSARY.map(g => (
                <div key={g.biz} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-purple-700 text-sm">{g.biz}</span>
                      <span className="text-slate-400 text-xs">→</span>
                      <span className="text-slate-600 text-xs font-medium">{g.awam}</span>
                    </div>
                    <p className="text-xs text-slate-400">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
