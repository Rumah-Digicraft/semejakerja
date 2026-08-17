-- ============================================================
-- 051: cafe_submissions/cafe_edits/cafe_photos — user boleh baca baris
-- miliknya sendiri, status apa pun (bukan cuma approved)
--
-- Halaman "Kontribusiku" (web-apps) tadinya cuma nampilin kontribusi yang
-- SUDAH disetujui (sumbernya contribution_points, ledger yang emang cuma
-- keisi saat approve — lihat migration 047). Admin baru saja reject satu
-- kontribusi dan user itu sama sekali tidak tahu ditolak apalagi kenapa,
-- karena secara RLS user biasa TIDAK BISA query balik baris miliknya
-- sendiri di cafe_submissions/cafe_edits sama sekali (cuma admin_role()
-- yang punya policy SELECT di situ, lihat migration 014) — cafe_photos
-- sudah punya "Public read approved cafe photos" tapi itu juga cuma
-- status='approved', bukan punya-sendiri-apa-pun-statusnya.
--
-- Ini menambah policy baru (permissive, ADDITIF — tidak mengurangi akses
-- admin yang sudah ada) yang membolehkan authenticated user baca baris
-- miliknya sendiri (user_id = auth.uid()) apa pun statusnya, supaya
-- "Kontribusiku" bisa nampilin status pending/approved/rejected +
-- review_note (alasan ditolak).
-- ============================================================

DROP POLICY IF EXISTS "Users read own cafe submissions" ON cafe_submissions;
CREATE POLICY "Users read own cafe submissions" ON cafe_submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own cafe edits" ON cafe_edits;
CREATE POLICY "Users read own cafe edits" ON cafe_edits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own cafe photos" ON cafe_photos;
CREATE POLICY "Users read own cafe photos" ON cafe_photos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- MANUAL STEP: jalankan di Supabase SQL editor.
-- Verifikasi setelah apply (login sebagai user biasa, bukan admin, di SQL
-- editor ini tetap jalan sebagai postgres jadi cek lewat aplikasi):
--   Buka /kontribusiku di web-apps sebagai user yang barusan dapat
--   kontribusi di-reject — riwayatnya sekarang harus muncul dengan status
--   "Ditolak" + alasan dari review_note.
-- ============================================================
