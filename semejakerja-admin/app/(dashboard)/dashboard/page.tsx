'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AdminRole } from '@/types'
import { canAccessPath } from '@/lib/access'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import {
  Users, Store, CalendarDays, TrendingUp, Clock, AlertTriangle,
  CheckCircle, XCircle, Loader2, Receipt
} from 'lucide-react'

interface Stats {
  activeMembers: number
  totalCafes: number
  movesSessionsThisMonth: number
  revenueThisMonth: number
  serviceFeeTotal: number
}

interface PendingItem {
  id: string
  type: 'moderasi' | 'ktm' | 'payment'
  label: string
  sublabel: string
  time: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ activeMembers: 0, totalCafes: 0, movesSessionsThisMonth: 0, revenueThisMonth: 0, serviceFeeTotal: 0 })
  const [pending, setPending] = useState<PendingItem[]>([])
  const [role, setRole] = useState<AdminRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Statistik & antrian di sini digerbangi per domain role (peta
      // domain yang sama dengan proxy/sidebar di lib/access.ts) — RLS
      // tetap memblokir datanya, ini mencegah kartu angka 0 menyesatkan.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: roleRow } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle()
      const userRole = (roleRow?.role ?? null) as AdminRole | null
      setRole(userRole)
      if (!userRole) { setLoading(false); return }
      const can = (prefix: string) => canAccessPath(prefix, userRole)

      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const nextStats: Stats = { activeMembers: 0, totalCafes: 0, movesSessionsThisMonth: 0, revenueThisMonth: 0, serviceFeeTotal: 0 }
      let moderasiItems: PendingItem[] = []
      let ktmItems: PendingItem[] = []
      let participantItems: PendingItem[] = []
      let membershipItems: PendingItem[] = []

      const tasks: Promise<void>[] = []

      if (can('/community')) {
        tasks.push((async () => {
          const { count } = await supabase.from('memberships').select('id', { count: 'exact' }).eq('status', 'active')
          nextStats.activeMembers = count ?? 0
        })())
        tasks.push((async () => {
          const { data } = await supabase.from('user_profiles').select('id, full_name, created_at').eq('is_student', true).is('student_verified_at', null).limit(3)
          ktmItems = (data ?? []).map(k => ({
            id: k.id, type: 'ktm' as const,
            label: 'KTM mahasiswa belum diverifikasi',
            sublabel: k.full_name ?? 'Anggota baru',
            time: formatDate(k.created_at),
          }))
        })())
        tasks.push((async () => {
          // Akumulasi biaya layanan (fee flat/transaksi) via RPC SECURITY DEFINER
          // — payment_transactions RLS memblok baca lintas-user dari client.
          const { data } = await supabase.rpc('admin_service_fee_total')
          nextStats.serviceFeeTotal = (data as number | null) ?? 0
        })())
        tasks.push((async () => {
          const { data } = await supabase.from('memberships').select('id, user_profiles(full_name), created_at').eq('status', 'pending_payment').limit(3)
          membershipItems = (data ?? []).map(m => ({
            id: m.id, type: 'payment' as const,
            label: 'Pembayaran membership pending',
            sublabel:
              (Array.isArray(m.user_profiles)
                ? m.user_profiles[0]?.full_name
                : (m.user_profiles as { full_name?: string | null } | null)?.full_name) ?? 'Member',
            time: formatDate(m.created_at),
          }))
        })())
      }

      if (can('/maps')) {
        tasks.push((async () => {
          const { count } = await supabase.from('cafes').select('id', { count: 'exact' })
          nextStats.totalCafes = count ?? 0
        })())
        tasks.push((async () => {
          const { data } = await supabase.from('cafe_submissions').select('id, submitter_name, created_at').eq('status', 'pending').limit(5)
          moderasiItems = (data ?? []).map(s => ({
            id: s.id, type: 'moderasi' as const,
            label: 'Kafe baru perlu review',
            sublabel: `Dari: ${s.submitter_name}`,
            time: formatDate(s.created_at),
          }))
        })())
      }

      if (can('/moves')) {
        tasks.push((async () => {
          const { count } = await supabase.from('sessions').select('id', { count: 'exact' }).gte('session_date', monthStart)
          nextStats.movesSessionsThisMonth = count ?? 0
        })())
        tasks.push((async () => {
          const { data } = await supabase.from('participants').select('id, participant_name, created_at').eq('payment_status', 'pending').limit(3)
          participantItems = (data ?? []).map(p => ({
            id: p.id, type: 'payment' as const,
            label: 'Pembayaran sesi Moves pending',
            sublabel: p.participant_name ?? 'Peserta',
            time: formatDate(p.created_at),
          }))
        })())
      }

      if (can('/lapkeu')) {
        tasks.push((async () => {
          const { data } = await supabase.from('cashflow_entries').select('amount, category').gte('entry_date', monthStart)
          nextStats.revenueThisMonth = data?.reduce((sum, e) => e.category === 'income' ? sum + e.amount : sum, 0) ?? 0
        })())
      }

      await Promise.all(tasks)

      setStats(nextStats)
      setPending([...moderasiItems, ...ktmItems, ...participantItems, ...membershipItems])
      setLoading(false)
    }
    load()
  }, [])

  const can = (prefix: string) => canAccessPath(prefix, role)

  const statCards = [
    { show: can('/community'), label: 'Member Aktif', value: stats.activeMembers.toLocaleString(), icon: <Users size={20} />, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Membership aktif saat ini' },
    { show: can('/community'), label: 'Biaya Layanan Terkumpul', value: formatCurrency(stats.serviceFeeTotal), icon: <Receipt size={20} />, color: 'text-teal-600', bg: 'bg-teal-50', desc: 'Total fee dari transaksi sukses' },
    { show: can('/maps'), label: 'Total Kafe', value: stats.totalCafes.toLocaleString(), icon: <Store size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Kafe terdaftar di Maps' },
    { show: can('/moves'), label: 'Sesi Moves', value: stats.movesSessionsThisMonth.toLocaleString(), icon: <CalendarDays size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Sesi bulan ini' },
    { show: can('/lapkeu'), label: 'Revenue Bulan Ini', value: formatCurrency(stats.revenueThisMonth), icon: <TrendingUp size={20} />, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Estimasi dari cashflow' },
  ].filter(card => card.show)

  const typeConfig = {
    moderasi: { icon: <AlertTriangle size={16} />, color: 'text-amber-500', bg: 'bg-amber-50' },
    ktm: { icon: <CheckCircle size={16} />, color: 'text-blue-500', bg: 'bg-blue-50' },
    payment: { icon: <Clock size={16} />, color: 'text-purple-500', bg: 'bg-purple-50' },
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Selamat datang kembali di Semejakerja Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-20 mb-3" />
            <div className="h-7 bg-slate-100 rounded w-28 mb-1" />
            <div className="h-3 bg-slate-50 rounded w-full" />
          </div>
        )) : statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
            <div className={`inline-flex p-2 rounded-xl ${card.bg} ${card.color} mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{card.label}</p>
            <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Pending Items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Perlu Tindakan Segera</h2>
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
            {pending.length} item
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-slate-300" size={24} />
            </div>
          ) : pending.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
              <p className="text-slate-500 font-medium">Semua bersih! Tidak ada yang perlu ditindaklanjuti.</p>
            </div>
          ) : pending.map(item => {
            const cfg = typeConfig[item.type]
            return (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition">
                <div className={`p-2 rounded-xl ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.sublabel}</p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">{item.time}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
