-- ============================================================
-- 019: Kirim email kode launch via Google Apps Script (pg_net)
--
-- Saat sebuah campaign_lead dibuat (oleh register_launch), trigger ini
-- menembak POST ke Web App Apps Script yang mengirim email berisi
-- kode diskon ke email pendaftar. Async (net.http_post fire-and-forget)
-- → registrasi tetap cepat; kalau GAS mati, kode tetap tampil di layar.
--
-- URL + token GAS disimpan di SUPABASE VAULT (bukan app_settings, yang
-- public-readable). Fungsi SECURITY DEFINER membacanya saat dispatch.
--
-- ⚠️ Jalankan SETELAH Apps Script web app dideploy (lihat MANUAL STEP).
-- Requires: campaign_leads + promo_codes (018).
-- ============================================================

-- ── 1. Ekstensi ─────────────────────────────────────────────
-- pg_net: HTTP dari dalam Postgres. Kalau CREATE gagal karena
-- kebijakan instance, aktifkan lewat Dashboard → Database → Extensions.
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Vault biasanya sudah aktif di Supabase; pastikan ada.
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ── 2. Fungsi dispatch email untuk satu lead ────────────────
CREATE OR REPLACE FUNCTION public.notify_launch_lead(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_url text;
  v_token text;
  v_email text;
  v_name text;
  v_code text;
  v_discount integer;
  v_expires timestamptz;
BEGIN
  -- Ambil kredensial GAS dari Vault. Belum diset → no-op (aman).
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'launch_gas_url';
  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'launch_gas_token';
  IF v_url IS NULL THEN RETURN; END IF;

  SELECT u.email,
         coalesce(p.full_name, split_part(u.email, '@', 1)),
         pc.code, pc.discount_percent, pc.expires_at
    INTO v_email, v_name, v_code, v_discount, v_expires
  FROM campaign_leads l
    JOIN auth.users u ON u.id = l.user_id
    LEFT JOIN user_profiles p ON p.id = l.user_id
    JOIN promo_codes pc ON pc.id = l.promo_code_id
  WHERE l.id = p_lead_id;

  IF v_email IS NULL OR v_code IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'token', v_token,
      'to', v_email,
      'name', v_name,
      'code', v_code,
      'discount', v_discount,
      'expires_at', v_expires
    )
  );

  -- Tandai waktu percobaan kirim (bukan konfirmasi terkirim).
  UPDATE campaign_leads SET email_sent_at = now() WHERE id = p_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_launch_lead(uuid) FROM public, anon, authenticated;

-- ── 3. Trigger: kirim email saat lead dibuat ────────────────
CREATE OR REPLACE FUNCTION public.on_campaign_lead_created()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_launch_lead(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_lead_email ON campaign_leads;
CREATE TRIGGER trg_campaign_lead_email
  AFTER INSERT ON campaign_leads
  FOR EACH ROW EXECUTE FUNCTION public.on_campaign_lead_created();

-- ============================================================
-- MANUAL STEP (urutan):
--
-- 1. Deploy Apps Script web app (lihat supabase/apps-script/launch-email.gs):
--    - Extensions → Apps Script → tempel isi launch-email.gs.
--    - Ganti SHARED_TOKEN dgn string acak (mis. hasil `openssl rand -hex 16`).
--    - Deploy → New deployment → Web app → Execute as: Me,
--      Who has access: Anyone. Salin URL /exec-nya.
--
-- 2. Simpan kredensial ke Vault (SQL Editor, ganti nilainya):
--      SELECT vault.create_secret('https://script.google.com/macros/s/XXX/exec', 'launch_gas_url');
--      SELECT vault.create_secret('<SHARED_TOKEN yang sama>', 'launch_gas_token');
--    (Untuk update nilai nanti: SELECT vault.update_secret(id, new_secret) —
--     cari id via SELECT id,name FROM vault.secrets;)
--
-- 3. Baru jalankan migrasi ini (018 harus sudah jalan duluan).
--
-- 4. Uji: daftar satu akun via halaman Pricing (mode launch ON) →
--    cek email masuk. Kalau tidak: cek dashboard pg_net
--    (SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;)
--    dan log eksekusi di Apps Script.
-- ============================================================
