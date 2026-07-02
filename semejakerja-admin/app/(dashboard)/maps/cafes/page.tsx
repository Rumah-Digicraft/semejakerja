'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cafe } from '@/types'
import { Search, Star, ExternalLink, Edit2, Loader2, CheckCircle, X, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-[250px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Loading Map...</div>
})

const TIER_COLORS: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-600',
  verified: 'bg-blue-100 text-blue-700',
  partner: 'bg-purple-100 text-purple-700',
  sponsor: 'bg-amber-100 text-amber-700',
}

const FACILITIES_LIST = [
  'WiFi', 'Stopkontak', 'AC', 'Area Smoking', 'Area Non-Smoking', 'Mushola', 'Toilet', 'Parkir Motor', 'Parkir Mobil', 'Meeting Room'
]

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

export default function DataKafePage() {
  const supabase = createClient()
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [filterPartner, setFilterPartner] = useState('all')
  
  // Slide-over state
  const [editCafe, setEditCafe] = useState<Cafe | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // Form states for complex objects
  const [facilities, setFacilities] = useState<string[]>([])
  const [hours, setHours] = useState<Record<string, { isOpen: boolean, time: string }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('cafes').select('*').order('name')
    if (filterTier !== 'all') q = q.eq('tier', filterTier)
    if (filterPartner === 'partner') q = q.eq('is_partner', true)
    if (filterPartner === 'non_partner') q = q.eq('is_partner', false)
    const { data } = await q
    setCafes(data ?? [])
    setLoading(false)
  }, [filterTier, filterPartner])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const openEditPanel = (cafe: Cafe) => {
    setEditCafe(cafe)
    
    let parsedFacs: string[] = []
    if (Array.isArray(cafe.facilities)) {
      parsedFacs = cafe.facilities
    } else if (typeof cafe.facilities === 'string') {
      try {
        const parsed = JSON.parse(cafe.facilities)
        if (Array.isArray(parsed)) parsedFacs = parsed
      } catch (e) {}
    }
    setFacilities(parsedFacs)
    
    // Parse weekday_text into Record for UI
    const hrs: Record<string, { isOpen: boolean, time: string }> = {}
    if (cafe.weekday_text && Array.isArray(cafe.weekday_text)) {
      cafe.weekday_text.forEach(text => {
        const [day, time] = text.split(':').map(s => s.trim())
        if (day && time) {
           hrs[day] = { 
             isOpen: time.toLowerCase() !== 'tutup', 
             time: time.toLowerCase() === 'tutup' ? '09:00 - 22:00' : time 
           }
        }
      })
    }
    // Initialize empty for missing days
    DAYS.forEach(d => { if (!hrs[d]) hrs[d] = { isOpen: true, time: '09:00 - 22:00' } })
    setHours(hrs)
  }

  const handleSave = async () => {
    if (!editCafe) return
    setSaving(true)

    const weekday_text = DAYS.map(d => `${d}: ${hours[d].isOpen ? hours[d].time : 'Tutup'}`)

    const { error } = await supabase.from('cafes').update({
      name: editCafe.name,
      address: editCafe.address,
      lat: editCafe.lat,
      lng: editCafe.lng,
      phone: editCafe.phone,
      website: editCafe.website,
      tier: editCafe.tier,
      is_partner: editCafe.is_partner,
      discount_value: editCafe.discount_value,
      price_level: editCafe.price_level,
      facilities: facilities,
      weekday_text: weekday_text,
    }).eq('id', editCafe.id)
    
    setSaving(false)
    if (error) { showToast('Gagal menyimpan: ' + error.message); return }
    showToast('Data kafe berhasil diperbarui!')
    setEditCafe(null)
    load()
  }

  const toggleFacility = (facility: string) => {
    setFacilities(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility) 
        : [...prev, facility]
    )
  }

  const filtered = cafes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">
          {toast}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Kafe</h1>
          <p className="text-slate-500 mt-1">Kelola direktori kafe & WFC Purwokerto</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama / alamat..."
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm w-full md:w-56 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua Tier</option>
            <option value="basic">Basic</option>
            <option value="verified">Verified</option>
            <option value="partner">Partner</option>
            <option value="sponsor">Sponsor</option>
          </select>
          <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">Semua</option>
            <option value="partner">Partner ✓</option>
            <option value="non_partner">Non-partner</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-medium">Nama Kafe</th>
                <th className="px-5 py-3.5 font-medium">Alamat</th>
                <th className="px-5 py-3.5 font-medium">Tier</th>
                <th className="px-5 py-3.5 font-medium">Partner</th>
                <th className="px-5 py-3.5 font-medium">Rating</th>
                <th className="px-5 py-3.5 font-medium">Diskon</th>
                <th className="px-5 py-3.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full max-w-[100px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Tidak ada kafe ditemukan.</td></tr>
              ) : filtered.map(cafe => (
                <tr key={cafe.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{cafe.name}</p>
                    {cafe.website && (
                      <a href={cafe.website} target="_blank" rel="noreferrer" className="text-xs text-purple-500 hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink size={10} /> Website
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 max-w-xs truncate">{cafe.address}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${TIER_COLORS[cafe.tier]}`}>
                      {cafe.tier}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {cafe.is_partner
                      ? <CheckCircle size={16} className="text-emerald-500" />
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star size={13} fill="currentColor" />
                      <span className="text-slate-700 text-xs">{cafe.rating?.toFixed(1) ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {cafe.discount_value ? `${cafe.discount_value}%` : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => openEditPanel(cafe)}
                      className="p-2 rounded-lg hover:bg-purple-50 hover:text-purple-600 text-slate-400 transition"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Panel */}
      {editCafe && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setEditCafe(null)} />
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[800px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={20} className="text-purple-600" /> Edit Kafe
              </h2>
              <button onClick={() => setEditCafe(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* KIRI: Info Dasar & Map */}
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Informasi Dasar</h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kafe</label>
                      <input type="text" value={editCafe.name} onChange={e => setEditCafe({ ...editCafe, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">No. Telepon</label>
                      <input type="text" value={editCafe.phone ?? ''} onChange={e => setEditCafe({ ...editCafe, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Website / IG</label>
                      <input type="text" value={editCafe.website ?? ''} onChange={e => setEditCafe({ ...editCafe, website: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Lokasi & Peta</h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                      <textarea rows={2} value={editCafe.address} onChange={e => setEditCafe({ ...editCafe, address: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Pin Lokasi</label>
                      <MapPicker 
                        center={[editCafe.lat || -7.424, editCafe.lng || 109.230]} 
                        onLocationChange={(lat, lng) => setEditCafe({ ...editCafe, lat, lng })}
                      />
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <input type="number" step="any" value={editCafe.lat} onChange={e => setEditCafe({ ...editCafe, lat: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none" placeholder="Latitude" />
                        <input type="number" step="any" value={editCafe.lng} onChange={e => setEditCafe({ ...editCafe, lng: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none" placeholder="Longitude" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KANAN: Detail & Jam Operasional */}
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Status & Harga</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tier</label>
                        <select value={editCafe.tier} onChange={e => setEditCafe({ ...editCafe, tier: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white">
                          <option value="basic">Basic</option>
                          <option value="verified">Verified</option>
                          <option value="partner">Partner</option>
                          <option value="sponsor">Sponsor</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rentang Harga</label>
                        <select value={editCafe.price_level ?? 0} onChange={e => setEditCafe({ ...editCafe, price_level: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white">
                          <option value="0">Pilih Harga</option>
                          <option value="1">Rp 0 - Rp 25.000</option>
                          <option value="2">Rp 25.000 - Rp 50.000</option>
                          <option value="3">Rp 50.000 - Rp 150.000</option>
                          <option value="4">Rp 150.000 - Rp 300.000</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Diskon (%)</label>
                        <input type="number" min={0} max={100} value={editCafe.discount_value ?? ''} onChange={e => setEditCafe({ ...editCafe, discount_value: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none" />
                      </div>
                    </div>
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition">
                      <input type="checkbox" checked={editCafe.is_partner} onChange={e => setEditCafe({ ...editCafe, is_partner: e.target.checked })} className="w-5 h-5 accent-emerald-500 rounded" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Partner Semeja Kerja</p>
                        <p className="text-xs text-slate-500">Berikan akses diskon membership</p>
                      </div>
                    </label>
                  </div>

                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Jam Operasional</h3>
                    <div className="space-y-3">
                      {DAYS.map(day => (
                        <div key={day} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-600 w-16">{day}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={hours[day]?.isOpen ?? true}
                              onChange={e => setHours({...hours, [day]: { ...hours[day], isOpen: e.target.checked }})}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                          <input 
                            type="text" 
                            value={hours[day]?.time ?? ''} 
                            disabled={!hours[day]?.isOpen}
                            onChange={e => setHours({...hours, [day]: { ...hours[day], time: e.target.value }})}
                            placeholder="09:00 - 22:00"
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-slate-50 disabled:text-slate-400" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Fasilitas WFC</h3>
                    <div className="flex flex-wrap gap-2">
                      {FACILITIES_LIST.map(fac => {
                        const active = facilities.includes(fac)
                        return (
                          <button
                            key={fac}
                            onClick={() => toggleFacility(fac)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                              active ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {fac}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button onClick={() => setEditCafe(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-purple-200 transition"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
