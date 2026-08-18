-- ============================================================
-- 053: WFC form — daftar nama peserta publik + pertanyaan upload gambar
--
-- 1. RPC get_form_participants(token): halaman /wfc/register di landing
--    menampilkan siapa aja yang udah terdaftar di event — HANYA nama
--    (social proof), tanpa nomor WA/email/jawaban lain. form_responses
--    tetap tertutup buat publik (RLS admin + own-row saja); RPC
--    SECURITY DEFINER ini satu-satunya jendela publiknya, dan cuma
--    mengekstrak 1 string nama per respons status='registered'.
--    Nama diambil dari jawaban pertanyaan ber-profile_field
--    nickname/full_name (urutan pertanyaan menentukan prioritas),
--    fallback ke user_profiles milik user_id respons.
--
-- 2. Tipe pertanyaan baru 'image' di form builder (mis. screenshot
--    bukti follow IG). Upload langsung dari browser ke bucket baru
--    `form-uploads` (login Google udah wajib sejak 034, jadi INSERT
--    cukup buat authenticated); jawaban tersimpan sebagai public URL
--    string di form_responses.answers — tidak perlu perubahan skema
--    tabel. Bucket public read (pola payment-proofs 007, path pakai
--    uuid acak), maks 5MB & mime image/* ditegakkan di level bucket.
--
-- Requires: forms + form_responses (030), lifecycle & user_id (034),
-- user_profiles (001/009), public.admin_role() (014).
-- ============================================================

-- ── 1. RPC get_form_participants — nama peserta terdaftar (publik) ──
CREATE OR REPLACE FUNCTION public.get_form_participants(
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form forms%ROWTYPE;
  v_names jsonb;
BEGIN
  -- Sama seperti baca form-nya: cuma form 'open' yang bisa di-query.
  SELECT * INTO v_form FROM forms WHERE token = p_token AND status = 'open';
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(t.name ORDER BY t.created_at), '[]'::jsonb)
  INTO v_names
  FROM (
    SELECT
      r.created_at,
      coalesce(
        -- Jawaban pertanyaan nama di form ini (pertanyaan paling atas menang).
        (
          SELECT nullif(trim(r.answers ->> (q.value ->> 'id')), '')
          FROM jsonb_array_elements(v_form.questions) WITH ORDINALITY AS q(value, ord)
          WHERE q.value ->> 'profile_field' IN ('nickname', 'full_name')
            AND nullif(trim(r.answers ->> (q.value ->> 'id')), '') IS NOT NULL
          ORDER BY q.ord
          LIMIT 1
        ),
        nullif(trim(up.nickname), ''),
        nullif(trim(up.full_name), ''),
        'Peserta'
      ) AS name
    FROM form_responses r
    LEFT JOIN user_profiles up ON up.id = r.user_id
    WHERE r.form_id = v_form.id AND r.status = 'registered'
  ) t;

  RETURN v_names;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_form_participants(text) TO anon, authenticated;

-- ── 2. Storage: bucket form-uploads (login upload, public read) ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('form-uploads', 'form-uploads', true, 5242880, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload form images" ON storage.objects;
CREATE POLICY "Users upload form images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'form-uploads');

DROP POLICY IF EXISTS "Public read form images" ON storage.objects;
CREATE POLICY "Public read form images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'form-uploads');

-- Admin Community bisa bersih-bersih file (hapus respons ≠ hapus file;
-- file yatim dibersihkan manual dari sini / dashboard Supabase).
DROP POLICY IF EXISTS "Community admins manage form images" ON storage.objects;
CREATE POLICY "Community admins manage form images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'form-uploads' AND public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (bucket_id = 'form-uploads' AND public.admin_role() IN ('super_admin', 'community_admin'));

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini:
-- 1. SELECT get_form_participants('<token form open>') sebagai anon →
--    array nama peserta status='registered' saja (bandingkan dengan
--    SELECT count(*) FROM form_responses ... AND status='registered').
--    Token form draft/closed → '[]'.
-- 2. Di landing /wfc/register (login), isi form yang punya pertanyaan
--    "Upload gambar" → file masuk bucket form-uploads, jawaban berisi
--    public URL, thumbnail muncul di tabel respons admin.
-- 3. Coba upload file > 5MB atau non-gambar → ditolak di level bucket.
-- ============================================================
