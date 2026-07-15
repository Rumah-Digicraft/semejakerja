-- ============================================================
-- 020: Kembalikan "Public read active promo codes"
--
-- Gejala: di halaman checkout, SEMUA kode promo ditolak dengan
-- "Kode promo tidak valid atau kadaluarsa" — padahal kodenya ada,
-- aktif, dan belum kadaluarsa.
--
-- Akar masalah: policy baca publik dari migrasi 002 TIDAK ada di DB
-- live (kemungkinan 002 belum pernah dijalankan penuh, atau ke-drop).
-- Akibatnya user login non-admin (dan anon) tidak bisa SELECT
-- promo_codes → preview promo di checkout selalu kosong → "invalid".
-- (RPC create_membership_checkout sendiri SECURITY DEFINER jadi tidak
-- terpengaruh, tapi preview client-lah yang jadi gerbang.)
--
-- Aman: hanya membuka BACA kode yang is_active = true. Validasi
-- sebenarnya (locked_to_user_id, max_usage, expiry, dedupe) tetap
-- ditegakkan oleh RPC checkout.
-- ============================================================

-- RLS sudah enabled di promo_codes (migrasi 001). Idempoten.
DROP POLICY IF EXISTS "Public read active promo codes" ON promo_codes;
CREATE POLICY "Public read active promo codes" ON promo_codes
  FOR SELECT
  USING (is_active = true);

-- Pastikan grant tabel ada (RLS baru memfilter setelah grant lolos).
GRANT SELECT ON public.promo_codes TO anon, authenticated;
