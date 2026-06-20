# 🗺️ semejakerja-web-apps

> Aplikasi web interaktif **Peta Kafe Purwokerto** + Admin Panel untuk pengelola Semeja Kerja.

---

## 📋 Deskripsi

Aplikasi React yang menampilkan peta interaktif seluruh kafe di Purwokerto. Pengguna bisa menjelajahi kafe, memfilter berdasarkan fasilitas dan vibes, melihat detail kafe, serta merekomendasikan kafe baru. Pengelola Semeja Kerja bisa masuk ke Admin Panel untuk mengelola data kafe dan memoderasi kontribusi dari komunitas.

---

## 🛠️ Tech Stack

| Teknologi             | Versi  | Keterangan                       |
| --------------------- | ------ | -------------------------------- |
| React                 | 19     | UI framework utama               |
| TypeScript            | ~6.0   | Type safety end-to-end           |
| Vite                  | 8      | Dev server & bundler             |
| Tailwind CSS          | v4     | Utility-first styling            |
| React Leaflet         | 5      | Komponen peta berbasis Leaflet   |
| react-leaflet-cluster | 4      | Clustering marker di peta        |
| Supabase JS           | 2      | Backend: database + auth         |
| TanStack Query        | 5      | Data fetching, caching, refetch  |
| React Router DOM      | v7     | Client-side routing              |
| Lucide React          | latest | Icon library                     |

---

## 📁 Struktur Project

```
semejakerja-web-apps/
├── .env.local.example          # Template environment variables
├── .env.local                  # ← Buat dari template ini (tidak di-commit)
├── .gitignore
├── index.html                  # HTML entry point (Vite)
├── vite.config.ts              # Konfigurasi Vite + plugins
├── tsconfig.json               # TypeScript config
├── package.json
├── cafes_purwokerto.csv        # Data mentah kafe se-Purwokerto
├── cafes_ready_for_supabase.csv # Data siap import ke Supabase
├── public/                     # Aset statis (favicon, dll)
├── dist/                       # Output build produksi (di-gitignore)
└── src/
    ├── main.tsx                # Entry point React + QueryClient provider
    ├── App.tsx                 # Root routing
    ├── index.css               # Global CSS + Tailwind directives
    ├── App.css
    ├── components/
    │   ├── Header.tsx          # Navbar — judul + tombol filter + counter
    │   ├── Sidebar.tsx         # Panel filter kafe (kiri)
    │   ├── MapView.tsx         # Komponen peta utama (Leaflet)
    │   ├── MapMarker.tsx       # Custom marker pin di peta
    │   ├── CafeModal.tsx       # Modal detail kafe (klik marker)
    │   ├── CafesLoadingOverlay.tsx # Overlay loading & error state
    │   ├── FooterBanner.tsx    # Banner info di bawah peta
    │   ├── admin/              # Komponen UI khusus halaman admin
    │   └── contribute/         # Komponen form kontribusi kafe baru
    ├── pages/
    │   └── admin/
    │       ├── AdminLogin.tsx  # Halaman login admin
    │       ├── AdminPanel.tsx  # Shell layout + nested routes admin
    │       ├── CafesPage.tsx   # CRUD data kafe (tabel + form edit)
    │       ├── ModerasiPage.tsx # Moderasi submisi dari komunitas
    │       └── DashboardPage.tsx # Statistik & summary data
    ├── hooks/
    │   ├── useCafes.ts         # Fetch & cache semua data kafe
    │   ├── useCafeReviews.ts   # Fetch ulasan kafe
    │   ├── useContribute.ts    # Submit kafe baru / edit
    │   ├── useModerations.ts   # Fetch & aksi moderasi
    │   └── useAdminAuth.ts     # State autentikasi admin
    ├── lib/
    │   ├── supabaseClient.ts   # Inisialisasi Supabase client
    │   ├── queryClient.ts      # Konfigurasi TanStack Query client
    │   └── openHours.ts        # Parser jam buka kafe → isOpenNow, isOpenNight
    ├── types/
    │   └── cafe.ts             # Semua TypeScript types & interfaces
    └── data/                   # Data statis / seed lokal
```

---

## 🗄️ Data Model (Supabase)

### Tabel `cafes`

| Kolom            | Tipe            | Keterangan                              |
| ---------------- | --------------- | --------------------------------------- |
| `id`             | uuid            | Primary key                             |
| `name`           | text            | Nama kafe                               |
| `address`        | text            | Alamat                                  |
| `lat`            | float8          | Latitude                                |
| `lng`            | float8          | Longitude                               |
| `location`       | geometry        | PostGIS WKB (tidak digunakan langsung)  |
| `rating`         | numeric         | Rating rata-rata (dari Google Maps dll) |
| `total_reviews`  | int4            | Jumlah total ulasan                     |
| `price_level`    | int4            | 0=unknown, 1=<30rb, 2=30-60rb           |
| `phone`          | text (nullable) | Nomor telepon                           |
| `website`        | text (nullable) | Website kafe                            |
| `is_partner`     | bool            | Apakah mitra Semeja Kerja (legacy)      |
| `tier`           | text (nullable) | `basic` / `verified` / `partner` / `sponsor` |
| `discount_value` | int4            | Nilai diskon untuk member               |
| `open_hours`     | text (nullable) | String jam buka (format Google)         |
| `weekday_text`   | text (nullable) | Jam buka per hari (fallback)            |
| `top_review`     | text (nullable) | Ulasan terbaik                          |
| `created_at`     | timestamptz     | Waktu dibuat                            |

### Tier Kafe → Kategori → Warna Marker

