'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { CafeFacilities, SpeedTest } from '@/types'
import {
  type CafeDbPayload, type CafeFormValues, type WeekHours,
  DAY_LABELS, PURWOKERTO_CENTER,
  suggestOpenHours, toDbPayload, validateForm,
} from './lib'
import SpeedTestPanel from './SpeedTestPanel'
import {
  Bike, BookOpen, Car, Clock, Gauge, Info, Loader2, MapPin,
  Save, Sparkles, Tag, Wifi, Wind, Zap,
} from 'lucide-react'

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-sm text-slate-400">
      Loading Map...
    </div>
  ),
})

// Label & ikon selaras dengan tampilan client (CafeModal facilityConfig).
const FACILITY_CONFIG: Array<{ key: keyof CafeFacilities; label: string; icon: React.ReactNode }> = [
  { key: 'wifi', label: 'WiFi Cepat', icon: <Wifi size={15} /> },
  { key: 'powerOutlets', label: 'Banyak Colokan', icon: <Zap size={15} /> },
  { key: 'ac', label: 'AC Sejuk', icon: <Wind size={15} /> },
  { key: 'mushola', label: 'Mushola', icon: <BookOpen size={15} /> },
  { key: 'motorParking', label: 'Parkir Motor', icon: <Bike size={15} /> },
  { key: 'carParking', label: 'Parkir Mobil', icon: <Car size={15} /> },
]

const PRICE_OPTIONS = [
  { value: 0, label: 'Belum ada info harga' },
  { value: 1, label: 'Rp 0 - 25.000' },
  { value: 2, label: 'Rp 25.000 - 50.000' },
  { value: 3, label: 'Rp 50.000 - 150.000' },
  { value: 4, label: 'Rp 150.000 - 300.000' },
]

const DEFAULT_WEEK = (): WeekHours => DAY_LABELS.map(() => ({ open: true, from: '09:00', to: '22:00' }))

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4 text-slate-800">
        <span className="text-purple-500">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

interface CafeFormProps {
  initial: CafeFormValues
  speedTests?: SpeedTest[]
  saving: boolean
  submitLabel: string
  onSubmit: (payload: CafeDbPayload) => void
}

