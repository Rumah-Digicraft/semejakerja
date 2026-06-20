# 🏸 semejamoves-web-apps

> Aplikasi internal manajemen **olahraga komunitas Semeja Kerja** — Funminton & Padel.

---

## 📋 Deskripsi

Sistem manajemen sesi olahraga internal untuk komunitas Semeja Kerja. Aplikasi ini digunakan oleh admin/pengelola untuk mencatat sesi **Funminton** (badminton santai) dan **Padel**, mengelola peserta, memantau pembayaran, dan membuat laporan keuangan. Tersedia juga halaman publik yang bisa dibagikan ke peserta via token unik.

---

## 🛠️ Tech Stack

| Teknologi      | Versi  | Keterangan                            |
| -------------- | ------ | ------------------------------------- |
| React          | 19     | UI framework utama                    |
| TypeScript     | ~6.0   | Type safety end-to-end                |
| Vite           | 8      | Dev server & bundler                  |
| Tailwind CSS   | v4     | Utility-first styling                 |
| Supabase JS    | 2      | Backend: database + autentikasi       |
| React Router   | v7     | Client-side routing + protected routes|
| Lucide React   | latest | Icon library                          |
| Gemini API     | —      | Fitur AI — opsional                   |

---

## 📁 Struktur Project

```
semejamoves-web-apps/
├── .env.example               # Template environment variables
├── .env.local                 # ← Buat dari template ini (tidak di-commit)
├── .gitignore
├── index.html                 # HTML entry point (Vite)
├── vite.config.ts             # Konfigurasi Vite + plugins
├── tsconfig.json              # TypeScript config
├── package.json
├── public/                    # Aset statis
├── dist/                      # Output build produksi (di-gitignore)
└── src/
    ├── main.tsx               # Entry point React
    ├── App.tsx                # Root routing (BrowserRouter + semua routes)
    ├── index.css              # Global CSS + Tailwind directives
    ├── App.css
    ├── contexts/
    │   └── AuthContext.tsx    # Context autentikasi Supabase (user + session)
    ├── components/
    │   ├── ProtectedRoute.tsx # Guard route — redirect ke /login jika belum auth
    │   └── CurrencyInput.tsx  # Input komponen untuk nilai mata uang (Rupiah)
    ├── layouts/
    │   └── MainLayout.tsx     # Layout utama: sidebar navigasi + area konten
    ├── pages/
    │   ├── Login.tsx              # Halaman login (Supabase Email Auth)
    │   ├── Dashboard.tsx          # Dashboard ringkasan aktivitas & statistik
    │   ├── Funminton.tsx          # Daftar semua sesi Funminton
    │   ├── FunmintonDetail.tsx    # Detail satu sesi Funminton (peserta, biaya)
    │   ├── Padel.tsx              # Daftar semua sesi Padel
    │   ├── PadelDetail.tsx        # Detail satu sesi Padel
    │   ├── Lapkeu.tsx             # Laporan Keuangan cashflow
    │   ├── PublicFunminton.tsx    # Halaman publik sesi Funminton (via token)
    │   └── PublicPadel.tsx        # Halaman publik sesi Padel (via token)
    ├── hooks/                 # Custom React hooks (kosong — logic di pages)
    ├── lib/
    │   └── supabase.ts        # Inisialisasi Supabase client
    ├── types/
    │   └── index.ts           # Semua TypeScript types & interfaces
    └── utils/
        └── format.ts          # Helper: formatCurrency (Rupiah formatter)
```

---

## 🗄️ Data Model (Supabase)

### Tabel `sports_config`

Konfigurasi jenis olahraga yang tersedia di sistem.

| Kolom               | Tipe    | Keterangan                              |
| ------------------- | ------- | --------------------------------------- |
| `sport_type`        | text    | `funminton` / `padel` / dll (primary)   |
| `name`              | text    | Nama tampilan (contoh: "Funminton")     |
| `is_active`         | bool    | Apakah olahraga ini aktif               |
| `default_price`     | numeric | Harga default per orang                 |
| `max_participants`  | int4    | Maks peserta per sesi                   |
| `icon`              | text    | Nama icon Lucide (contoh: "Dumbbell")   |
| `color`             | text    | Warna hex untuk UI card                 |

