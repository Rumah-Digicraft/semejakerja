import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, Pencil, Trash2, X,
  ChevronLeft, ChevronRight, Star, Clock,
  Phone, Globe, MapPin, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { CafeRow, CafeTier } from '../../types/cafe';

// ── Tier system ────────────────────────────────────────────────────────────────

const TIER_META: Record<CafeTier, { label: string; bg: string; color: string }> = {
  basic:    { label: 'Reguler',       bg: '#F1EFE8', color: '#444441' },
  verified: { label: 'Terverifikasi', bg: '#EEEDFE', color: '#3C3489' },
  partner:  { label: 'Mitra',         bg: '#E1F5EE', color: '#085041' },
  sponsor:  { label: 'Sponsor',       bg: '#FAEEDA', color: '#633806' },
};

const TIER_ORDER: CafeTier[] = ['basic', 'verified', 'partner', 'sponsor'];

const VALID_TIERS = new Set<string>(TIER_ORDER);

function getCafeRowTier(cafe: CafeRow): CafeTier {
  if (cafe.tier && VALID_TIERS.has(cafe.tier)) return cafe.tier as CafeTier;
  return cafe.is_partner ? 'partner' : 'basic';
}

// ── Constants ──────────────────────────────────────────────────────────────────

type EditableCafe = Pick<
  CafeRow,
  | 'name' | 'address' | 'lat' | 'lng'
  | 'phone' | 'website' | 'open_hours'
  | 'price_level' | 'is_partner' | 'discount_value'
  | 'top_review'
>;

const EMPTY: EditableCafe = {
  name: '', address: '', lat: -7.42, lng: 109.24,
  phone: null, website: null, open_hours: null,
  price_level: 0, is_partner: false, discount_value: 0, top_review: null,
};

const PRICE_LABELS: Record<number, string> = {
  0: 'Tidak diketahui',
  1: '< Rp 30.000',
  2: 'Rp 30.000 – 60.000',
};

const PAGE_SIZE = 12;

// ── Shared primitives ──────────────────────────────────────────────────────────

const inputCls = [
  'w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900',
  'placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/10',
  'focus:border-purple-500 transition-all duration-200 shadow-sm',
].join(' ');

function Label({ text, required, hint }: { text: string; required?: boolean; hint?: string }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {text}
      {required && <span className="text-purple-500 ml-1">*</span>}
      {hint && <span className="ml-1.5 text-xs font-normal text-gray-400">({hint})</span>}
    </label>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
        on ? 'bg-purple-600' : 'bg-gray-200',
      ].join(' ')}
      aria-checked={on}
      role="switch"
    >
      <span className={[
        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
        on ? 'translate-x-5' : 'translate-x-0',
      ].join(' ')} />
    </button>
  );
}