| Tier       | Kategori    | Warna Marker |
| ---------- | ----------- | ------------ |
| `sponsor`  | `sponsored` | `#F59E0B` Amber/Gold |
| `verified` | `verified`  | `#7c3aed` Purple-700 |
| `partner`  | `regular`   | `#a855f7` Purple-500 |
| `basic`    | `regular`   | `#a855f7` Purple-500 |

### Tabel Kontribusi

| Tabel              | Fungsi                                          |
| ------------------ | ----------------------------------------------- |
| `cafe_submissions` | Pengajuan kafe baru dari komunitas              |
| `cafe_edits`       | Saran edit data kafe yang sudah ada             |
| `cafe_reviews`     | Ulasan rating/vibes/wifi dari komunitas         |
| `cafe_photos`      | Foto kafe yang disubmit komunitas               |

Status kontribusi: `pending` → `approved` / `rejected`

---

## 🗺️ Routing

| Route                         | Komponen         | Akses         | Keterangan                        |
| ----------------------------- | ---------------- | ------------- | --------------------------------- |
| `/`                           | `MapApp`         | 🌐 Publik     | Peta utama + filter               |
| `/cafe-bos-semeja/*`          | `AdminPanel`     | 🔐 Admin only | Shell panel admin                 |
| `/cafe-bos-semeja/login`      | `AdminLogin`     | 🌐 Publik     | Login admin via Supabase Auth     |
| `/cafe-bos-semeja/cafes`      | `CafesPage`      | 🔐 Admin only | Daftar + CRUD data kafe           |
| `/cafe-bos-semeja/moderasi`   | `ModerasiPage`   | 🔐 Admin only | Moderasi submisi komunitas        |
| `/cafe-bos-semeja/dashboard`  | `DashboardPage`  | 🔐 Admin only | Statistik & summary               |

> Admin login menggunakan **Supabase Email Auth**. Akun admin harus dibuat terlebih dahulu di Supabase Dashboard.

---

## ⚙️ Environment Variables

Buat file `.env.local` dari template:

```bash
cp .env.local.example .env.local
```

Isi dengan kredensial Supabase kamu:

```env
# Dapatkan dari: Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

> ⚠️ File `.env.local` sudah di-gitignore dan **tidak boleh di-commit** ke repository.

---

## 🚀 Cara Menjalankan (Development)

### Prasyarat

Pastikan sudah terinstall:
- **Node.js** v18 atau lebih baru
- **npm** v9 atau lebih baru

Cek versi:
```bash
node --version   # v18.x.x atau lebih
npm --version    # v9.x.x atau lebih
```

### Langkah Setup

```bash
# 1. Masuk ke direktori project
cd semejakerja-web-apps

# 2. Install semua dependencies
npm install

# 3. Buat file environment
cp .env.local.example .env.local
# → Edit .env.local, isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

# 4. Jalankan dev server
npm run dev
```

Aplikasi akan berjalan di: **http://localhost:5173**

Dev server mendukung **Hot Module Replacement (HMR)** — perubahan kode langsung terlihat di browser tanpa refresh penuh.

---

## 🏗️ Build untuk Produksi

```bash
# Compile TypeScript + bundle dengan Vite
npm run build

# Output tersimpan di folder dist/
# Preview build produksi secara lokal
npm run preview
# ➜ Berjalan di http://localhost:4173
```

### Struktur Output `dist/`

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js     # Bundle JavaScript (terminify)
│   └── index-[hash].css    # Bundle CSS (terminify)
└── ...
```

---

## 🔍 Linting

```bash
# Jalankan ESLint untuk cek kualitas kode
npm run lint
```

---

## 📦 Perintah npm Lengkap

| Perintah         | Fungsi                                         |
| ---------------- | ---------------------------------------------- |
| `npm install`    | Install semua dependencies                     |
| `npm run dev`    | Jalankan dev server (port 5173)                |
| `npm run build`  | Build produksi ke folder `dist/`               |
| `npm run preview`| Preview hasil build (port 4173)                |
| `npm run lint`   | Jalankan ESLint                                |

---

## 🗂️ Data Kafe CSV

Di root project tersedia file CSV yang bisa digunakan untuk:

### `cafes_purwokerto.csv`
Data mentah hasil scraping kafe-kafe di Purwokerto. Berisi nama, alamat, koordinat, rating, dll.

### `cafes_ready_for_supabase.csv`
Data yang sudah dibersihkan dan diformat sesuai schema tabel `cafes` di Supabase.

**Cara import ke Supabase:**
1. Buka Supabase Dashboard → pilih project
2. Buka menu **Table Editor** → pilih tabel `cafes`
3. Klik **Import data** → upload `cafes_ready_for_supabase.csv`

---

## 🔧 Troubleshooting

### Peta tidak muncul / blank
- Pastikan koneksi internet aktif (Leaflet tile dari OpenStreetMap)
- Cek konsol browser untuk error Supabase

### Error "Invalid API key"
- Pastikan `.env.local` sudah diisi dengan benar
- Restart dev server setelah mengubah `.env.local`

### Kafe tidak muncul di peta
- Cek tabel `cafes` di Supabase — pastikan ada data
- Pastikan kolom `lat` dan `lng` terisi (tidak null)

### Admin tidak bisa login
- Pastikan akun sudah dibuat di Supabase Dashboard → **Authentication → Users**
- Cek apakah email provider diaktifkan di Supabase Auth settings

---

## 🌐 Deployment

### Vercel (Rekomendasi)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy dari folder project
vercel

# Atur environment variables di Vercel Dashboard:
# VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
```

### Netlify

```bash
# Build command: npm run build
# Publish directory: dist
# Set environment variables di Netlify Dashboard
```

---

_© 2026 Semeja Kerja — Komunitas WFC Purwokerto 🏙️_