### Tabel `sessions`

Setiap sesi olahraga yang dijadwalkan.

| Kolom                  | Tipe            | Keterangan                                     |
| ---------------------- | --------------- | ---------------------------------------------- |
| `id`                   | uuid            | Primary key                                    |
| `sport_type`           | text            | FK ke `sports_config.sport_type`               |
| `session_date`         | date            | Tanggal sesi                                   |
| `session_slots`        | jsonb (nullable)| Array slot waktu: `[{time, courts}]`           |
| `venue`                | text            | Nama venue / lokasi                            |
| `max_participants`     | int4            | Maks peserta                                   |
| `price_per_person`     | numeric         | Harga per orang                                |
| `court_cost`           | numeric         | Biaya sewa lapangan                            |
| `other_cost`           | numeric         | Biaya lain-lain                                |
| `other_cost_description`| text (nullable)| Deskripsi biaya lain                           |
| `notes`                | text (nullable) | Catatan tambahan                               |
| `token`                | text            | Token unik untuk halaman publik                |
| `status`               | text            | `open` / `closed` / `done`                    |
| `polling_config`       | jsonb (nullable)| Konfigurasi polling hari sesi berikutnya       |
| `announcement_config`  | jsonb (nullable)| Konfigurasi pengumuman                         |
| `created_at`           | timestamptz     | Waktu dibuat                                   |

### Tabel `participants`

Peserta yang terdaftar di sebuah sesi.

| Kolom                | Tipe            | Keterangan                                   |
| -------------------- | --------------- | -------------------------------------------- |
| `id`                 | uuid            | Primary key                                  |
| `session_id`         | uuid            | FK ke `sessions.id`                          |
| `name`               | text            | Nama peserta                                 |
| `phone`              | text (nullable) | Nomor HP peserta                             |
| `attended`           | bool            | Apakah hadir di sesi                         |
| `payment_status`     | text            | `pending` / `approved` / `rejected`          |
| `payment_amount`     | numeric (nullable)| Jumlah yang dibayar                         |
| `payment_date`       | date (nullable) | Tanggal pembayaran                           |
| `payment_proof_url`  | text (nullable) | URL bukti pembayaran                         |
| `ocr_raw`            | jsonb (nullable)| Hasil OCR bukti transfer (fitur AI)          |
| `ocr_match`          | bool (nullable) | Apakah OCR match dengan data pembayaran      |
| `submitted_at`       | timestamptz     | Waktu mendaftar                              |
| `kritik_saran`       | text (nullable) | Feedback dari peserta                        |
| `polling_hari`       | text (nullable) | Pilihan hari dari polling                    |
| `created_at`         | timestamptz     | Waktu record dibuat                          |

### Tabel `cashflow_entries`

Rekap keuangan (pemasukan & pengeluaran).

| Kolom          | Tipe            | Keterangan                                   |
| -------------- | --------------- | -------------------------------------------- |
| `id`           | uuid            | Primary key                                  |
| `session_id`   | uuid (nullable) | FK ke `sessions.id` (null jika manual)       |
| `sport_type`   | text            | Jenis olahraga                               |
| `entry_date`   | date            | Tanggal transaksi                            |
| `category`     | text            | `income` / `outcome`                         |
| `description`  | text            | Deskripsi transaksi                          |
| `amount`       | numeric         | Jumlah (dalam Rupiah)                        |
| `source`       | text            | `auto` (dari sistem) / `manual`              |
| `notes`        | text (nullable) | Catatan tambahan                             |
| `created_at`   | timestamptz     | Waktu dibuat                                 |

---

## 🔐 Sistem Autentikasi

Autentikasi menggunakan **Supabase Email Auth**.

