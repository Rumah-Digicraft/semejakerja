import { useState, useRef, type ReactNode } from 'react';
import {
  X, CheckCircle2, Star, Upload, Loader2, MapPin, Search, ExternalLink,
  Wifi, Wind, BookOpen, Presentation, Trees, UtensilsCrossed, Maximize, Bike, Car, Zap,
} from 'lucide-react';
import {
  useSubmitNewCafe,
  useSubmitEdit,
  useSubmitReview,
  useSubmitPhoto,
  useResolveMapsLink,
} from '../../hooks/useContribute';
import type { CafeEditSuggestedData, CafeFacility, CafeScale } from '../../types/cafe';
import { searchAddress, type GeocodeResult } from '../../lib/geocode';
import PhotoCropModal from './PhotoCropModal';
import LocationPicker from './LocationPicker';
import {
  DAY_LABELS, type WeekHours, defaultWeekHours, serializeWeekdayText, suggestOpenHours,
} from '../../lib/openHoursEditor';

const PURWOKERTO_CENTER: [number, number] = [-7.424, 109.23];

const PRICE_OPTIONS = [
  { value: 0, label: 'Belum ada info harga' },
  { value: 1, label: 'Rp 0 - 25.000' },
  { value: 2, label: 'Rp 25.000 - 50.000' },
  { value: 3, label: 'Rp 50.000 - 150.000' },
  { value: 4, label: 'Rp 150.000 - 300.000' },
];

const VIBE_LEVELS = [
  { value: 1, label: 'Tenang' },
  { value: 2, label: 'Sedang' },
  { value: 3, label: 'Ramai' },
];

// Sama persis dengan FACILITY_CONFIG/SCALE_CONFIG di
// semejakerja-admin/app/(dashboard)/maps/cafes/CafeForm.tsx — 6 fasilitas
// yang ditoggle langsung; motorParking/carParking/powerOutlets diturunkan
// dari scales (bukan chip terpisah), lihat deriveFacilities() di bawah.
const DEFAULT_FACILITIES: CafeFacility = {
  wifi: false, ac: false, powerOutlets: false, mushola: false, motorParking: false, carParking: false,
  meetingRoom: false, outdoor: false, heavyMeal: false,
};
const DEFAULT_SCALES: CafeScale = { area: 0, motorParking: 0, carParking: 0, outlets: 0 };

const FACILITY_CONFIG: Array<{ key: keyof CafeFacility; label: string; icon: ReactNode }> = [
  { key: 'wifi', label: 'WiFi Cepat', icon: <Wifi size={15} /> },
  { key: 'ac', label: 'AC Sejuk', icon: <Wind size={15} /> },
  { key: 'mushola', label: 'Mushola', icon: <BookOpen size={15} /> },
  { key: 'meetingRoom', label: 'Ruang Meeting', icon: <Presentation size={15} /> },
  { key: 'outdoor', label: 'Area Outdoor', icon: <Trees size={15} /> },
  { key: 'heavyMeal', label: 'Makanan Berat', icon: <UtensilsCrossed size={15} /> },
];

const SCALE_CONFIG: Array<{ key: keyof CafeScale; label: string; icon: ReactNode; levels: [string, string, string, string] }> = [
  { key: 'area', label: 'Luas Area', icon: <Maximize size={15} />, levels: ['Belum ada info', 'Kecil', 'Sedang', 'Luas'] },
  { key: 'motorParking', label: 'Parkir Motor', icon: <Bike size={15} />, levels: ['Tidak ada', 'Sempit', 'Sedang', 'Luas'] },
  { key: 'carParking', label: 'Parkir Mobil', icon: <Car size={15} />, levels: ['Tidak ada', 'Sempit', 'Sedang', 'Luas'] },
  { key: 'outlets', label: 'Colokan', icon: <Zap size={15} />, levels: ['Tidak ada', 'Sedikit', 'Sedang', 'Banyak (tiap meja)'] },
];

