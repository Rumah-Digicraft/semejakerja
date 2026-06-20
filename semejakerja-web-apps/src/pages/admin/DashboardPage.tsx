import { useEffect, useState } from 'react';
import { Store, Star, TrendingUp, Handshake, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { CafeRow } from '../../types/cafe';

interface Stats {
  totalCafes: number;
  mitraAktif: number;
  avgRating: number;
  totalReviews: number;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  accentColor,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 min-h-[100px] border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      <div className={`mt-4 h-1 rounded-full ${accentColor} opacity-30`} />
    </div>
  );
}

// ── Rank badge ─────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-100 text-yellow-700',
    2: 'bg-gray-100 text-gray-600',
    3: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colors[rank] ?? 'bg-gray-50 text-gray-400'}`}>
      {rank}
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topCafes, setTopCafes] = useState<CafeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('cafes')
        .select('rating, total_reviews, is_partner');

      if (error || !data) { setLoading(false); return; }

      const total = data.length;
      const mitra = data.filter(r => r.is_partner).length;
      const avgRating =
        data.reduce((sum, r) => sum + (parseFloat(String(r.rating)) || 0), 0) / (total || 1);
      const totalReviews = data.reduce((sum, r) => sum + (r.total_reviews || 0), 0);

      setStats({ totalCafes: total, mitraAktif: mitra, avgRating, totalReviews });

      const { data: top } = await supabase
        .from('cafes')
        .select('id, name, rating, total_reviews, is_partner, address')
        .order('total_reviews', { ascending: false })
        .limit(8);

      setTopCafes((top as CafeRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const mitraPercent = stats
    ? Math.round((stats.mitraAktif / Math.max(stats.totalCafes, 1)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Selamat datang kembali 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">Berikut ringkasan data cafe Purwokerto hari ini.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Total Cafe"
          value={stats?.totalCafes ?? 0}
          icon={Store}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          accentColor="bg-purple-500"
          sub="Terdaftar di Purwokerto"
        />
        <StatCard
          label="Mitra Aktif"
          value={stats?.mitraAktif ?? 0}
          icon={Handshake}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          accentColor="bg-emerald-500"
          sub={`${mitraPercent}% dari total cafe`}
        />
        <StatCard
          label="Rata-rata Rating"
          value={stats ? stats.avgRating.toFixed(1) : '—'}
          icon={Star}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          accentColor="bg-amber-400"
          sub="Berdasarkan Google Reviews"
        />
        <StatCard
          label="Total Ulasan"
          value={stats ? stats.totalReviews.toLocaleString('id-ID') : 0}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          accentColor="bg-blue-500"
          sub="Ulasan Google Places"
        />
      </div>

      {/* Top cafes */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mt-8 mb-4">Cafe Terpopuler</h3>
          <p className="text-xs text-gray-400 mt-0.5">Diurutkan berdasarkan jumlah ulasan Google</p>
        </div>

        <div className="divide-y divide-gray-50">
          {topCafes.map((cafe, i) => (
            <div key={cafe.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
              <RankBadge rank={i + 1} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{cafe.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                  <p className="text-xs text-gray-400 truncate">{cafe.address}</p>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1">
                <div className="flex items-center justify-end gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-gray-700">
                    {parseFloat(String(cafe.rating)).toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {(cafe.total_reviews ?? 0).toLocaleString('id-ID')} ulasan
                </p>
              </div>

              <div className="w-16 shrink-0 text-right">
                {cafe.is_partner ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                    Mitra
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium bg-gray-50 text-gray-400">
                    Reguler
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