### Alur Login

```
Pengguna → /login → LoginPage
  → supabase.auth.signInWithPassword({ email, password })
  → Supabase Auth → JWT session
  → AuthContext update (user + session state)
  → Redirect ke /dashboard
```

### AuthContext

`AuthContext` menyimpan state autentikasi global:

```typescript
interface AuthContextType {
  user: User | null;    // Data user Supabase
  session: Session | null; // JWT session aktif
  loading: boolean;    // True saat cek session awal
}
```

Hook: `useAuth()` — gunakan di komponen manapun untuk akses state auth.

### Protected Routes

`ProtectedRoute` memastikan hanya user yang sudah login yang bisa mengakses halaman internal:

```
/dashboard, /funminton, /padel, /lapkeu
  → ProtectedRoute cek session
  → Jika belum login → redirect ke /login
  → Jika sudah login → render halaman
```

---

## 🗺️ Routing

| Route                       | Halaman              | Akses     | Keterangan                              |
| --------------------------- | -------------------- | --------- | --------------------------------------- |
| `/login`                    | `Login`              | 🌐 Publik | Form login email + password             |
| `/f/:token`                 | `PublicFunminton`    | 🌐 Publik | Halaman info sesi Funminton (via token) |
| `/p/:token`                 | `PublicPadel`        | 🌐 Publik | Halaman info sesi Padel (via token)     |
| `/`                         | redirect → `/dashboard` | 🔐 Login | —                                     |
| `/dashboard`                | `Dashboard`          | 🔐 Login  | Ringkasan aktivitas & statistik         |
| `/funminton`                | `Funminton`          | 🔐 Login  | Daftar semua sesi Funminton             |
| `/funminton/sessions/:id`   | `FunmintonDetail`    | 🔐 Login  | Detail sesi + peserta + pembayaran      |
| `/padel`                    | `Padel`              | 🔐 Login  | Daftar semua sesi Padel                 |
| `/padel/sessions/:id`       | `PadelDetail`        | 🔐 Login  | Detail sesi Padel                       |
| `/lapkeu`                   | `Lapkeu`             | 🔐 Login  | Laporan keuangan cashflow               |

### Halaman Publik (via Token)

Setiap sesi memiliki `token` unik yang tersimpan di database. Token ini digunakan untuk membuat URL publik yang bisa dibagikan ke peserta:

- Funminton: `https://your-app.com/f/TOKEN_SESI`
- Padel: `https://your-app.com/p/TOKEN_SESI`

Peserta bisa melihat info sesi, mendaftar, dan upload bukti pembayaran tanpa perlu login.

---

## ⚙️ Environment Variables

Buat file `.env.local` dari template:

```bash
cp .env.example .env.local
```

Isi dengan nilai yang sesuai:

```env
# Wajib — Supabase project credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here

# Opsional — untuk fitur AI (verifikasi pembayaran OCR, dll)
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

**Cara mendapatkan kredensial Supabase:**
1. Login ke [supabase.com](https://supabase.com)
2. Pilih project kamu
3. Buka **Project Settings → API**
4. Copy **Project URL** dan **anon/public key**

**Cara mendapatkan Gemini API Key (opsional):**
1. Buka [aistudio.google.com](https://aistudio.google.com)
2. Klik **Get API Key**

> ⚠️ `.env.local` sudah di-gitignore dan **tidak boleh di-commit** ke repository.

---

## 🚀 Cara Menjalankan (Development)

### Prasyarat

- **Node.js** v18 atau lebih baru
- **npm** v9 atau lebih baru

```bash
node --version   # cek versi Node
npm --version    # cek versi npm
```

### Langkah Setup

```bash
# 1. Masuk ke direktori project
cd semejamoves-web-apps

# 2. Install semua dependencies
npm install

# 3. Buat file environment
cp .env.example .env.local
# → Edit .env.local, isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY

