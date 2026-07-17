"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LogOut,
  Pencil,
  Check,
  X,
  Crown,
  CalendarClock,
  Clock,
  Wallet,
  Tag,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GoogleIcon from "@/app/components/GoogleIcon";
import { STUDENT_MEMBERSHIP_ENABLED } from "@/lib/flags";
import {
  benefitsForTier,
  tierLabels,
  tierTaglines,
  type MembershipTier,
} from "../features";
import MembershipECard from "./MembershipECard";
import {
  formatDate,
  type Membership,
  type MembershipStatus,
  type UserProfile,
} from "./types";
import styles from "./dashboard.module.css";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

// Active = status 'active' AND (no expiry OR not yet expired).
// Mirrors the logic in semejakerja-web-apps/src/hooks/useAuth.ts.
function isActive(m: Membership): boolean {
  if (m.status !== "active") return false;
  if (!m.expires_at) return true;
  return new Date(m.expires_at).getTime() > Date.now();
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const statusLabels: Record<MembershipStatus, string> = {
  active: "Aktif",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  pending_payment: "Menunggu Pembayaran",
};

function initials(name: string | null): string {
  if (!name) return "M";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  // URL halaman bayar DOKU dari transaksi pending → dipakai banner untuk
  // MELANJUTKAN pembayaran yang sama (bukan bikin checkout baru).
  const [pendingPayUrl, setPendingPayUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/auth/login?next=/membership/dashboard");
      return;
    }
    setUserId(user.id);
    setEmail(user.email ?? null);

    // maybeSingle(): a missing profile row returns null (not an error) — the DB
    // trigger normally creates it, but this stays resilient if it hasn't.
    const [{ data: profileData }, { data: membershipData }, { data: txData }] =
      await Promise.all([
        supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("memberships")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        // Transaksi DOKU yang masih pending (RLS: member baca miliknya sendiri).
        supabase
          .from("payment_transactions")
          .select("payment_url, expires_at, created_at")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

    setProfile((profileData as UserProfile) ?? null);
    setMemberships((membershipData as Membership[]) ?? []);

    // Link bayar DOKU untuk dilanjutkan: utamakan yang belum kedaluwarsa,
    // jatuh ke transaksi ber-URL terbaru kalau semua sudah lewat (DOKU akan
    // menampilkan halaman "kedaluwarsa" yang jelas ketimbang jalur buntu).
    const tx =
      (txData as { payment_url: string | null; expires_at: string | null }[] | null) ?? [];
    const fresh = tx.find(
      (t) => t.payment_url && (!t.expires_at || new Date(t.expires_at).getTime() > Date.now())
    );
    const latestWithUrl = tx.find((t) => t.payment_url);
    setPendingPayUrl((fresh ?? latestWithUrl)?.payment_url ?? null);

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className={styles.loaderWrap}>
        <Loader2 size={36} className="animate-spin" />
        <p>Memuat dashboard…</p>
      </div>
    );
  }

  const active = memberships.find(isActive) ?? null;
  const pending = memberships.filter((m) => m.status === "pending_payment");
  const currentTier: MembershipTier = active?.tier ?? "nyantai";
  const benefits = benefitsForTier(currentTier);
  const remaining = active ? daysLeft(active.expires_at) : null;

  const displayName =
    profile?.nickname || profile?.full_name || "Member";

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Dashboard Member</p>
            <h1 className={styles.greeting}>Halo, {displayName} 👋</h1>
          </div>
          <button
            onClick={handleLogout}
            className={`btn btn--secondary btn--small ${styles.logoutBtn}`}
          >
            <LogOut size={16} /> Keluar
          </button>
        </header>

        {/* Pending payment banner */}
        {pending.length > 0 && (
          <div className={styles.pendingBanner}>
            <AlertTriangle size={22} className={styles.pendingIcon} />
            <div className={styles.pendingBody}>
              <strong>Pembayaran belum selesai</strong>
              <p>
                Kamu punya pesanan membership{" "}
                <b>{pending.map((m) => tierLabels[m.tier]).join(", ")}</b> yang
                belum dibayar. Lanjutkan pembayaran di DOKU — membership-mu aktif
                otomatis setelah pembayaran berhasil.
              </p>
              {pendingPayUrl ? (
                <a href={pendingPayUrl} className={styles.pendingLink}>
                  Lanjutkan pembayaran <ArrowRight size={14} />
                </a>
              ) : (
                <Link href="/membership" className={styles.pendingLink}>
                  Buat pembayaran baru <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* E-Card member (hanya tier berbayar dengan membership aktif) */}
        {active && active.tier !== "nyantai" && (
          <MembershipECard profile={profile} membership={active} />
        )}

        <div className={styles.grid}>
          {/* Profile card */}
          <ProfileCard
            profile={profile}
            userId={userId}
            email={email}
            onSaved={loadData}
            supabase={supabase}
          />

          {/* Membership card */}
          <section className={`card ${styles.membershipCard}`}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>
                <Crown size={18} /> Membership
              </h2>
              <span className={`${styles.tierBadge} ${styles[`tier_${currentTier}`]}`}>
                {tierLabels[currentTier]}
              </span>
            </div>

            <p className={styles.tierTagline}>{tierTaglines[currentTier]}</p>

            <dl className={styles.metaList}>
              <div className={styles.metaRow}>
                <dt>
                  <ShieldCheck size={15} /> Status
                </dt>
                <dd>{active ? statusLabels[active.status] : "Tidak aktif"}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>
                  <CalendarClock size={15} /> Aktif sejak
                </dt>
                <dd>{formatDate(active?.started_at ?? active?.created_at ?? null)}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>
                  <Clock size={15} /> Berlaku hingga
                </dt>
                <dd>
                  {currentTier === "nyantai" || !active?.expires_at
                    ? "Selamanya"
                    : `${formatDate(active.expires_at)}${
                        remaining !== null ? ` (${remaining} hari lagi)` : ""
                      }`}
                </dd>
              </div>
              {active?.price_paid ? (
                <div className={styles.metaRow}>
                  <dt>
                    <Wallet size={15} /> Harga dibayar
                  </dt>
                  <dd>{rupiah.format(active.price_paid)}</dd>
                </div>
              ) : null}
            </dl>

            <div className={styles.benefitsBlock}>
              <p className={styles.benefitsLabel}>Benefit tier kamu</p>
              <ul className={styles.benefitsList}>
                {benefits.map((b) => (
                  <li key={b}>
                    <Check size={16} className={styles.benefitIcon} /> {b}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/membership"
              className={`btn btn--primary ${styles.upgradeBtn}`}
            >
              {currentTier === "mode_serius"
                ? "Perpanjang Membership"
                : "Upgrade / Perpanjang"}
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>

        {/* Billing history */}
        <section className={`card ${styles.historyCard}`}>
          <h2 className={styles.cardTitle}>
            <Tag size={18} /> Riwayat Membership
          </h2>

          {memberships.length === 0 ? (
            <p className={styles.emptyState}>Belum ada riwayat membership.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Status</th>
                      <th>Periode</th>
                      <th>Promo</th>
                      <th className={styles.right}>Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberships.map((m) => (
                      <tr key={m.id}>
                        <td>{tierLabels[m.tier]}</td>
                        <td>
                          <span className={`${styles.statusPill} ${styles[`st_${m.status}`]}`}>
                            {statusLabels[m.status]}
                          </span>
                        </td>
                        <td>
                          {formatDate(m.started_at ?? m.created_at)}
                          {m.expires_at ? ` – ${formatDate(m.expires_at)}` : ""}
                        </td>
                        <td>{m.promo_code_used || "—"}</td>
                        <td className={styles.right}>
                          {m.price_paid ? rupiah.format(m.price_paid) : "Gratis"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className={styles.historyCards}>
                {memberships.map((m) => (
                  <div key={m.id} className={styles.historyItem}>
                    <div className={styles.historyItemTop}>
                      <strong>{tierLabels[m.tier]}</strong>
                      <span className={`${styles.statusPill} ${styles[`st_${m.status}`]}`}>
                        {statusLabels[m.status]}
                      </span>
                    </div>
                    <p className={styles.historyMeta}>
                      {formatDate(m.started_at ?? m.created_at)}
                      {m.expires_at ? ` – ${formatDate(m.expires_at)}` : ""}
                    </p>
                    <p className={styles.historyMeta}>
                      Promo: {m.promo_code_used || "—"} ·{" "}
                      {m.price_paid ? rupiah.format(m.price_paid) : "Gratis"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile card + inline edit form
// ---------------------------------------------------------------------------

function ProfileCard({
  profile,
  userId,
  email,
  onSaved,
  supabase,
}: {
  profile: UserProfile | null;
  userId: string | null;
  email: string | null;
  onSaved: () => void | Promise<void>;
  supabase: ReturnType<typeof createClient>;
}) {
  // Nudge new (OAuth) members whose profile is still empty to fill it in.
  const profileIncomplete = !profile?.full_name || !profile?.phone;
  const [editing, setEditing] = useState(profileIncomplete);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    nickname: profile?.nickname ?? "",
    occupation: profile?.occupation ?? "",
    city: profile?.city ?? "",
    phone: profile?.phone ?? "",
  });

  const startEdit = () => {
    setForm({
      full_name: profile?.full_name ?? "",
      nickname: profile?.nickname ?? "",
      occupation: profile?.occupation ?? "",
      city: profile?.city ?? "",
      phone: profile?.phone ?? "",
    });
    setError("");
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = profile?.id ?? userId;
    if (!id) {
      setError("Sesi tidak ditemukan. Coba muat ulang halaman.");
      return;
    }
    setSaving(true);
    setError("");

    // upsert (not update): creates the row if it doesn't exist yet, otherwise
    // updates it. Covers members who don't have a user_profiles row.
    const { error: saveError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          id,
          full_name: form.full_name,
          nickname: form.nickname,
          occupation: form.occupation,
          city: form.city,
          phone: form.phone,
        },
        { onConflict: "id" }
      );

    if (saveError) {
      setError(`Gagal menyimpan: ${saveError.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    await onSaved();
  };

  return (
    <section className={`card ${styles.profileCard}`}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Profil Saya</h2>
        {!editing && (
          <button className={styles.editBtn} onClick={startEdit}>
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="profile-email">
              Email
            </label>
            <div className={styles.emailField}>
              <GoogleIcon size={18} />
              <input
                id="profile-email"
                type="email"
                className={`${styles.input} ${styles.emailInput}`}
                value={email ?? ""}
                disabled
                readOnly
              />
            </div>
            <p className={styles.emailNote}>
              Terhubung dengan akun Google — tidak bisa diubah.
            </p>
          </div>

          {(
            [
              { key: "full_name", label: "Nama Lengkap", type: "text" },
              { key: "nickname", label: "Nama Panggilan", type: "text" },
              { key: "occupation", label: "Kesibukan", type: "text" },
              { key: "city", label: "Kota", type: "text" },
              { key: "phone", label: "No. WhatsApp", type: "tel" },
            ] as const
          ).map((f) => (
            <div key={f.key} className={styles.formGroup}>
              <label className={styles.label} htmlFor={f.key}>
                {f.label}
              </label>
              <input
                id={f.key}
                type={f.type}
                className={styles.input}
                value={form[f.key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                required
              />
            </div>
          ))}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              <X size={16} /> Batal
            </button>
            <button
              type="submit"
              className={`btn btn--primary btn--small ${styles.saveBtn}`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Menyimpan…
                </>
              ) : (
                <>
                  <Check size={16} /> Simpan
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.profileTop}>
            <div className={styles.avatar}>
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.full_name ?? "Avatar"} />
              ) : (
                <span>{initials(profile?.full_name ?? profile?.nickname ?? null)}</span>
              )}
            </div>
            <div>
              <p className={styles.profileName}>
                {profile?.full_name || "Tanpa Nama"}
              </p>
              {profile?.nickname && (
                <p className={styles.profileNick}>“{profile.nickname}”</p>
              )}
              {STUDENT_MEMBERSHIP_ENABLED && profile?.is_student && (
                <span
                  className={`${styles.studentBadge} ${
                    profile.student_verified_at ? styles.verified : styles.unverified
                  }`}
                >
                  {profile.student_verified_at ? (
                    <>
                      <ShieldCheck size={13} /> Mahasiswa Terverifikasi
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={13} /> Mahasiswa (menunggu verifikasi)
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          <dl className={styles.metaList}>
            <div className={styles.metaRow}>
              <dt>
                <Mail size={15} /> Email
              </dt>
              <dd className={styles.emailValue}>
                {email ? (
                  <>
                    <GoogleIcon size={14} /> {email}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className={styles.metaRow}>
              <dt>
                <Phone size={15} /> WhatsApp
              </dt>
              <dd>{profile?.phone || "—"}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>
                <Briefcase size={15} /> Kesibukan
              </dt>
              <dd>{profile?.occupation || "—"}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>
                <MapPin size={15} /> Kota
              </dt>
              <dd>{profile?.city || "—"}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>
                <CalendarClock size={15} /> Member sejak
              </dt>
              <dd>{formatDate(profile?.created_at ?? null)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
