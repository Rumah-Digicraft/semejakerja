import { useState } from 'react';
import {
  CheckCircle2, XCircle, Clock, MapPin, Phone, Globe,
  User, MessageSquare, Star, Wifi, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  usePendingSubmissions,
  usePendingEdits,
  usePendingReviews,
  usePendingPhotos,
  useReviewContribution,
  usePendingCounts,
} from '../../hooks/useModerations';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import type { CafeSubmission, CafeEdit, CafeReview, CafePhoto } from '../../types/cafe';
import { supabase } from '../../lib/supabaseClient';

type ActiveTab = 'submissions' | 'edits' | 'reviews' | 'photos';

// ── Helpers ──────────────────────────────────────────────────────────────────

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-purple-600 text-white text-[10px] font-bold">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  const labels: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${map[status] ?? ''}`}>
      {status === 'pending' && <Clock className="w-3 h-3" />}
      {status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'rejected' && <XCircle className="w-3 h-3" />}
      {labels[status] ?? status}
    </span>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-20 text-center">
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-7 h-7 text-green-400" />
      </div>
      <p className="text-sm font-semibold text-gray-600">Tidak ada {label} yang menunggu</p>
      <p className="text-xs text-gray-400 mt-1">Semua sudah diverifikasi!</p>
    </div>
  );
}

// ── Review action card ───────────────────────────────────────────────────────

interface ActionCardProps {
  id: string;
  onApprove: () => void;
  onReject: (note: string) => void;
  isLoading: boolean;
  children: React.ReactNode;
}

function ActionCard({ id: _id, onApprove, onReject, isLoading, children }: ActionCardProps) {
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 space-y-3">{children}</div>
      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 flex flex-col gap-3">
        {showReject ? (
          <div className="space-y-2">
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              placeholder="Alasan penolakan (opsional)..."
              rows={2}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowReject(false)}
                className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => onReject(rejectNote)}
                disabled={isLoading}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowReject(true)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-colors disabled:opacity-60"
            >
              <XCircle className="w-3.5 h-3.5" />Tolak
            </button>
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />Setujui
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Café Baru ───────────────────────────────────────────────────────────

function SubmissionsTab({ adminEmail }: { adminEmail: string }) {
  const { data = [], isLoading } = usePendingSubmissions();
  const { mutate: reviewContrib, isPending } = useReviewContribution();

  const approve = (item: CafeSubmission) => {
    reviewContrib({
      table: 'cafe_submissions',
      id: item.id,
      status: 'approved',
      reviewedBy: adminEmail,
      applyPayload: {
        name: item.name,
        address: item.address,
        lat: item.lat ?? 0,
        lng: item.lng ?? 0,
        phone: item.phone,
        website: item.website,
        open_hours: item.open_hours,
        tier: 'basic',
        is_partner: false,
        discount_value: 0,
        rating: '0',
        total_reviews: 0,
        price_level: 0,
      },
    });
  };

  const reject = (id: string, note: string) => {
    reviewContrib({ table: 'cafe_submissions', id, status: 'rejected', reviewedBy: adminEmail, reviewNote: note });
  };

  if (isLoading) return <LoadingSkel />;
  if (data.length === 0) return <EmptyState label="café baru" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {data.map((item) => (
        <ActionCard
          key={item.id}
          id={item.id}
          onApprove={() => approve(item)}
          onReject={(note) => reject(item.id, note)}
          isLoading={isPending}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">{item.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString('id-ID')}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <MetaRow icon={MapPin} label="Alamat" value={item.address} />
          <MetaRow icon={Phone} label="Telepon" value={item.phone} />
          <MetaRow icon={Globe} label="Website" value={item.website} />
          <MetaRow icon={Clock} label="Jam buka" value={item.open_hours} />
          <MetaRow icon={User} label="Submitter" value={item.submitter_name ?? 'Anonim'} />
          {item.notes && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 italic">"{item.notes}"</div>
          )}
        </ActionCard>
      ))}
    </div>
  );
}

// ── Tab: Saran Edit ──────────────────────────────────────────────────────────

function EditFieldDiff({ field, value }: { field: string; value: string }) {
  const labels: Record<string, string> = {
    name: 'Nama', address: 'Alamat', phone: 'Telepon',
    website: 'Website', open_hours: 'Jam Buka',
  };
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 shrink-0 w-20">{labels[field] ?? field}:</span>
      <span className="text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-lg">{value}</span>
    </div>
  );
}

function EditsTab({ adminEmail }: { adminEmail: string }) {
  const { data = [], isLoading } = usePendingEdits();
  const { mutate: reviewContrib, isPending } = useReviewContribution();
  const [expanded, setExpanded] = useState<string | null>(null);

  const approve = (item: CafeEdit) => {
    reviewContrib({
      table: 'cafe_edits',
      id: item.id,
      status: 'approved',
      reviewedBy: adminEmail,
      applyPayload: { cafeId: item.cafe_id, ...item.suggested_data },
    });
  };

  const reject = (id: string, note: string) => {
    reviewContrib({ table: 'cafe_edits', id, status: 'rejected', reviewedBy: adminEmail, reviewNote: note });
  };

  if (isLoading) return <LoadingSkel />;
  if (data.length === 0) return <EmptyState label="saran edit" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {data.map((item) => (
        <ActionCard
          key={item.id}
          id={item.id}
          onApprove={() => approve(item)}
          onReject={(note) => reject(item.id, note)}
          isLoading={isPending}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-0.5">Saran Edit</p>
              <h3 className="font-bold text-gray-900">{item.cafe_name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString('id-ID')}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700"
            >
              {expanded === item.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {Object.keys(item.suggested_data).length} field diubah
            </button>
            {expanded === item.id && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                {Object.entries(item.suggested_data).map(([k, v]) => (
                  <EditFieldDiff key={k} field={k} value={v ?? ''} />
                ))}
              </div>
            )}
          </div>

          <MetaRow icon={User} label="Dari" value={item.submitter_name ?? 'Anonim'} />
          {item.notes && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 italic">"{item.notes}"</div>
          )}
        </ActionCard>
      ))}
    </div>
  );
}

