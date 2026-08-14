'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePagination } from '@/lib/usePagination'
import { Pagination } from '@/components/ui/pagination'
import type { Cafe } from '@/types'
import { Search, Star, ExternalLink, Edit2, Trash2, Plus, CheckCircle, Wifi } from 'lucide-react'

const TIER_COLORS: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-600',
  verified: 'bg-blue-100 text-blue-700',
  partner: 'bg-purple-100 text-purple-700',
  sponsor: 'bg-amber-100 text-amber-700',
}

export default function DataKafePage() {
  const supabase = createClient()
  const router = useRouter()
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const load = async () => {
      const cafesRes = await supabase.from('cafes').select('*').order('name')
      setCafes(cafesRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return cafes.filter(c => {
      if (filterTier !== 'all' && c.tier !== filterTier) return false
      if (q && !c.name.toLowerCase().includes(q) && !(c.address ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [cafes, search, filterTier])

  const { page, setPage, pageCount, pageItems, pageSize, total } = usePagination(
    filtered,
    `${search}|${filterTier}`,
  )

  const handleDelete = async (cafe: Cafe) => {
    if (!confirm(`Hapus kafe "${cafe.name}" secara permanen?`)) return
    const { data, error } = await supabase.from('cafes').delete().eq('id', cafe.id).select('id')
    if (error) {
      showToast(error.code === '23503'
        ? 'Gagal: masih ada data terkait (review/foto/edit komunitas) untuk kafe ini.'
        : `Gagal menghapus: ${error.message}`)
      return
    }
    if (!data?.length) { showToast('Gagal menghapus: tidak ada baris terhapus (cek role admin / RLS)'); return }
    setCafes(prev => prev.filter(c => c.id !== cafe.id))
    showToast('Kafe dihapus')
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Kafe</h1>
          <p className="text-slate-500 mt-1">Kelola kafe yang tampil di peta publik Maps Purwokerto</p>
        </div>
        <Link
          href="/maps/cafes/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
        >
          <Plus size={16} /> Tambah Kafe
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / alamat kafe..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="all">Semua Tier</option>
          <option value="basic">Basic</option>
          <option value="verified">Verified</option>
          <option value="partner">Partner</option>
          <option value="sponsor">Sponsor</option>
        </select>
        <div className="flex items-center text-xs text-slate-400 md:ml-auto">
          {loading ? '...' : `${filtered.length} dari ${cafes.length} kafe`}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop: full table. Mobile: stacked cards below (7 columns don't
            fit a phone — same fix as the members page). */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Nama Kafe</th>
                <th className="px-5 py-3 font-medium">Alamat</th>
                <th className="px-5 py-3 font-medium">Tier</th>
                <th className="px-5 py-3 font-medium">Partner</th>
                <th className="px-5 py-3 font-medium">Rating</th>
                <th className="px-5 py-3 font-medium">WiFi</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-full max-w-[120px]" /></td>
                  ))}
                </tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">Tidak ada kafe ditemukan.</td></tr>
              ) : pageItems.map(cafe => {
                const rating = Number(cafe.rating) || 0
                const wifi = cafe.wifi_speed_mbps != null ? Number(cafe.wifi_speed_mbps) : null
                const wifiUp = cafe.wifi_upload_mbps != null ? Number(cafe.wifi_upload_mbps) : null
                return (
                  <tr
                    key={cafe.id}
                    onClick={() => router.push(`/maps/cafes/${cafe.id}`)}
                    className="hover:bg-slate-50/50 cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{cafe.name}</div>
                      {cafe.website && (
                        <a
                          href={cafe.website} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-purple-500 hover:text-purple-400 mt-0.5"
                        >
                          <ExternalLink size={11} /> Website
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 max-w-[220px] truncate">{cafe.address}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold capitalize ${TIER_COLORS[cafe.tier] ?? TIER_COLORS.basic}`}>
                        {cafe.tier ?? 'basic'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {cafe.is_partner ? <CheckCircle size={16} className="text-emerald-500" /> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {rating > 0 ? (
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Star size={13} className="text-amber-400 fill-amber-400" /> {rating.toFixed(1)}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {wifi != null ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Wifi size={13} className="text-purple-500" /> {wifi}{wifiUp != null ? ` / ${wifiUp}` : ''} Mbps
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Link href={`/maps/cafes/${cafe.id}`} title="Edit" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                          <Edit2 size={15} />
                        </Link>
                        <button onClick={() => handleDelete(cafe)} title="Hapus" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
            </div>
          )) : filtered.length === 0 ? (
            <p className="px-5 py-16 text-center text-slate-400 text-sm">Tidak ada kafe ditemukan.</p>
          ) : pageItems.map(cafe => {
            const rating = Number(cafe.rating) || 0
            const wifi = cafe.wifi_speed_mbps != null ? Number(cafe.wifi_speed_mbps) : null
            const wifiUp = cafe.wifi_upload_mbps != null ? Number(cafe.wifi_upload_mbps) : null
            return (
              <div
                key={cafe.id}
                onClick={() => router.push(`/maps/cafes/${cafe.id}`)}
                className="p-4 flex flex-col gap-2 active:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{cafe.name}</p>
                    <p className="text-xs text-slate-500 truncate">{cafe.address}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-bold capitalize ${TIER_COLORS[cafe.tier] ?? TIER_COLORS.basic}`}>
                    {cafe.tier ?? 'basic'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  {cafe.is_partner && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle size={13} /> Partner</span>}
                  {rating > 0 && <span className="inline-flex items-center gap-1"><Star size={13} className="text-amber-400 fill-amber-400" /> {rating.toFixed(1)}</span>}
                  {wifi != null && <span className="inline-flex items-center gap-1"><Wifi size={13} className="text-purple-500" /> {wifi}{wifiUp != null ? ` / ${wifiUp}` : ''} Mbps</span>}
                  {cafe.website && (
                    <a href={cafe.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-purple-500 hover:text-purple-400">
                      <ExternalLink size={12} /> Website
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-1" onClick={e => e.stopPropagation()}>
                  <Link href={`/maps/cafes/${cafe.id}`} title="Edit" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                    <Edit2 size={15} />
                  </Link>
                  <button onClick={() => handleDelete(cafe)} title="Hapus" className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {!loading && <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} itemLabel="kafe" />}
      </div>
    </div>
  )
}