export default function CafeForm({ initial, speedTests, saving, submitLabel, onSubmit }: CafeFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<CafeFormValues>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // open_hours mengikuti saran dari jadwal per-hari sampai diedit manual.
  const [openHoursTouched, setOpenHoursTouched] = useState(initial.open_hours.trim() !== '')
  const lastWeekRef = useRef<WeekHours>(initial.week ?? DEFAULT_WEEK())

  const set = (patch: Partial<CafeFormValues>) => setValues(v => ({ ...v, ...patch }))

  const setWeek = (week: WeekHours | null) => {
    if (week) lastWeekRef.current = week
    const patch: Partial<CafeFormValues> = { week }
    if (!openHoursTouched) patch.open_hours = suggestOpenHours(week)
    setValues(v => ({ ...v, ...patch }))
  }

  const setDay = (index: number, patch: Partial<WeekHours[number]>) => {
    if (!values.week) return
    setWeek(values.week.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit(toDbPayload(values))
  }

  const err = (key: string) =>
    errors[key] ? <p className="text-xs text-red-500 mt-1">{errors[key]}</p> : null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ── Informasi Dasar ── */}
        <SectionCard icon={<Info size={16} />} title="Informasi Dasar">
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nama Kafe *</label>
              <input value={values.name} onChange={e => set({ name: e.target.value })} className={inputCls} placeholder="Nama kafe" />
              {err('name')}
            </div>
            <div>
              <label className={labelCls}>Alamat *</label>
              <textarea value={values.address} onChange={e => set({ address: e.target.value })} rows={2} className={inputCls} placeholder="Alamat lengkap" />
              {err('address')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Telepon</label>
                <input value={values.phone} onChange={e => set({ phone: e.target.value })} className={inputCls} placeholder="08xx..." />
              </div>
              <div>
                <label className={labelCls}>Website / IG</label>
                <input value={values.website} onChange={e => set({ website: e.target.value })} className={inputCls} placeholder="https://..." />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Lokasi ── */}
        <SectionCard icon={<MapPin size={16} />} title="Lokasi">
          <div className="space-y-3">
            <MapPicker
              center={[values.lat ?? PURWOKERTO_CENTER[0], values.lng ?? PURWOKERTO_CENTER[1]]}
              onLocationChange={(lat, lng) => set({ lat, lng })}
            />
            <p className="text-xs text-slate-400">Klik atau geser pin di peta, atau isi koordinat manual.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Latitude *</label>
                <input
                  type="number" step="any" value={values.lat ?? ''}
                  onChange={e => set({ lat: e.target.value === '' ? null : Number(e.target.value) })}
                  className={inputCls} placeholder="-7.42..."
                />
              </div>
              <div>
                <label className={labelCls}>Longitude *</label>
                <input
                  type="number" step="any" value={values.lng ?? ''}
                  onChange={e => set({ lng: e.target.value === '' ? null : Number(e.target.value) })}
                  className={inputCls} placeholder="109.23..."
                />
              </div>
            </div>
            {err('latlng')}
          </div>
        </SectionCard>

        {/* ── Status & Harga ── */}
        <SectionCard icon={<Tag size={16} />} title="Status & Harga">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tier</label>
                <select
                  value={values.tier}
                  onChange={e => set({ tier: e.target.value as CafeFormValues['tier'] })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="basic">Basic</option>
                  <option value="verified">Verified</option>
                  <option value="partner">Partner</option>
                  <option value="sponsor">Sponsor</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Rentang Harga</label>
                <select
                  value={values.price_level}
                  onChange={e => set({ price_level: Number(e.target.value) })}
                  className={`${inputCls} bg-white`}
                >
                  {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Diskon Member (%)</label>
              <input
                type="number" min={0} max={100} value={values.discount_value ?? ''}
                onChange={e => set({ discount_value: e.target.value === '' ? null : Number(e.target.value) })}
                className={inputCls} placeholder="mis. 10"
              />
              {err('discount_value')}
            </div>
            <label className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox" checked={values.is_partner}
                onChange={e => set({ is_partner: e.target.checked })}
                className="w-4 h-4 accent-purple-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">Partner Semeja Kerja</p>
                <p className="text-xs text-slate-500">Tampil sebagai &quot;Mitra SK&quot; di peta publik</p>
              </div>
            </label>
          </div>
        </SectionCard>

        {/* ── Fasilitas & Suasana ── */}
        <SectionCard icon={<Sparkles size={16} />} title="Fasilitas & Suasana">
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Fasilitas WFC</label>
              <div className="flex flex-wrap gap-2">
                {FACILITY_CONFIG.map(f => {
                  const active = values.facilities[f.key]
                  return (
                    <button
                      key={f.key} type="button"
                      onClick={() => set({ facilities: { ...values.facilities, [f.key]: !active } })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        active
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300'
                      }`}
                    >
                      {f.icon} {f.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className={labelCls}>Tingkat Suasana (vibes)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Tenang</span>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n} type="button" onClick={() => set({ vibes: n })}
                      className={`w-9 h-9 text-sm font-medium transition ${
                        values.vibes === n ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400">Ramai</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Jam Operasional ── */}
        <SectionCard icon={<Clock size={16} />} title="Jam Operasional">
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox" checked={values.week !== null}
                onChange={e => setWeek(e.target.checked ? lastWeekRef.current : null)}
                className="w-4 h-4 accent-purple-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">Atur jam per hari</p>
                <p className="text-xs text-slate-500">Kalau mati, hanya ringkasan jam di bawah yang dipakai</p>
              </div>
            </label>

            {values.week && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => values.week && setWeek(values.week.map(() => ({ ...values.week![0] })))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-600 transition"
                  >
                    Samakan semua hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeek(DAY_LABELS.map(() => ({ open: true, from: '00:00', to: '23:59' })))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-600 transition"
                  >
                    24 Jam
                  </button>
                </div>
                <div className="space-y-1.5">
                  {values.week.map((day, i) => (
                    <div key={DAY_LABELS[i]} className="flex items-center gap-2">
                      <label className="flex items-center gap-2 w-24 cursor-pointer">
                        <input
                          type="checkbox" checked={day.open}
                          onChange={e => setDay(i, { open: e.target.checked })}
                          className="w-3.5 h-3.5 accent-purple-600"
                        />
                        <span className="text-sm text-slate-700">{DAY_LABELS[i]}</span>
                      </label>
                      {day.open ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time" value={day.from} onChange={e => setDay(i, { from: e.target.value })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                          <span className="text-slate-400 text-sm">–</span>
                          <input
                            type="time" value={day.to} onChange={e => setDay(i, { to: e.target.value })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Tutup</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>Ringkasan Jam</label>
              <div className="flex gap-2">
                <input
                  value={values.open_hours}
                  onChange={e => { setOpenHoursTouched(true); set({ open_hours: e.target.value }) }}
                  className={inputCls} placeholder='mis. "09:00 - 22:00" atau "24 Jam"'
                />
                {values.week && (
                  <button
                    type="button"
                    onClick={() => { setOpenHoursTouched(false); set({ open_hours: suggestOpenHours(values.week) }) }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-600 whitespace-nowrap transition"
                  >
                    Pakai saran
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Dipakai peta publik untuk filter &quot;Buka Malam&quot; dan sebagai fallback status buka.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── Internet & Speedtest ── */}
        <SectionCard icon={<Gauge size={16} />} title="Internet & Speedtest">
          <div className="space-y-4">
            <div>
              <label className={labelCls}>WiFi Speed (Mbps)</label>
              <input
                type="number" min={0} step="any" value={values.wifi_speed_mbps ?? ''}
                onChange={e => set({ wifi_speed_mbps: e.target.value === '' ? null : Number(e.target.value) })}
                className={inputCls} placeholder="mis. 35"
              />
              {err('wifi_speed_mbps')}
              <p className="text-xs text-slate-400 mt-1">
                Tampil di detail kafe publik (≥50 &quot;Super Cepat&quot;, ≥25 &quot;Stabil&quot;, di bawahnya &quot;Standar&quot;).
              </p>
            </div>
            {speedTests ? (
              <SpeedTestPanel
                tests={speedTests}
                onUseAverage={avg => set({ wifi_speed_mbps: avg })}
              />
            ) : (
              <p className="text-xs text-slate-400">
                Statistik speedtest komunitas akan tampil di sini setelah kafe dibuat.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Footer aksi ── */}
      <div className="sticky bottom-0 bg-slate-50/90 backdrop-blur-sm border-t border-slate-200 -mx-6 md:-mx-8 px-6 md:px-8 py-3 flex justify-end gap-3">
        <button
          type="button" onClick={() => router.push('/maps/cafes')}
          className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-sm transition"
        >
          Batal
        </button>
        <button
          type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition shadow-sm"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {submitLabel}
        </button>
      </div>
    </form>
  )
}
