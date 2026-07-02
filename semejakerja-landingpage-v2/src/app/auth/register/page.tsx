"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import styles from "../auth.module.css";

// Password strength: min 6 chars enforced; score rewards length + variety.
function getPasswordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Terlalu pendek", "Lemah", "Sedang", "Kuat", "Sangat kuat"];
  const colors = ["#ef4444", "#ef4444", "#f59e0b", "#22c55e", "#16a34a"];
  return { score, label: labels[score], color: colors[score] };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/membership";

  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [occupation, setOccupation] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isStudent, setIsStudent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    setError("");

    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // With "Confirm email" disabled, signUp returns an active session.
    // Without a session, auth.uid() is null and the RLS "insert own"
    // policies below reject both inserts — so guard explicitly.
    if (!authData.session) {
      setError(
        "Akun terdaftar tapi belum bisa login otomatis. Matikan 'Confirm email' di Supabase (Authentication → Providers → Email), lalu login manual di halaman Masuk."
      );
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Create profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: authData.user.id,
          full_name: fullName,
          nickname,
          occupation,
          city,
          phone,
          is_student: isStudent,
        });
      if (profileError) {
        console.error(
          "Profile creation error:",
          profileError.message,
          "| code:",
          profileError.code,
          "| details:",
          profileError.details,
          "| hint:",
          profileError.hint
        );
        setError(
          `Gagal simpan profil: ${profileError.message}${
            profileError.code ? ` (${profileError.code})` : ""
          }`
        );
        setLoading(false);
        return;
      }

      // 3. Create default 'nyantai' membership
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          user_id: authData.user.id,
          tier: "nyantai",
          status: "active",
        });
      if (membershipError) {
        console.error(
          "Membership creation error:",
          membershipError.message,
          "| code:",
          membershipError.code
        );
        // Non-blocking: profile exists; membership can be created later.
      }
    }

    router.push(next);
    router.refresh();
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.logoContainer}>
          <Link href="/">
            <Image
              src="/images/logos/semejakerja-logo-bg.png"
              alt="Semeja Kerja"
              width={160}
              height={44}
              priority
            />
          </Link>
        </div>

        <h1 className={styles.title}>Daftar Komunitas</h1>
        <p className={styles.subtitle}>
          Bergabung dengan 500+ member lainnya. Gratis selamanya!
        </p>

        <form onSubmit={handleRegister}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fullName">
              Nama Lengkap
            </label>
            <input
              id="fullName"
              type="text"
              className={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama lengkap kamu"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="nickname">
              Nama Panggilan
            </label>
            <input
              id="nickname"
              type="text"
              className={styles.input}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Mau dipanggil apa?"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="occupation">
              Kesibukan
            </label>
            <input
              id="occupation"
              type="text"
              className={styles.input}
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Mis. Mahasiswa, Karyawan, Freelancer, Wirausaha"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="city">
              Dari Kota Mana?
            </label>
            <input
              id="city"
              type="text"
              className={styles.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Mis. Purwokerto"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phone">
              No. WhatsApp
            </label>
            <input
              id="phone"
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {password && (
              <div className={styles.strengthMeter}>
                <div className={styles.strengthBars}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={styles.strengthSegment}
                      style={
                        i < strength.score
                          ? { backgroundColor: strength.color }
                          : undefined
                      }
                    />
                  ))}
                </div>
                <span
                  className={styles.strengthLabel}
                  style={{ color: strength.color }}
                >
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className={styles.checkboxGroup}>
            <input
              id="isStudent"
              type="checkbox"
              className={styles.checkbox}
              checked={isStudent}
              onChange={(e) => setIsStudent(e.target.checked)}
            />
            <label htmlFor="isStudent" className={styles.checkboxLabel}>
              <strong>Saya adalah Mahasiswa Aktif 🎓</strong>
              Centang ini jika kamu masih mahasiswa. Kamu berhak mendapat diskon
              untuk membership premium. (KTM akan diverifikasi nanti)
            </label>
          </div>

          <button
            type="submit"
            className={`btn btn--primary ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Mendaftar...
              </>
            ) : (
              "Gabung Semeja Kerja"
            )}
          </button>
        </form>

        <div className={styles.footer}>
          Sudah punya akun?{" "}
          <Link
            href={`/auth/login?next=${encodeURIComponent(next)}`}
            className={styles.footerLink}
          >
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