# 4. Jalankan dev server
npm run dev
```

Aplikasi berjalan di: **http://localhost:5173**

> 💡 Jika port 5173 sudah dipakai (misalnya oleh `semejakerja-web-apps`), Vite otomatis menggunakan port berikutnya (5174, 5175, dst).

---

## 👤 Setup Akun Admin

Karena ini aplikasi internal, akun user harus dibuat secara manual di Supabase:

1. Buka **Supabase Dashboard** → pilih project
2. Buka menu **Authentication → Users**
3. Klik **"Invite user"** atau **"Add user"**
4. Masukkan email dan password
5. Gunakan kredensial tersebut untuk login di aplikasi

---

## 🏗️ Build untuk Produksi

```bash
# Compile TypeScript + bundle Vite
npm run build

# Hasilnya ada di folder dist/
# Preview build produksi secara lokal
npm run preview
# ➜ Berjalan di http://localhost:4173
```

---

## 📦 Perintah npm Lengkap

| Perintah          | Fungsi                                      |
| ----------------- | ------------------------------------------- |
| `npm install`     | Install semua dependencies                  |
| `npm run dev`     | Jalankan dev server (port 5173 / 5174)      |
| `npm run build`   | Build produksi ke folder `dist/`            |
| `npm run preview` | Preview hasil build (port 4173)             |
| `npm run lint`    | Jalankan ESLint                             |

---

## 📊 Fitur Detail

### Dashboard (`/dashboard`)

- **Summary cards**: jumlah sesi & total income bulan ini
- **Sports grid**: kartu per jenis olahraga (Funminton, Padel, dll) — klik untuk navigasi ke list sesi
- Olahraga yang belum aktif ditampilkan dengan ikon gembok

### Funminton / Padel (`/funminton`, `/padel`)

- Daftar semua sesi dengan tanggal, venue, dan status (`open`/`closed`/`done`)
- Tombol buat sesi baru
- Klik sesi untuk masuk ke halaman detail

### Detail Sesi (`/funminton/sessions/:id`, `/padel/sessions/:id`)

- Info lengkap sesi: tanggal, venue, harga, maks peserta
- **Daftar peserta**: nama, status kehadiran, status pembayaran
- **Manajemen pembayaran**: approve / reject pembayaran peserta
- **Preview bukti transfer**: lihat gambar bukti yang diupload peserta
- **Link public**: salin URL token untuk dibagikan ke peserta

### Laporan Keuangan (`/lapkeu`)

- Tabel semua `cashflow_entries` (income & outcome)
- Filter per jenis olahraga dan periode waktu
- Summary total pemasukan vs pengeluaran

### Halaman Publik (`/f/:token`, `/p/:token`)

- Info sesi (tanggal, venue, harga, slot waktu)
- Form daftar: nama + nomor HP
- Upload bukti pembayaran
- Form polling hari sesi berikutnya
- Feedback (kritik & saran)

---

## 🔧 Troubleshooting

### Tidak bisa login
- Pastikan akun sudah dibuat di Supabase Auth
- Pastikan Email Auth diaktifkan: **Supabase Dashboard → Auth → Providers → Email** → Enable

### Data tidak muncul setelah login
- Cek Supabase RLS (Row Level Security) — pastikan policy mengizinkan user yang login untuk membaca data
- Cek error di konsol browser (F12 → Console)

### Error "supabase is not defined"
- Pastikan `.env.local` sudah dibuat dan terisi
- Restart dev server: `Ctrl+C` lalu `npm run dev` lagi

### Port sudah dipakai
```bash
# Gunakan port custom
npm run dev -- --port 5200
```

---

## 🌐 Deployment

### Vercel (Rekomendasi)

```bash
# Deploy dari folder project
npx vercel

# Set environment variables di Vercel Dashboard:
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GEMINI_API_KEY
```

### Netlify

```
Build command   : npm run build
Publish directory: dist
Environment     : set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
```

---

_© 2026 Semeja Kerja — Komunitas WFC Purwokerto 🏙️_