// ── Tab: Ulasan ──────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-gray-700">{rating}/5</span>
    </div>
  );
}

function ReviewsTab({ adminEmail }: { adminEmail: string }) {
  const { data = [], isLoading } = usePendingReviews();
  const { mutate: reviewContrib, isPending } = useReviewContribution();

  const approve = (id: string) => {
    reviewContrib({ table: 'cafe_reviews', id, status: 'approved', reviewedBy: adminEmail });
  };
  const reject = (id: string, note: string) => {
    reviewContrib({ table: 'cafe_reviews', id, status: 'rejected', reviewedBy: adminEmail, reviewNote: note });
  };

  if (isLoading) return <LoadingSkel />;
  if (data.length === 0) return <EmptyState label="ulasan" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {data.map((item: CafeReview) => (
        <ActionCard
          key={item.id}
          id={item.id}
          onApprove={() => approve(item.id)}
          onReject={(note) => reject(item.id, note)}
          isLoading={isPending}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-0.5">Ulasan</p>
              <h3 className="font-bold text-gray-900">{item.cafe_name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString('id-ID')}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <StarRow rating={item.rating} />
          <MetaRow icon={Wifi} label="WiFi" value={item.wifi_speed != null ? `${item.wifi_speed} Mbps` : null} />
          <MetaRow icon={MessageSquare} label="Suasana" value={item.vibes != null ? `${item.vibes}/5` : null} />
          {item.comment && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700">"{item.comment}"</div>
          )}
          <MetaRow icon={User} label="Dari" value={item.reviewer_name ?? 'Anonim'} />
        </ActionCard>
      ))}
    </div>
  );
}

// ── Tab: Foto ────────────────────────────────────────────────────────────────

function PhotosTab({ adminEmail }: { adminEmail: string }) {
  const { data = [], isLoading } = usePendingPhotos();
  const { mutate: reviewContrib, isPending } = useReviewContribution();

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('cafe-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const approve = (id: string) => {
    reviewContrib({ table: 'cafe_photos', id, status: 'approved', reviewedBy: adminEmail });
  };
  const reject = (id: string, note: string) => {
    reviewContrib({ table: 'cafe_photos', id, status: 'rejected', reviewedBy: adminEmail, reviewNote: note });
  };

  if (isLoading) return <LoadingSkel />;
  if (data.length === 0) return <EmptyState label="foto" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {data.map((item: CafePhoto) => (
        <ActionCard
          key={item.id}
          id={item.id}
          onApprove={() => approve(item.id)}
          onReject={(note) => reject(item.id, note)}
          isLoading={isPending}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-0.5">Foto</p>
              <h3 className="font-bold text-gray-900">{item.cafe_name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString('id-ID')}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video flex items-center justify-center">
            <img
              src={getPublicUrl(item.storage_path)}
              alt={item.caption ?? 'Foto café'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          {item.caption && (
            <p className="text-sm text-gray-600 italic">"{item.caption}"</p>
          )}
          <MetaRow icon={User} label="Dari" value={item.submitter_name ?? 'Anonim'} />
        </ActionCard>
      ))}
    </div>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3 animate-pulse">
          <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
          <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
          <div className="h-3 bg-gray-100 rounded-lg w-2/3" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: ActiveTab; label: string; countKey: string }[] = [
  { id: 'submissions', label: 'Café Baru', countKey: 'submissions' },
  { id: 'edits', label: 'Saran Edit', countKey: 'edits' },
  { id: 'reviews', label: 'Ulasan', countKey: 'reviews' },
  { id: 'photos', label: 'Foto', countKey: 'photos' },
];

export function ModerasiPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('submissions');
  const { data: counts } = usePendingCounts();
  const { user } = useAdminAuth();
  const adminEmail = user?.email ?? 'admin';

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1 flex-wrap">
        {TABS.map(({ id, label, countKey }) => {
          const count = (counts as Record<string, number> | undefined)?.[countKey] ?? 0;
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                active ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
              ].join(' ')}
            >
              {label}
              {count > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${active ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-700'}`}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'submissions' && <SubmissionsTab adminEmail={adminEmail} />}
        {activeTab === 'edits' && <EditsTab adminEmail={adminEmail} />}
        {activeTab === 'reviews' && <ReviewsTab adminEmail={adminEmail} />}
        {activeTab === 'photos' && <PhotosTab adminEmail={adminEmail} />}
      </div>
    </div>
  );
}

// Re-export for use in AdminLayout badge
export { Badge };