function TierBadge({
  cafeId,
  currentTier,
  onTierChange,
}: {
  cafeId: string;
  currentTier: CafeTier;
  onTierChange: (cafeId: string, newTier: CafeTier) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(true);
  };

  const select = async (tier: CafeTier) => {
    setOpen(false);
    if (tier === currentTier) return;
    setSaving(true);
    await onTierChange(cafeId, tier);
    setSaving(false);
  };

  const meta = TIER_META[currentTier];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={saving}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 500,
          padding: '3px 10px', borderRadius: 99,
          background: meta.bg, color: meta.color,
          border: 'none', cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.7 : 1,
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {meta.label}
        <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>

      {open && dropPos && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            background: 'white',
            border: '0.5px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: 4,
            zIndex: 9999,
            minWidth: 152,
          }}
        >
          {TIER_ORDER.map(tier => {
            const m = TIER_META[tier];
            const active = tier === currentTier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => select(tier)}
                className="flex items-center gap-2 w-full rounded-md hover:bg-gray-50 transition-colors"
                style={{
                  padding: '6px 10px',
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#f9fafb' : 'transparent',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  fontSize: 11, fontWeight: 500,
                  padding: '2px 8px', borderRadius: 99,
                  background: m.bg, color: m.color,
                  whiteSpace: 'nowrap',
                }}>
                  {m.label}
                </span>
                {active && <span className="ml-auto text-gray-400 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function Skel({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${w} ${h}`} />;
}

// ── Form Modal ─────────────────────────────────────────────────────────────────

function FormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: EditableCafe;
  onSave: (d: EditableCafe) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditableCafe>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = Boolean(initial.name);

  const set = <K extends keyof EditableCafe>(k: K, v: EditableCafe[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try { await onSave(form); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Gagal menyimpan'); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm sm:p-6">
      <div className="bg-white w-full sm:max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {isEdit ? 'Edit Cafe' : 'Tambah Cafe Baru'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEdit ? 'Perbarui informasi detail untuk cafe ini' : 'Masukkan informasi lengkap untuk mendaftarkan cafe baru'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="px-6 py-6 space-y-6">

            {/* Identitas Section */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-5">
              <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400">Identitas Utama</h3>
              <div className="space-y-4">
                <div>
                  <Label text="Nama Cafe" required />
                  <input className={inputCls} value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Contoh: Kopi Nako Purwokerto" required />
                </div>
                <div>
                  <Label text="Alamat Lengkap" required />
                  <textarea className={`${inputCls} resize-none min-h-[80px]`} value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Jl. ... No. ..., Kelurahan, Kecamatan" required />
                </div>
              </div>
            </div>

            {/* Kontak & Lokasi Section */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-5">
              <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400">Lokasi & Kontak</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label text="Latitude" required hint="-7.xx" />
                  <input type="number" step="any" className={inputCls} value={form.lat}
                    onChange={e => set('lat', parseFloat(e.target.value))} required />
                </div>
                <div>
                  <Label text="Longitude" required hint="109.xx" />
                  <input type="number" step="any" className={inputCls} value={form.lng}
                    onChange={e => set('lng', parseFloat(e.target.value))} required />
                </div>
                <div>
                  <Label text="Telepon" />
                  <input className={inputCls} value={form.phone ?? ''}
                    onChange={e => set('phone', e.target.value || null)}
                    placeholder="0812..." />
                </div>
                <div>
                  <Label text="Website / Instagram" />
                  <input className={inputCls} value={form.website ?? ''}
                    onChange={e => set('website', e.target.value || null)}
                    placeholder="https://..." />
                </div>
              </div>
            </div>

            {/* Operasional Section */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-5">
              <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400">Operasional & Harga</h3>
              
              <div className="space-y-4">
                <div>
                  <Label text="Jam Buka" hint="07:00 - 22:00 atau 24 Jam" />
                  <input className={inputCls} value={form.open_hours ?? ''}
                    onChange={e => set('open_hours', e.target.value || null)}
                    placeholder="Contoh: 07:00 - 22:00" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label text="Kisaran Harga" />
                    <select className={inputCls} value={form.price_level}
                      onChange={e => set('price_level', parseInt(e.target.value))}>
                      {Object.entries(PRICE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label text="Diskon Komunitas (%)" hint="Khusus Mitra" />
                    <input type="number" min={0} max={100} className={inputCls}
                      value={form.discount_value}
                      onChange={e => set('discount_value', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Mitra Toggle & Review */}
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4 p-5 bg-purple-50/50 border border-purple-100 rounded-2xl shadow-sm">
                <div>
                  <p className="text-sm font-bold text-purple-900">Mitra Semeja Kerja</p>
                  <p className="text-xs text-purple-700/70 mt-1">Aktifkan jika cafe ini adalah mitra resmi platform</p>
                </div>
                <Toggle on={form.is_partner} onToggle={() => set('is_partner', !form.is_partner)} />
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-4">
                <Label text="Review Unggulan" hint="Highlight dari pelanggan" />
                <textarea className={`${inputCls} resize-none min-h-[100px]`}
                  value={form.top_review ?? ''}
                  onChange={e => set('top_review', e.target.value || null)}
                  placeholder="Kutipan review terbaik dari pelanggan yang paling merepresentasikan cafe ini..." />
              </div>
            </div>

            {err && (
              <div className="flex gap-3 items-start bg-red-50 border border-red-100 rounded-xl px-4 py-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{err}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-5 flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm shadow-purple-600/20 disabled:opacity-60 disabled:cursor-not-allowed">
              {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Cafe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Dialog ──────────────────────────────────────────────────────────────

function DeleteDialog({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center">Hapus Cafe?</h3>
        <p className="mt-2 mb-6 text-sm text-gray-500 text-center leading-relaxed">
          <span className="font-semibold text-gray-800">"{name}"</span> akan dihapus permanen dan tidak dapat dikembalikan.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel}
            className="py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Batal
          </button>
          <button onClick={onConfirm}
            className="py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function CafesPage() {
  const [cafes, setCafes] = useState<CafeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editTarget, setEditTarget] = useState<CafeRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CafeRow | null>(null);

  const fetchCafes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cafes').select('*').order('total_reviews', { ascending: false });
    setCafes((data as CafeRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCafes(); }, [fetchCafes]);

  const filtered = cafes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.address ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = async (d: EditableCafe) => {
    const { error } = await supabase.from('cafes').insert([d]);
    if (error) throw new Error(error.message);
    setShowAdd(false); await fetchCafes();
  };

  const handleEdit = async (d: EditableCafe) => {
    if (!editTarget) return;
    const { error } = await supabase.from('cafes').update(d).eq('id', editTarget.id);
    if (error) throw new Error(error.message);
    setEditTarget(null); await fetchCafes();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('cafes').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null); await fetchCafes();
  };

  const changeTier = async (cafeId: string, newTier: CafeTier) => {
    setCafes(prev => prev.map(c =>
      c.id === cafeId
        ? { ...c, tier: newTier, is_partner: newTier === 'partner' }
        : c
    ));
    const { error } = await supabase
      .from('cafes')
      .update({ tier: newTier, is_partner: newTier === 'partner' })
      .eq('id', cafeId);
    if (error) await fetchCafes();
  };

  return (
    <>
      <div className="space-y-4">

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Cari nama atau alamat..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors active:scale-95 shadow-sm shadow-purple-200 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Cafe
          </button>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-xs text-gray-500 mt-1 mb-4">
            <span className="font-semibold text-gray-700">{filtered.length}</span> cafe ditemukan
            {search && <> untuk "<span className="text-purple-600">{search}</span>"</>}
          </p>
        )}

        {/* ── Table card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Loading state */}
          {loading && (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-1 space-y-1.5">
                    <Skel w="w-48" h="h-4" />
                    <Skel w="w-64" h="h-3" />
                  </div>
                  <Skel w="w-16" h="h-4" />
                  <Skel w="w-24" h="h-4" />
                  <Skel w="w-20" h="h-4" />
                  <Skel w="w-16" h="h-6" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && paged.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-600">Tidak ada cafe ditemukan</p>
              <p className="text-xs text-gray-400 mt-1">Coba ubah kata kunci pencarian</p>
            </div>
          )}

          {/* Table */}
          {!loading && paged.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '720px' }}>
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="pl-6 pr-4 py-5 text-left w-72">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Cafe</span>
                    </th>
                    <th className="px-4 py-5 text-left w-32">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Rating</span>
                    </th>
                    <th className="px-4 py-5 text-left w-32">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Jam Buka</span>
                    </th>
                    <th className="px-4 py-5 text-left w-44">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Kontak</span>
                    </th>
                    <th className="px-4 py-5 text-left w-36">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Tier</span>
                    </th>
                    <th className="pl-4 pr-6 py-5 text-right w-24">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((cafe, idx) => (
                    <tr
                      key={cafe.id}
                      className={['border-b border-gray-100 hover:bg-purple-50/30 transition-colors group min-h-[64px]', idx % 2 === 0 ? '' : 'bg-gray-50/30'].join(' ')}
                    >
                      {/* Cafe */}
                      <td className="pl-6 pr-4 py-5">
                        <p className="font-semibold text-gray-900 leading-tight truncate max-w-[260px]">
                          {cafe.name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                          <p className="text-xs text-gray-400 truncate max-w-[240px]">{cafe.address}</p>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                          <span className="font-bold text-gray-800">{parseFloat(String(cafe.rating)).toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(cafe.total_reviews ?? 0).toLocaleString('id-ID')} ulasan
                        </p>
                      </td>

                      {/* Jam buka */}
                      <td className="px-4 py-5">
                        {cafe.open_hours ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                            <span className="text-xs text-gray-700 font-medium">{cafe.open_hours}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Kontak */}
                      <td className="px-4 py-5">
                        <div className="space-y-1">
                          {cafe.phone && (
                            <a href={`tel:${cafe.phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-purple-600 transition-colors">
                              <Phone className="w-3 h-3 text-gray-300 shrink-0" />
                              <span className="truncate max-w-[140px]">{cafe.phone}</span>
                            </a>
                          )}
                          {cafe.website && (
                            <a
                              href={cafe.website} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-700 hover:underline transition-colors"
                            >
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {cafe.website.replace(/^https?:\/\//, '').split('/')[0]}
                              </span>
                            </a>
                          )}
                          {!cafe.phone && !cafe.website && (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-5">
                        <TierBadge
                          cafeId={cafe.id}
                          currentTier={getCafeRowTier(cafe)}
                          onTierChange={changeTier}
                        />
                      </td>

                      {/* Aksi */}
                      <td className="pl-4 pr-6 py-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditTarget(cafe)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(cafe)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Halaman <span className="font-semibold text-gray-800">{page + 1}</span> dari{' '}
                <span className="font-semibold text-gray-800">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Sebelumnya
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Berikutnya
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <FormModal initial={EMPTY} onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editTarget && (
        <FormModal
          initial={{
            name: editTarget.name, address: editTarget.address,
            lat: editTarget.lat, lng: editTarget.lng,
            phone: editTarget.phone, website: editTarget.website,
            open_hours: editTarget.open_hours, price_level: editTarget.price_level,
            is_partner: editTarget.is_partner, discount_value: editTarget.discount_value,
            top_review: editTarget.top_review,
          }}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteDialog name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
}
