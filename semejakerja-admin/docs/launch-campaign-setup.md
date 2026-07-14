# Launch Campaign — Panduan Setup

Fitur **Campaign + Mode Launch**: campaign bisa dinyalakan dari admin untuk mengubah
halaman **Pricing** di landing jadi "harga + form daftar". Pendaftar (wajib login)
dapat **kode diskon sekali pakai** yang terkunci ke akunnya, dikirim via **email
(Apps Script)** dan tampil di layar, lalu ditukar di checkout membership biasa.

## Arsitektur singkat

```
Landing /membership (LaunchBanner)
  └─ baca view active_launch_campaign  ── kalau ada → tampil mode launch
  └─ user login (Google) → RPC register_launch()
        ├─ bikin promo_codes (single-use, locked_to_user_id)   ← 018
        ├─ bikin campaign_leads                                 ← 018
        └─ trigger → notify_launch_lead → pg_net → Apps Script → email  ← 019
  └─ kode tampil di layar → dipakai di /membership/checkout (create_membership_checkout)
        └─ trigger tandai lead 'redeemed'                        ← 018
Admin /community/campaign → kelola campaign, toggle publish, lihat pendaftar & ROI
```

## Langkah setup (urut)

### 1. Jalankan migration 018
`supabase/migrations/018_launch_campaigns.sql` di Supabase SQL Editor.
Ini menambah tabel `campaigns`, `campaign_leads`, kolom `promo_codes.campaign_id`,
RPC `register_launch`, view `active_launch_campaign`, dan RLS/grants.
> Setelah ini, panel **Campaign** di admin sudah bisa dipakai. Email belum aktif.

### 2. Deploy Apps Script (email)
- Buka [script.google.com](https://script.google.com) → New project.
- Tempel isi `supabase/apps-script/launch-email.gs`.
- Ganti `SHARED_TOKEN` dengan string acak, mis:
  ```bash
  openssl rand -hex 16
  ```
- **Deploy → New deployment → Web app**
  - Execute as: **Me**
  - Who has access: **Anyone**
- Izinkan akses Gmail saat diminta. Salin URL yang berakhiran `/exec`.

### 3. Simpan kredensial ke Vault
Di SQL Editor (ganti nilainya):
```sql
select vault.create_secret('https://script.google.com/macros/s/XXX/exec', 'launch_gas_url');
select vault.create_secret('<SHARED_TOKEN yang sama persis>', 'launch_gas_token');
```

### 4. Jalankan migration 019
`supabase/migrations/019_launch_email_dispatch.sql` — mengaktifkan `pg_net`,
fungsi dispatch, dan trigger email. (Kalau `create extension pg_net` ditolak,
aktifkan dulu via Dashboard → Database → Extensions, lalu jalankan ulang.)

### 5. Buat campaign launch di admin
Admin → **Community → Campaign → Buat Campaign**:
- Nama: `Launch Website Semeja Kerja`, Objective `Launch`, centang **Mode Launch**.
- Di detail: isi **Diskon %**, **Kuota**, **Headline**, **Subheadline**, **CTA**,
  set **Mulai/Selesai** (tombol "+1 minggu"), **Status = Aktif**.
- Nyalakan switch **Publikasikan**. Badge **LIVE** muncul → halaman Pricing landing
  otomatis menampilkan mode launch.

### 6. Uji end-to-end
Buka `/membership` di landing (belum login) → banner launch muncul →
"Login untuk daftar" → setelah login klik daftar → kode tampil + email masuk →
checkout pakai kode → di admin, pendaftar berubah jadi **Sudah pakai**.

## Mematikan / mengakhiri
- **OFF sementara**: matikan switch Publikasikan (Pricing balik normal).
- **Selesai**: set Status = `Selesai`. Kode yang sudah terbit tetap berlaku sampai
  `expires_at` masing-masing (default 14 hari sejak terbit).

## Troubleshooting email
- Cek respons pg_net: `select * from net._http_response order by created desc limit 5;`
- Cek log eksekusi di Apps Script (View → Executions).
- Token mismatch → respons `unauthorized`. Pastikan `SHARED_TOKEN` = `launch_gas_token`.
- Kode tetap tampil di layar walau email gagal (email = backup, bukan titik gagal).
