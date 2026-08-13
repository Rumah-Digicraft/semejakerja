import { useState, useRef } from 'react';
import { X, CheckCircle2, Star, Upload, ChevronRight, Loader2 } from 'lucide-react';
import {
  useSubmitNewCafe,
  useSubmitEdit,
  useSubmitReview,
  useSubmitPhoto,
} from '../../hooks/useContribute';
import type { CafeEditSuggestedData } from '../../types/cafe';
import PhotoCropModal from './PhotoCropModal';

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

const inputCls = [
  'w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm text-gray-900',
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

// ── Step 1: Identitas ─────────────────────────────────────────────────────────

interface IdentityData {
  name: string;
  wa: string;
}

function StepIdentity({
  data,
  onChange,
  onNext,
}: {
  data: IdentityData;
  onChange: (d: IdentityData) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-500 mb-5">
          Kontribusi kamu akan ditinjau oleh tim Semeja Kerja sebelum ditampilkan. Identitas bersifat opsional.
        </p>
        <div className="space-y-4">
          <div>
            <Label text="Nama" optional />
            <input
              className={inputCls}
              placeholder="Nama kamu"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
            />
          </div>
          <div>
            <Label text="WhatsApp" optional hint="untuk dihubungi jika ada pertanyaan" />
            <input
              className={inputCls}
              placeholder="08xxxxxxxxxx"
              value={data.wa}
              onChange={(e) => onChange({ ...data, wa: e.target.value })}
            />
          </div>
        </div>
      </div>
      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm shadow-purple-600/20"
      >
        Lanjut <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Step 2: Form per tipe ─────────────────────────────────────────────────────

function NewCafeForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (d: Record<string, string>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({ name: '', address: '', phone: '', website: '', open_hours: '', notes: '' });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label text="Nama Café" />
        <input required className={inputCls} placeholder="Contoh: Kopi Kenangan Purwokerto" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div>
        <Label text="Alamat Lengkap" />
        <textarea required className={`${inputCls} resize-none min-h-[72px]`} placeholder="Jl. Jendral Sudirman No. 1, Purwokerto..." value={form.address} onChange={(e) => set('address', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label text="Telepon" optional />
          <input className={inputCls} placeholder="08xx..." value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <Label text="Jam Buka" optional hint="mis. 08:00-22:00" />
          <input className={inputCls} placeholder="08:00 - 22:00" value={form.open_hours} onChange={(e) => set('open_hours', e.target.value)} />
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
        <Label text="Nama Café" optional />
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

// ── Step 3: Success ───────────────────────────────────────────────────────────

function SuccessScreen({ type, onClose }: { type: ContributeType; onClose: () => void }) {
  const messages: Record<ContributeType, { title: string; desc: string }> = {
    'new-cafe': { title: 'Usulan Terkirim!', desc: 'Café yang kamu usulkan akan ditinjau oleh tim Semeja Kerja sebelum ditampilkan di peta.' },
    'edit': { title: 'Saran Terkirim!', desc: 'Koreksi info café-mu sudah diterima dan akan ditinjau oleh tim.' },
    'review': { title: 'Ulasan Terkirim!', desc: 'Terima kasih sudah berbagi pengalaman! Ulasanmu akan segera diverifikasi.' },
    'photo': { title: 'Foto Terupload!', desc: 'Foto café-mu sudah diterima dan akan ditinjau oleh tim sebelum dipublikasikan.' },
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
  'new-cafe': 'Usulkan Café Baru',
  'edit': 'Saran Perbaikan Info',
  'review': 'Tulis Ulasan',
  'photo': 'Upload Foto',
};

type Step = 'identity' | 'form' | 'success';

// Koreksi info, ulasan & upload foto tidak punya step identitas — nama & WA
// diambil dari akun yang login (server-side, migration 040/041), jadi
// langsung ke step form. "Usulkan café baru" tetap pakai identitas bebas.
const STEPS_FOR: Record<ContributeType, Step[]> = {
  'new-cafe': ['identity', 'form'],
  'edit': ['form'],
  'review': ['form'],
  'photo': ['form'],
};

export function ContributeModal({ type, cafeId, cafeName, currentValues, onClose }: ContributeModalProps) {
  const steps = STEPS_FOR[type];
  const [step, setStep] = useState<Step>(steps[0]);
  const [identity, setIdentity] = useState<IdentityData>({ name: '', wa: '' });

  const { mutate: submitNew, isPending: pendingNew } = useSubmitNewCafe();
  const { mutate: submitEdit, isPending: pendingEdit } = useSubmitEdit();
  const { mutate: submitReview, isPending: pendingReview, error: reviewError } = useSubmitReview();

  const isLoading = pendingNew || pendingEdit || pendingReview;

  const handleNewCafe = (d: Record<string, string>) => {
    submitNew(
      {
        cafeName: d.name,
        address: d.address,
        phone: d.phone,
        website: d.website,
        open_hours: d.open_hours,
        notes: d.notes,
        submitterName: identity.name,
        submitterWa: identity.wa,
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

        {/* Step indicator — cuma tampil kalau ada >1 step (review langsung ke form) */}
        {step !== 'success' && steps.length > 1 && (
          <div className="flex items-center gap-2 px-6 pt-4 shrink-0">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === s ? 'bg-purple-600 text-white' : i < steps.indexOf(step) ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {i < steps.indexOf(step) ? '✓' : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 w-8 ${step === 'form' ? 'bg-purple-200' : 'bg-gray-100'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'identity' && (
            <StepIdentity data={identity} onChange={setIdentity} onNext={() => setStep('form')} />
          )}
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
