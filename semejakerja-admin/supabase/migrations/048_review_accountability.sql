-- ============================================================
-- 048: Akuntabilitas review — catat admin mana yang approve/reject
--
-- reviewed_by sudah ada sebagai kolom di keempat tabel moderasi
-- (cafe_submissions/cafe_edits/cafe_reviews/cafe_photos) sejak sebelum
-- folder migrations ini ada, tapi ReviewModal.submit() di admin
-- (app/(dashboard)/maps/moderasi/page.tsx) tidak pernah mengisinya —
-- selama ini kosong terus. Sama seperti submitter_name/user_id di sisi
-- member (migration 040/041/046): kalau cuma diisi dari payload yang
-- dikirim client, admin yang nakal bisa kosongin/palsukan siapa yang
-- approve. Dipaksa dari server di sini juga — trigger baca auth.uid(),
-- bukan dari body request.
--
-- Ikut dipaksa juga reviewed_at (server now(), bukan timestamp dari
-- client) — alasan sama: mencegah admin backdate keputusan review-nya.
--
-- Trigger ini aman dipasang langsung di tabel-tabel ini karena RLS
-- "Maps admins manage cafe ..." (migration 014) sudah membatasi UPDATE
-- ke role admin (super_admin/maps_admin) — jadi auth.uid() yang kebaca
-- di trigger ini sudah pasti admin yang sah, bukan sembarang user.
-- ============================================================

-- ── 1. Normalisasi tipe reviewed_by ke uuid + FK ke auth.users ──
-- Ternyata reviewed_by TIDAK selalu kosong — cafe_reviews masih punya
-- data teks lama (email admin, mis. "afif@semejakerja.com") dari proses
-- sebelum ReviewModal generik yang sekarang. Sebelum cast ke uuid, coba
-- cocokkan dulu ke auth.users.email supaya histori review lama tetap
-- ke-link ke akun aslinya, bukan cuma dibuang. Teks yang gak match
-- (bukan email valid, atau emailnya udah gak ada di auth.users) terpaksa
-- di-NULL-kan — gak ada cara aman menebak identitas dari teks bebas.
DO $$
DECLARE
  v_type text;
BEGIN
  FOR v_type IN SELECT unnest(ARRAY['cafe_submissions','cafe_edits','cafe_reviews','cafe_photos']) LOOP
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_type AND column_name = 'reviewed_by') IS DISTINCT FROM 'uuid' THEN

      -- Resolve teks lama yang match email admin ke auth.users.id asli.
      EXECUTE format(
        'UPDATE %I t SET reviewed_by = au.id::text FROM auth.users au WHERE t.reviewed_by = au.email',
        v_type
      );

      -- Sisa teks yang bukan format uuid dan gak berhasil di-resolve
      -- (nama bebas, email yang udah gak ada akunnya, dst) — null-kan,
      -- daripada gagal total di cast berikutnya.
      EXECUTE format(
        $f$UPDATE %I SET reviewed_by = NULL
           WHERE reviewed_by IS NOT NULL
             AND reviewed_by !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'$f$,
        v_type
      );

      EXECUTE format('ALTER TABLE %I ALTER COLUMN reviewed_by TYPE uuid USING NULLIF(reviewed_by, %L)::uuid', v_type, '');
    END IF;
  END LOOP;
END $$;

ALTER TABLE cafe_submissions DROP CONSTRAINT IF EXISTS cafe_submissions_reviewed_by_fkey;
ALTER TABLE cafe_submissions ADD CONSTRAINT cafe_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE cafe_edits DROP CONSTRAINT IF EXISTS cafe_edits_reviewed_by_fkey;
ALTER TABLE cafe_edits ADD CONSTRAINT cafe_edits_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE cafe_reviews DROP CONSTRAINT IF EXISTS cafe_reviews_reviewed_by_fkey;
ALTER TABLE cafe_reviews ADD CONSTRAINT cafe_reviews_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE cafe_photos DROP CONSTRAINT IF EXISTS cafe_photos_reviewed_by_fkey;
ALTER TABLE cafe_photos ADD CONSTRAINT cafe_photos_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

-- ── 2. Trigger BEFORE UPDATE — satu fungsi dipakai di 4 tabel (logic-nya
--       identik persis, tidak ada perbedaan per tabel seperti trigger
--       identitas member yang kolomnya beda-beda). ──
CREATE OR REPLACE FUNCTION public.set_reviewed_by()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_submissions_set_reviewed_by ON cafe_submissions;
CREATE TRIGGER cafe_submissions_set_reviewed_by
  BEFORE UPDATE ON cafe_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_reviewed_by();

DROP TRIGGER IF EXISTS cafe_edits_set_reviewed_by ON cafe_edits;
CREATE TRIGGER cafe_edits_set_reviewed_by
  BEFORE UPDATE ON cafe_edits
  FOR EACH ROW EXECUTE FUNCTION public.set_reviewed_by();

DROP TRIGGER IF EXISTS cafe_reviews_set_reviewed_by ON cafe_reviews;
CREATE TRIGGER cafe_reviews_set_reviewed_by
  BEFORE UPDATE ON cafe_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_reviewed_by();

DROP TRIGGER IF EXISTS cafe_photos_set_reviewed_by ON cafe_photos;
CREATE TRIGGER cafe_photos_set_reviewed_by
  BEFORE UPDATE ON cafe_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_reviewed_by();

-- ── 3. Direktori admin — buat resolve reviewed_by (uuid) jadi nama/email
--       yang bisa ditampilkan di halaman moderasi. auth.users tidak bisa
--       diquery langsung lewat PostgREST, makanya butuh view definer ini
--       (pola sama seperti contribution_leaderboard_current_month di
--       migration 047). Dibatasi cuma admin yang login yang boleh baca —
--       bukan public.admin_role() checknya adalah AND filter di WHERE,
--       jadi member biasa yang login di web-apps publik tidak ikut bisa
--       lihat daftar email admin. ──
CREATE OR REPLACE VIEW public.admin_directory
WITH (security_invoker = false) AS
SELECT ar.user_id, au.email, up.full_name
FROM public.admin_roles ar
JOIN auth.users au ON au.id = ar.user_id
LEFT JOIN public.user_profiles up ON up.id = ar.user_id
WHERE public.admin_role() IS NOT NULL;

GRANT SELECT ON public.admin_directory TO authenticated;
REVOKE ALL ON public.admin_directory FROM anon;

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor.
-- Verifikasi setelah apply:
--   SELECT proname FROM pg_proc WHERE proname = 'set_reviewed_by';
--   SELECT * FROM admin_directory; -- harus nampilin semua admin_roles kalau kamu login sbg admin
--   -- Cek baris lama yang reviewed_by-nya ke-NULL-kan karena gak berhasil
--   -- di-resolve ke akun asli (teks lama bukan email valid / emailnya
--   -- udah gak ada di auth.users) — histori review-nya tetap ada, cuma
--   -- gak ketahuan lagi siapa yang review:
--   SELECT id, status, review_note, reviewed_at FROM cafe_reviews WHERE reviewed_at IS NOT NULL AND reviewed_by IS NULL;
-- ============================================================
