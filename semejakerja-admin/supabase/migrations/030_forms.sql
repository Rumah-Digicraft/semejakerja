-- ============================================================
-- 030: Form builder untuk event WFC Bareng Strangers (kolab cafe)
--
-- Menambah "form builder" gaya Google Forms yang dikelola admin
-- Community. Tiap form = satu event pendaftaran (mis. WFC Bareng
-- Strangers at Cold 'N Brew). Pertanyaan disimpan sebagai array
-- JSONB supaya bisa tambah/hapus/urut tanpa migrasi baru; jawaban
-- di form_responses juga JSONB, keyed by id pertanyaan.
--
-- Pengunjung (strangers, TANPA login) mengisi form lewat landing
-- page pakai token di URL sebagai "capability" — sama seperti
-- moves/join (migration 007). Tulis jawaban HANYA lewat RPC
-- SECURITY DEFINER submit_form_response; tidak ada INSERT anon
-- langsung ke form_responses.
--
-- Requires: public.admin_role() (014).
-- ============================================================

-- ── 1. Tabel forms (definisi form/event) ────────────────────
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,                          -- blok intro multi-baris
  cafe_name text,                            -- cafe kolab (teks bebas)

  -- Pertanyaan builder: array of
  -- { id, type, label, help, required, options[] }
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,

  quota integer,                             -- batas total respons (NULL = tak terbatas)

  -- Langkah akhir → tombol "Klik Disini" ke grup WhatsApp
  whatsapp_group_url text,
  whatsapp_group_label text DEFAULT 'Klik Sini',
  success_message text,                      -- pesan setelah submit

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','open','closed')),
  -- token = kapabilitas link publik (dibuat otomatis, tanpa login)
  token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── 2. Tabel form_responses (jawaban) ───────────────────────
CREATE TABLE IF NOT EXISTS form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  -- jawaban keyed by id pertanyaan: { [questionId]: string | string[] }
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  attended boolean NOT NULL DEFAULT false,   -- check-in manual admin (opsional)
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_responses_form ON form_responses(form_id);

-- ── 3. auto-update updated_at pada forms ────────────────────
CREATE OR REPLACE FUNCTION public.set_forms_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forms_updated_at ON forms;
CREATE TRIGGER trg_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION public.set_forms_updated_at();

-- ── 4. RPC submit_form_response — kirim jawaban (publik) ─────
-- SECURITY DEFINER: menulis form_responses tanpa membuka INSERT
-- anon ke tabel. Token WAJIB & form harus status 'open'.
-- FOR UPDATE me-lock baris form supaya cek kuota race-safe.
-- Validasi field wajib dilakukan di sisi client (seperti moves/join);
-- RPC hanya menjaga status + kuota.
CREATE OR REPLACE FUNCTION public.submit_form_response(
  p_token text,
  p_answers jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form forms%ROWTYPE;
  v_count integer;
  v_resp_id uuid;
BEGIN
  SELECT * INTO v_form FROM forms
    WHERE token = p_token AND status = 'open'
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form tidak aktif atau sudah ditutup';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Jawaban tidak valid';
  END IF;

  -- Kuota total respons.
  IF v_form.quota IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM form_responses WHERE form_id = v_form.id;
    IF v_count >= v_form.quota THEN
      RAISE EXCEPTION 'Kuota pendaftar sudah penuh';
    END IF;
  END IF;

  INSERT INTO form_responses (form_id, answers)
  VALUES (v_form.id, p_answers)
  RETURNING id INTO v_resp_id;

  RETURN jsonb_build_object(
    'ok', true,
    'response_id', v_resp_id,
    'whatsapp_group_url', v_form.whatsapp_group_url,
    'whatsapp_group_label', coalesce(v_form.whatsapp_group_label, 'Klik Sini'),
    'success_message', v_form.success_message
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_form_response(text, jsonb) TO anon, authenticated;

-- ── 5. RLS + grants ─────────────────────────────────────────
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

-- forms: dikelola super_admin + community_admin.
DROP POLICY IF EXISTS "Admins manage forms" ON forms;
CREATE POLICY "Admins manage forms" ON forms
  FOR ALL TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'community_admin'));

-- forms: publik (anon) baca HANYA form yang OPEN (untuk diisi lewat link).
-- Semua kolomnya info publik (judul, cafe, deskripsi, pertanyaan, kuota,
-- link WA) sehingga aman diekspos — pola sama dengan sessions (007).
DROP POLICY IF EXISTS "Public read open forms" ON forms;
CREATE POLICY "Public read open forms" ON forms
  FOR SELECT
  USING (status = 'open');

-- form_responses: admin baca/ubah/hapus. Tulis HANYA lewat RPC (definer);
-- tidak ada policy INSERT sehingga anon tak bisa menulis langsung.
DROP POLICY IF EXISTS "Admins read form responses" ON form_responses;
CREATE POLICY "Admins read form responses" ON form_responses
  FOR SELECT TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'));

DROP POLICY IF EXISTS "Admins update form responses" ON form_responses;
CREATE POLICY "Admins update form responses" ON form_responses
  FOR UPDATE TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'))
  WITH CHECK (public.admin_role() IN ('super_admin', 'community_admin'));

DROP POLICY IF EXISTS "Admins delete form responses" ON form_responses;
CREATE POLICY "Admins delete form responses" ON form_responses
  FOR DELETE TO authenticated
  USING (public.admin_role() IN ('super_admin', 'community_admin'));

-- Grants tabel (RLS tetap memfilter baris).
GRANT SELECT, INSERT, UPDATE, DELETE ON forms TO authenticated;
GRANT SELECT ON forms TO anon;
GRANT SELECT, UPDATE, DELETE ON form_responses TO authenticated;
GRANT ALL ON forms TO service_role;
GRANT ALL ON form_responses TO service_role;

-- ============================================================
-- MANUAL STEP setelah menjalankan migrasi ini:
-- 1. Smoke test: sebagai community_admin, INSERT satu form
--    status='open', quota=2, questions berisi 1-2 item →
--    cek SELECT * FROM forms WHERE token=<token> terlihat sebagai anon.
-- 2. Panggil SELECT submit_form_response('<token>', '{"q1":"halo"}'::jsonb)
--    → balikan ok:true + baris masuk form_responses. Panggil sampai
--    melewati quota → error 'Kuota pendaftar sudah penuh'.
-- ============================================================