// Parkir motor/mobil & colokan sumber kebenarannya skala, bukan chip
// terpisah — sama persis derivasi toDbPayload() di admin lib.ts.
function deriveFacilities(facilities: CafeFacility, scales: CafeScale): CafeFacility {
  return {
    ...facilities,
    motorParking: scales.motorParking > 0,
    carParking: scales.carParking > 0,
    powerOutlets: scales.outlets > 0,
  };
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // samain dengan limit bucket cafe-photos (lihat admin PhotoManager)

export type ContributeType = 'new-cafe' | 'edit' | 'review' | 'photo';

interface ContributeModalProps {
  type: ContributeType;
  cafeId?: string;
  cafeName?: string;
  // Current values for pre-filling edit form
  currentValues?: CafeEditSuggestedData & { open_hours?: string; phone?: string; website?: string; name?: string; address?: string };
  onClose: () => void;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

// text-base (16px), bukan text-sm — di bawah 16px, Safari iOS auto-zoom
// saat input di-fokus (memaksa user zoom out manual).
const inputCls = [
  'w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-base text-gray-900',
  'placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/10',
  'focus:border-purple-500 transition-all duration-200 shadow-sm',
].join(' ');

function Label({ text, hint, optional }: { text: string; hint?: string; optional?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {text}
      {optional && <span className="ml-1.5 text-xs font-normal text-gray-400">(opsional)</span>}
      {hint && <span className="ml-1.5 text-xs font-normal text-gray-400">({hint})</span>}
    </label>
  );
}

// ── Step 1: Form per tipe ─────────────────────────────────────────────────────

export interface NewCafeFormOutput {
  name: string;
  address: string;
  lat: number;
  lng: number;
  maps_url: string;
  phone: string;
  website: string;
  open_hours: string;
  weekday_text: string[];
  price_level: number;
  vibes: number;
  rating: number;
  total_reviews: number;
  facilities: CafeFacility;
  scales: CafeScale;
  notes: string;
}

function NewCafeForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (d: NewCafeFormOutput) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: '', address: '', phone: '', website: '', notes: '',
    mapsUrl: '', rating: '', totalReviews: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [priceLevel, setPriceLevel] = useState(0);
  const [vibes, setVibes] = useState(2);
  const [facilities, setFacilities] = useState<CafeFacility>(DEFAULT_FACILITIES);
  const [scales, setScales] = useState<CafeScale>(DEFAULT_SCALES);
  const [week, setWeek] = useState<WeekHours>(defaultWeekHours());
  const [openHours, setOpenHours] = useState(suggestOpenHours(defaultWeekHours()));
  const [openHoursTouched, setOpenHoursTouched] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  // Opsi Google Maps + paste-link disembunyikan sampai memang dibutuhkan
  // (pencarian otomatis gagal, atau user memang sudah punya link) — biar
  // nggak numpuk 4 kontrol sekaligus di layar buat kasus umum yang biasanya
  // langsung ketemu dari pencarian otomatis.
  const [showLinkFallback, setShowLinkFallback] = useState(false);

  const { mutate: resolveLink, isPending: resolving } = useResolveMapsLink();

  const applyWeek = (nextWeek: WeekHours) => {
    setWeek(nextWeek);
    if (!openHoursTouched) setOpenHours(suggestOpenHours(nextWeek));
  };
  const setDay = (index: number, patch: Partial<WeekHours[number]>) => {
    applyWeek(week.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const handleResolveLink = () => {
    if (!form.mapsUrl.trim()) return;
    setLocationError(null);
    resolveLink(form.mapsUrl.trim(), {
      onSuccess: (loc) => {
        setLat(loc.lat);
        setLng(loc.lng);
        if (loc.name && !form.name.trim()) set('name', loc.name);
      },
      onError: (err) => {
        setLocationError(err instanceof Error ? err.message : 'Gagal membaca link, geser pin manual di bawah ya');
      },
    });
  };

  // Alternatif gratis buat "Link Google Maps" — geocoding pakai OpenStreetMap
  // Nominatim (tanpa API key) dari Nama Cafe + Alamat yang sudah diisi.
  // Ada karena link share Google Maps dari app HP sering nggak bisa dibaca
  // koordinatnya (lihat komen di resolve-maps-link edge function), jadi user
  // nggak harus bolak-balik ke Google Maps buat dapetin link yang "benar".
  const handleSearchAddress = async () => {
    if (!form.name.trim() && !form.address.trim()) return;
    setAddressSearchError(null);
    setAddressSearching(true);
    try {
      const results = await searchAddress(form.name, form.address);
      setAddressResults(results);
      if (results.length === 0) {
        setAddressSearchError('Lokasi tidak ketemu otomatis.');
        setShowLinkFallback(true);
      }
    } catch {
      setAddressSearchError('Gagal mencari lokasi, coba lagi.');
    } finally {
      setAddressSearching(false);
    }
  };

  const handlePickAddressResult = (r: GeocodeResult) => {
    setLat(r.lat);
    setLng(r.lng);
    setAddressResults([]);
  };

  // Nominatim (di atas) sering nggak nemu bisnis kecil/jalan yang belum ditag
  // di OSM. Google punya data yang jauh lebih lengkap — buka tab baru ke URL
  // pencarian resmi Google Maps (bukan scraping, ini skema URL yang memang
  // didokumentasikan Google buat deep-link), user tinggal cek pin-nya lalu
  // copy link dari address bar & tempel di kolom "Link Google Maps" di bawah.
  const handleOpenGoogleMapsSearch = () => {
    const query = [form.name, form.address].filter((s) => s.trim()).join(', ').trim();
    if (!query) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!form.name.trim() || !form.address.trim()) return;
    if (lat == null || lng == null) return;
    onSubmit({
      name: form.name.trim(),
      address: form.address.trim(),
      lat, lng,
      maps_url: form.mapsUrl.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
      open_hours: openHours,
      weekday_text: serializeWeekdayText(week),
      price_level: priceLevel,
      vibes,
      rating: form.rating ? Number(form.rating) : 0,
      total_reviews: form.totalReviews ? Number(form.totalReviews) : 0,
      facilities: deriveFacilities(facilities, scales),
      scales,
      notes: form.notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label text="Nama Cafe" />
        <input required className={inputCls} placeholder="Contoh: Kopi Kenangan Purwokerto" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div>
        <Label text="Alamat Lengkap" />
        <textarea required className={`${inputCls} resize-none min-h-[72px]`} placeholder="Jl. Jendral Sudirman No. 1, Purwokerto..." value={form.address} onChange={(e) => set('address', e.target.value)} />
      </div>

      {/* ── Lokasi ── */}
      <div>
        <Label text="Titik Lokasi di Peta" />

        <button
          type="button"
          onClick={handleSearchAddress}
          disabled={addressSearching || (!form.name.trim() && !form.address.trim())}
          className="w-full px-4 py-2.5 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {addressSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Cari Lokasi Otomatis
        </button>
        {addressSearchError && <p className="text-xs text-amber-600 mt-1.5">{addressSearchError}</p>}
        {addressResults.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {addressResults.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePickAddressResult(r)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
                <span className="line-clamp-2">{r.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Fallback (link Google Maps) — disembunyikan sampai pencarian
            otomatis gagal, atau user klik toggle-nya sendiri kalau memang
            sudah pegang link. Menghindari numpuk 4 kontrol lokasi sekaligus
            buat kasus umum yang biasanya langsung ketemu di atas. */}
        {!showLinkFallback ? (
          <button
            type="button"
            onClick={() => setShowLinkFallback(true)}
            className="text-xs font-semibold text-purple-600 hover:underline mt-2"
          >
            Nggak ketemu? Pakai link Google Maps →
          </button>
        ) : (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            <p className="text-xs text-gray-500">
              Klik{' '}
              <button
                type="button"
                onClick={handleOpenGoogleMapsSearch}
                disabled={!form.name.trim() && !form.address.trim()}
                className="font-semibold text-purple-600 hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-0.5"
              >
                buka Google Maps <ExternalLink className="w-3 h-3" />
              </button>
              , cari & pastikan pin-nya di tempat yang benar, lalu copy link dari address bar dan tempel di sini:
            </p>
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="https://maps.app.goo.gl/..."
                value={form.mapsUrl}
                onChange={(e) => set('mapsUrl', e.target.value)}
              />
              <button
                type="button"
                onClick={handleResolveLink}
                disabled={resolving || !form.mapsUrl.trim()}
                className="shrink-0 px-4 py-2.5 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Pakai Link Ini
              </button>
            </div>
            {locationError && <p className="text-xs text-amber-600">{locationError}</p>}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          {lat != null && lng != null ? 'Geser pin di peta kalau kurang pas.' : 'Atau langsung klik/geser pin di peta di bawah ini.'}
        </p>
        <div className="mt-2">
          <LocationPicker
            center={lat != null && lng != null ? [lat, lng] : PURWOKERTO_CENTER}
            onLocationChange={(nlat, nlng) => { setLat(nlat); setLng(nlng); }}
          />
        </div>
        {submitAttempted && (lat == null || lng == null) && (
          <p className="text-xs text-red-500 mt-1.5">Tentukan lokasi cafe di peta dulu</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label text="Telepon" optional />
          <input className={inputCls} placeholder="08xx..." value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <Label text="Rentang Harga" optional />
          <select
            className={`${inputCls} bg-white`}
            value={priceLevel}
            onChange={(e) => setPriceLevel(Number(e.target.value))}
          >
            {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Review Google Maps ── */}
      <div>
        <Label text="Review Google Maps" optional hint="salin dari halaman Google Maps cafe ini" />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number" min={0} max={5} step="0.1"
            className={inputCls} placeholder="Rating, mis. 4.8"
            value={form.rating} onChange={(e) => set('rating', e.target.value)}
          />
          <input
            type="number" min={0} step={1}
            className={inputCls} placeholder="Jumlah review, mis. 834"
            value={form.totalReviews} onChange={(e) => set('totalReviews', e.target.value)}
          />
        </div>
      </div>

      {/* ── Fasilitas & Suasana ── */}
      <div className="space-y-4 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4">
        <div>
          <Label text="Fasilitas WFC" optional />
          <div className="flex flex-wrap gap-2">
            {FACILITY_CONFIG.map((f) => {
              const active = facilities[f.key];
              return (
                <button
                  key={f.key} type="button"
                  onClick={() => setFacilities((p) => ({ ...p, [f.key]: !active }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    active ? 'bg-purple-600 border-purple-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'
                  }`}
                >
                  {f.icon} {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label text="Tingkat Suasana (vibes)" optional />
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            {VIBE_LEVELS.map(({ value, label }) => (
              <button
                key={value} type="button" onClick={() => setVibes(value)}
                className={`flex-1 py-2 text-sm font-medium transition border-l first:border-l-0 border-gray-200 ${
                  vibes === value ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {SCALE_CONFIG.map((s) => {
            const level = scales[s.key];
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <span className="text-purple-500">{s.icon}</span> {s.label}
                  </span>
                  <span className="text-xs text-gray-400">{s.levels[level]}</span>
                </div>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
                  {s.levels.map((_lvl, n) => (
                    <button
                      key={n} type="button"
                      onClick={() => setScales((p) => ({ ...p, [s.key]: n }))}
                      className={`flex-1 h-9 text-xs font-medium transition border-l first:border-l-0 border-gray-200 ${
                        level === n ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {n === 0 ? '–' : n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Jam Operasional ── */}
      <div>
        <Label text="Jam Operasional" optional />
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => applyWeek(week.map(() => ({ ...week[0] })))}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 transition"
          >
            Samakan semua hari
          </button>
          <button
            type="button"
            onClick={() => applyWeek(DAY_LABELS.map(() => ({ open: true, from: '00:00', to: '23:59' })))}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 transition"
          >
            24 Jam
          </button>
        </div>
        <div className="space-y-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
          {week.map((day, i) => (
            <div key={DAY_LABELS[i]} className="flex items-center gap-2">
              <label className="flex items-center gap-2 w-24 cursor-pointer shrink-0">
                <input
                  type="checkbox" checked={day.open}
                  onChange={(e) => setDay(i, { open: e.target.checked })}
                  className="w-3.5 h-3.5 accent-purple-600"
                />
                <span className="text-sm text-gray-700">{DAY_LABELS[i]}</span>
              </label>
              {day.open ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="time" value={day.from} onChange={(e) => setDay(i, { from: e.target.value })}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="time" value={day.to} onChange={(e) => setDay(i, { to: e.target.value })}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Tutup</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            value={openHours}
            onChange={(e) => { setOpenHoursTouched(true); setOpenHours(e.target.value); }}
            className={inputCls} placeholder='Ringkasan jam, mis. "09:00 - 22:00"'
          />
          <button
            type="button"
            onClick={() => { setOpenHoursTouched(false); setOpenHours(suggestOpenHours(week)); }}
            className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs text-gray-600 transition"
          >
            Pakai saran
          </button>
        </div>
      </div>

      <div>
        <Label text="Website / Instagram" optional />
        <input className={inputCls} placeholder="https://..." value={form.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      <div>
        <Label text="Catatan Tambahan" optional />
        <textarea className={`${inputCls} resize-none min-h-[60px]`} placeholder="Info lain yang penting diketahui..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <button type="submit" disabled={isLoading} className="w-full py-3 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm disabled:opacity-60">
        {isLoading ? 'Mengirim...' : 'Kirim Usulan'}
      </button>
    </form>
  );
}

function EditForm({
  currentValues,
  onSubmit,
  isLoading,
}: {
  currentValues?: CafeEditSuggestedData;
  onSubmit: (d: CafeEditSuggestedData) => void;
  isLoading: boolean;
}) {
  // Start empty — user hanya isi field yang ingin dikoreksi
  const [form, setForm] = useState<CafeEditSuggestedData>({
    name: '', address: '', phone: '', website: '', open_hours: '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Kirim semua field yang diisi (tidak kosong)
    const payload: CafeEditSuggestedData = {};
    for (const [k, v] of Object.entries(form)) {
      if (v && v.trim()) payload[k] = v.trim();
    }
    if (Object.keys(payload).length === 0) return;
    onSubmit({ ...payload, _notes: notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
        Isi hanya field yang ingin kamu koreksi. Field yang dikosongkan tidak akan dikirim.
      </p>

      {/* Tampilkan nilai saat ini sebagai referensi */}
      {currentValues && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Data saat ini (referensi)</p>
          {currentValues.name && <p className="text-xs text-gray-500"><span className="font-medium">Nama:</span> {currentValues.name}</p>}
          {currentValues.phone && <p className="text-xs text-gray-500"><span className="font-medium">Telepon:</span> {currentValues.phone}</p>}
          {currentValues.open_hours && <p className="text-xs text-gray-500"><span className="font-medium">Jam Buka:</span> {currentValues.open_hours}</p>}
          {currentValues.website && <p className="text-xs text-gray-500"><span className="font-medium">Website:</span> {currentValues.website}</p>}
        </div>
      )}

      <div>
        <Label text="Nama Cafe" optional />
        <input className={inputCls} placeholder="Tulis nama yang benar..." value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div>
        <Label text="Alamat" optional />
        <textarea className={`${inputCls} resize-none min-h-[60px]`} placeholder="Tulis alamat yang benar..." value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label text="Telepon" optional />
          <input className={inputCls} placeholder="08xx..." value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <Label text="Jam Buka" optional />
          <input className={inputCls} placeholder="08:00 - 22:00" value={form.open_hours ?? ''} onChange={(e) => set('open_hours', e.target.value)} />
        </div>
      </div>
      <div>
        <Label text="Website / Instagram" optional />
        <input className={inputCls} placeholder="https://..." value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} />
      </div>
      <div>
        <Label text="Alasan Perubahan" optional />
        <textarea className={`${inputCls} resize-none min-h-[60px]`} placeholder="Kenapa info ini perlu diubah?" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button type="submit" disabled={isLoading} className="w-full py-3 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm disabled:opacity-60">
        {isLoading ? 'Mengirim...' : 'Kirim Saran'}
      </button>
    </form>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
        >
          <Star
            className={`w-7 h-7 transition-colors ${s <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ onSubmit, isLoading, errorMessage }: { onSubmit: (d: Record<string, unknown>) => void; isLoading: boolean; errorMessage?: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wifiSpeed, setWifiSpeed] = useState('');
  const [vibes, setVibes] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    onSubmit({ rating, comment, wifiSpeed: wifiSpeed ? parseInt(wifiSpeed) : undefined, vibes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label text="Rating Keseluruhan" />
        <StarPicker value={rating} onChange={setRating} />
        {rating === 0 && <p className="text-xs text-red-500 mt-1">Pilih rating dulu</p>}
      </div>
      <div>
        <Label text="Cerita Pengalamanmu" optional />
        <textarea
          className={`${inputCls} resize-none min-h-[80px]`}
          placeholder="Gimana WiFi-nya? Colokannya banyak? Tempatnya nyaman buat kerja?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label text="Kecepatan WiFi" optional hint="Mbps" />
          <input
            type="number"
            min="0"
            className={inputCls}
            placeholder="mis. 20"
            value={wifiSpeed}
            onChange={(e) => setWifiSpeed(e.target.value)}
          />
        </div>
        <div>
          <Label text="Suasana" hint="1=tenang, 5=ramai" />
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVibes(v)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${vibes === v ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-500 hover:border-purple-300'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
      {errorMessage && <p className="text-xs text-red-500 -mt-1">{errorMessage}</p>}
      <button type="submit" disabled={isLoading || rating === 0} className="w-full py-3 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm disabled:opacity-60">
        {isLoading ? 'Mengirim...' : 'Kirim Ulasan'}
      </button>
    </form>
  );
}

// Sama seperti admin PhotoManager.tsx: pilih beberapa file sekaligus, tiap
// file lewat crop 3:4 satu-satu, langsung upload begitu di-crop (tidak ada
// tombol "kirim" terpisah). Identitas TIDAK dikirim dari sini — trigger DB
// yang mengisinya dari akun login (lihat useContribute.ts).
function PhotoForm({ cafeId, onDone }: { cafeId: string; onDone: () => void }) {
  const { mutateAsync: uploadPhoto } = useSubmitPhoto();
  const [caption, setCaption] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const successCountRef = useRef(0);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { rejected.push(`${file.name} dilewati — bukan file gambar`); continue; }
      if (file.size > MAX_PHOTO_BYTES) { rejected.push(`${file.name} dilewati — ukuran lebih dari 10MB`); continue; }
      valid.push(file);
    }
    if (inputRef.current) inputRef.current.value = '';
    setErrors(rejected);
    if (valid.length === 0) return;
    successCountRef.current = 0;
    setQueueTotal(valid.length);
    setPendingFiles(valid);
    setUploading(true);
  };

  const advanceQueue = () => {
    setPendingFiles(prev => {
      const next = prev.slice(1);
      if (next.length === 0) {
        setUploading(false);
        if (successCountRef.current > 0) onDone();
      }
      return next;
    });
  };

  const handleCropConfirm = async (blob: Blob) => {
    try {
      await uploadPhoto({ cafeId, file: blob, caption });
      successCountRef.current += 1;
    } catch (err) {
      setErrors(prev => [...prev, err instanceof Error ? err.message : 'Gagal upload foto']);
    }
    advanceQueue();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label text="Foto" hint="bisa pilih lebih dari 1 sekaligus" />
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-2" />
              <p className="text-sm text-gray-400">Mengunggah {queueTotal - pendingFiles.length + 1} dari {queueTotal}...</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Klik untuk pilih foto</p>
              <p className="text-xs text-gray-300 mt-1">JPG, PNG, WebP — maks. 10MB per foto</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <div>
        <Label text="Keterangan Foto" optional hint="dipakai untuk semua foto yang dipilih" />
        <input
          className={inputCls}
          placeholder="mis. Area colokan yang banyak"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={uploading}
        />
      </div>
      {errors.length > 0 && (
        <div className="space-y-0.5">
          {errors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
        </div>
      )}

      {pendingFiles.length > 0 && (
        <PhotoCropModal
          key={pendingFiles.length}
          file={pendingFiles[0]}
          position={queueTotal - pendingFiles.length + 1}
          total={queueTotal}
          onConfirm={handleCropConfirm}
          onSkip={advanceQueue}
        />
      )}
    </div>
  );
}

// ── Step 2: Success ───────────────────────────────────────────────────────────

function SuccessScreen({ type, onClose }: { type: ContributeType; onClose: () => void }) {
  const messages: Record<ContributeType, { title: string; desc: string }> = {
    'new-cafe': { title: 'Usulan Terkirim!', desc: 'Cafe yang kamu usulkan akan ditinjau oleh tim Semeja Kerja sebelum ditampilkan di peta.' },
    'edit': { title: 'Saran Terkirim!', desc: 'Koreksi info Cafe-mu sudah diterima dan akan ditinjau oleh tim.' },
    'review': { title: 'Ulasan Terkirim!', desc: 'Terima kasih sudah berbagi pengalaman! Ulasanmu akan segera diverifikasi.' },
    'photo': { title: 'Foto Terupload!', desc: 'Foto Cafe-mu sudah diterima dan akan ditinjau oleh tim sebelum dipublikasikan.' },
  };
  const { title, desc } = messages[type];

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-xs">{desc}</p>
      </div>
      <button
        onClick={onClose}
        className="mt-2 px-8 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all"
      >
        Tutup
      </button>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const TITLES: Record<ContributeType, string> = {
  'new-cafe': 'Usulkan Cafe Baru',
  'edit': 'Saran Perbaikan Info',
  'review': 'Tulis Ulasan',
  'photo': 'Upload Foto',
};

type Step = 'form' | 'success';

// Semua jenis kontribusi (usulkan cafe baru, koreksi info, ulasan, upload
// foto) langsung ke step form — nama & WA submitter diambil dari akun yang
// login server-side (migration 041/046), tidak ada step identitas manual.
export function ContributeModal({ type, cafeId, cafeName, currentValues, onClose }: ContributeModalProps) {
  const [step, setStep] = useState<Step>('form');

  const { mutate: submitNew, isPending: pendingNew } = useSubmitNewCafe();
  const { mutate: submitEdit, isPending: pendingEdit } = useSubmitEdit();
  const { mutate: submitReview, isPending: pendingReview, error: reviewError } = useSubmitReview();

  const isLoading = pendingNew || pendingEdit || pendingReview;

  const handleNewCafe = (d: NewCafeFormOutput) => {
    submitNew(
      {
        cafeName: d.name,
        address: d.address,
        lat: d.lat,
        lng: d.lng,
        maps_url: d.maps_url,
        phone: d.phone,
        website: d.website,
        open_hours: d.open_hours,
        weekday_text: d.weekday_text,
        price_level: d.price_level,
        vibes: d.vibes,
        rating: d.rating,
        total_reviews: d.total_reviews,
        facilities: d.facilities,
        scales: d.scales,
        notes: d.notes,
      },
      { onSuccess: () => setStep('success') },
    );
  };

  const handleEdit = (d: CafeEditSuggestedData) => {
    if (!cafeId) return;
    const { _notes, ...suggestedData } = d;
    submitEdit(
      { cafeId, suggestedData, notes: _notes },
      { onSuccess: () => setStep('success') },
    );
  };

  const handleReview = (d: Record<string, unknown>) => {
    if (!cafeId) return;
    submitReview(
      {
        cafeId,
        rating: d.rating as number,
        comment: d.comment as string,
        wifiSpeed: d.wifiSpeed as number,
        vibes: d.vibes as number,
      },
      { onSuccess: () => setStep('success') },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{TITLES[type]}</h2>
            {cafeName && <p className="text-xs text-gray-400 mt-0.5">{cafeName}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'form' && type === 'new-cafe' && (
            <NewCafeForm onSubmit={handleNewCafe} isLoading={isLoading} />
          )}
          {step === 'form' && type === 'edit' && (
            <EditForm currentValues={currentValues} onSubmit={handleEdit} isLoading={isLoading} />
          )}
          {step === 'form' && type === 'review' && (
            <ReviewForm onSubmit={handleReview} isLoading={isLoading} errorMessage={reviewError?.message} />
          )}
          {step === 'form' && type === 'photo' && cafeId && (
            <PhotoForm cafeId={cafeId} onDone={() => setStep('success')} />
          )}
          {step === 'success' && (
            <SuccessScreen type={type} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
