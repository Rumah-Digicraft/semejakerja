# 🪑 Semeja Kerja — Monorepo

> **Komunitas WFC (Work From Cafe) Bareng Strangers di Purwokerto**
> Platform digital ekosistem Semeja Kerja — mulai dari landing page komunitas, peta kafe interaktif, hingga dashboard manajemen internal olahraga.

---

## 📦 Struktur Monorepo

```
semejakerja/
├── semejakerja-landingpage/    # Landing page komunitas (HTML + Tailwind CDN)
├── semejakerja-web-apps/       # Peta kafe interaktif + Admin Panel (React + Vite)
└── semejamoves-web-apps/       # Dashboard manajemen olahraga internal (React + Vite)
```

---

## 🗂️ Project 1 — `semejakerja-landingpage`

### Deskripsi

Landing page publik komunitas **Semeja Kerja**. Menampilkan informasi komunitas, alasan bergabung WFC, kafe-kafe mitra pilihan di Purwokerto, dan CTA untuk bergabung.

### Tech Stack

| Teknologi          | Keterangan                              |
| ------------------ | --------------------------------------- |
| HTML5              | Struktur halaman                        |
| Tailwind CSS (CDN) | Styling via CDN, tidak perlu build step |
| Vanilla JavaScript | Animasi & interaktivitas ringan         |

### Fitur

- 🎯 Hero section dengan parallax background
- 📍 Section kafe mitra (Duanja, The Soeds, Meatboss, Ruang Temu, At Nine)
- 📱 Responsive & mobile-friendly
- 🔗 CTA link ke Linktree & WhatsApp
- 📲 Link sosial media (Instagram & TikTok)

### Struktur File

```
semejakerja-landingpage/
├── index.html         # Halaman utama (satu file, langsung buka di browser)
└── assets/
    ├── bg-hero.jpeg   # Gambar latar belakang hero
    ├── icons/         # Icon-icon UI
    ├── logo-kafe/     # Logo kafe-kafe mitra
    └── logos/         # Logo Semeja Kerja
```

### Cara Menjalankan

```bash
cd semejakerja-landingpage

# Buka langsung di browser (tidak perlu server)
open index.html

# Atau jalankan dengan live server sederhana (opsional)
npx serve .
```

> ⚠️ File ini **tidak** memerlukan `npm install` atau build step apapun. Cukup buka `index.html` di browser.

---

## 🗂️ Project 2 — `semejakerja-web-apps`

### Deskripsi

Aplikasi web interaktif berupa **peta kafe** se-Purwokerto dengan filter canggih, detail kafe, dan panel admin untuk pengelola Semeja Kerja.

### Tech Stack

| Teknologi             | Versi | Keterangan                |
| --------------------- | ----- | ------------------------- |
| React                 | 19    | Framework utama           |
| TypeScript            | ~6.0  | Type safety               |
| Vite                  | 8     | Build tool & dev server   |
| Tailwind CSS          | v4    | Styling                   |
| React Leaflet         | 5     | Peta interaktif           |
| react-leaflet-cluster | 4     | Clustering marker di peta |
| Supabase              | 2     | Backend (database + auth) |
| TanStack Query        | 5     | Data fetching & caching   |
| React Router          | v7    | Client-side routing       |
| Lucide React          | —     | Icon library              |

### Fitur Utama

- 🗺️ **Peta Interaktif** — Tampilkan semua kafe di Purwokerto dengan marker & clustering
- 🔍 **Filter Canggih** — Filter by fasilitas, vibes rating, buka malam, mitra Semeja Kerja
- 📋 **Detail Kafe** — Info lengkap (fasilitas, jam buka, foto, rating vibes)
- 🔐 **Admin Panel** (`/cafe-bos-semeja`) — Kelola data kafe, moderasi, dan dashboard statistik
- ➕ **Kontribusi Kafe** — Form untuk menambah/merekomendasikan kafe baru

### Struktur Source Code

```
src/
├── App.tsx              # Root routing (MapApp + AdminPanel)
├── components/
│   ├── Header.tsx       # Navbar atas dengan tombol filter & jumlah kafe
│   ├── Sidebar.tsx      # Panel filter (fasilitas, vibes, jam buka)
│   ├── MapView.tsx      # Komponen peta utama (Leaflet)
│   ├── MapMarker.tsx    # Custom marker peta
│   ├── CafeModal.tsx    # Modal detail kafe
│   ├── FooterBanner.tsx # Banner footer peta
│   ├── CafesLoadingOverlay.tsx  # Loading & error state
│   ├── admin/           # Komponen UI khusus admin
│   └── contribute/      # Komponen form kontribusi kafe
├── pages/admin/
│   ├── AdminLogin.tsx   # Halaman login admin
│   ├── AdminPanel.tsx   # Shell panel admin + nested routes
│   ├── CafesPage.tsx    # CRUD data kafe
│   ├── ModerasiPage.tsx # Moderasi kafe yang direkomendasikan
│   └── DashboardPage.tsx # Statistik & ringkasan data
├── hooks/
│   └── useCafes.ts      # Custom hook fetch data kafe dari Supabase
├── lib/
│   └── supabase.ts      # Inisialisasi Supabase client
├── types/
│   └── cafe.ts          # TypeScript types (Cafe, FilterState, dll)
└── data/                # Data statis / seed
```

### Struktur Halaman (Routes)

| Route                        | Halaman                               | Akses     |
| ---------------------------- | ------------------------------------- | --------- |
| `/`                          | Peta utama dengan semua kafe & filter | 🌐 Publik |
| `/cafe-bos-semeja`           | Admin Panel — redirect ke login       | 🔐 Admin  |
| `/cafe-bos-semeja/login`     | Halaman login admin                   | 🌐 Publik |
| `/cafe-bos-semeja/cafes`     | Manajemen & CRUD data kafe            | 🔐 Admin  |
| `/cafe-bos-semeja/moderasi`  | Moderasi kafe yang diusulkan          | 🔐 Admin  |
| `/cafe-bos-semeja/dashboard` | Dashboard statistik admin             | 🔐 Admin  |

### Setup & Menjalankan

```bash
cd semejakerja-web-apps

# 1. Install dependencies
npm install

# 2. Buat file environment
cp .env.local.example .env.local
```

Edit `.env.local` dan isi dengan kredensial Supabase kamu:

```env
# Dapatkan dari: Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

```bash
# 3. Jalankan dev server
npm run dev
# ➜ Aplikasi berjalan di http://localhost:5173
```

### Build Produksi

```bash
npm run build     # Output ke folder dist/ (TypeScript compile + Vite bundle)
npm run preview   # Preview build produksi secara lokal
```

### Data Kafe

Di root folder `semejakerja-web-apps` tersedia file CSV data kafe:

- `cafes_purwokerto.csv` — Data mentah kafe-kafe Purwokerto
- `cafes_ready_for_supabase.csv` — Data yang sudah diformat siap import ke Supabase

> 💡 Nilai Supabase bisa didapat dari: **Supabase Dashboard → Project Settings → API**

---

## 🗂️ Project 3 — `semejamoves-web-apps`

### Deskripsi

Aplikasi internal manajemen **olahraga komunitas Semeja Kerja** — khususnya untuk mengelola sesi **Funminton** (badminton santai) dan **Padel**. Termasuk laporan keuangan dan halaman publik sharing sesi.

### Tech Stack

| Teknologi    | Versi | Keterangan                |
| ------------ | ----- | ------------------------- |
| React        | 19    | Framework utama           |
| TypeScript   | ~6.0  | Type safety               |
| Vite         | 8     | Build tool & dev server   |
| Tailwind CSS | v4    | Styling                   |
| Supabase     | 2     | Backend (database + auth) |
| React Router | v7    | Client-side routing       |
| Lucide React | —     | Icon library              |
| Gemini API   | —     | Fitur AI (opsional)       |

### Fitur Utama

- 🔐 **Autentikasi** — Login sistem dengan protected routes (via Supabase Auth)
- 📊 **Dashboard** — Ringkasan aktivitas olahraga komunitas
- 🏸 **Funminton** — Manajemen sesi badminton santai (list & detail per sesi)
- 🎾 **Padel** — Manajemen sesi padel (list & detail per sesi)
- 💰 **Laporan Keuangan** — Rekap & ringkasan finansial sesi olahraga
- 🌐 **Public Pages** — Halaman publik via token unik untuk sharing sesi ke luar (`/f/:token`, `/p/:token`)
- 🤖 **Fitur AI** — Integrasi Gemini API (opsional)

### Struktur Source Code

```
src/
├── App.tsx              # Root BrowserRouter + semua routes
├── contexts/
│   └── AuthContext.tsx  # Context autentikasi (Supabase session)
├── components/
│   └── ProtectedRoute.tsx  # HOC guard untuk protected routes
├── layouts/
│   └── MainLayout.tsx   # Layout utama (sidebar + konten)
├── pages/
│   ├── Login.tsx           # Halaman login
│   ├── Dashboard.tsx       # Dashboard ringkasan aktivitas
│   ├── Funminton.tsx       # Daftar semua sesi Funminton
│   ├── FunmintonDetail.tsx # Detail satu sesi Funminton (peserta, biaya, dll)
│   ├── Padel.tsx           # Daftar semua sesi Padel
│   ├── PadelDetail.tsx     # Detail satu sesi Padel
│   ├── Lapkeu.tsx          # Laporan Keuangan
│   ├── PublicFunminton.tsx # Halaman publik sesi Funminton (by token)
│   └── PublicPadel.tsx     # Halaman publik sesi Padel (by token)
├── hooks/               # Custom hooks (data fetching, dll)
├── lib/
│   └── supabase.ts      # Inisialisasi Supabase client
├── types/               # TypeScript type definitions
└── utils/               # Helper functions
```

### Struktur Halaman (Routes)

| Route                     | Halaman                      | Akses     |
| ------------------------- | ---------------------------- | --------- |
| `/login`                  | Halaman login                | 🌐 Publik |
| `/f/:token`               | Detail sesi Funminton publik | 🌐 Publik |
| `/p/:token`               | Detail sesi Padel publik     | 🌐 Publik |
| `/`                       | Redirect ke `/dashboard`     | 🔐 Login  |
| `/dashboard`              | Dashboard utama              | 🔐 Login  |
| `/funminton`              | List sesi Funminton          | 🔐 Login  |
| `/funminton/sessions/:id` | Detail sesi Funminton        | 🔐 Login  |
| `/padel`                  | List sesi Padel              | 🔐 Login  |
| `/padel/sessions/:id`     | Detail sesi Padel            | 🔐 Login  |
| `/lapkeu`                 | Laporan Keuangan             | 🔐 Login  |

### Setup & Menjalankan

```bash
cd semejamoves-web-apps

# 1. Install dependencies
npm install

# 2. Buat file environment
cp .env.example .env.local
```

Edit `.env.local` dan isi dengan nilai yang sesuai:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here   # Opsional, untuk fitur AI
```

```bash
# 3. Jalankan dev server
npm run dev
# ➜ Aplikasi berjalan di http://localhost:5173
```

### Build Produksi

```bash
npm run build     # Output ke folder dist/ (TypeScript compile + Vite bundle)
npm run preview   # Preview build produksi secara lokal
```

> 💡 Login menggunakan akun Supabase Auth yang sudah didaftarkan sebelumnya oleh admin.

---

## 🚀 Quick Start — Semua Project Sekaligus

Buka 3 terminal terpisah:

```bash
# Terminal 1 — Landing Page (port bebas / buka langsung)
cd semejakerja-landingpage && npx serve .

# Terminal 2 — Peta Kafe (port 5173)
cd semejakerja-web-apps && npm install && npm run dev

# Terminal 3 — Semeja Moves (port 5174 atau sesuai Vite)
cd semejamoves-web-apps && npm install && npm run dev
```

> ⚠️ Pastikan file `.env.local` sudah diisi dengan benar sebelum menjalankan Project 2 & 3.

---

## 🔑 Ringkasan Environment Variables

| Project                | Variable                 | Wajib | Keterangan                       |
| ---------------------- | ------------------------ | ----- | -------------------------------- |
| `semejakerja-web-apps` | `VITE_SUPABASE_URL`      | ✅    | URL project Supabase             |
| `semejakerja-web-apps` | `VITE_SUPABASE_ANON_KEY` | ✅    | Anon/public key Supabase         |
| `semejamoves-web-apps` | `VITE_SUPABASE_URL`      | ✅    | URL project Supabase             |
| `semejamoves-web-apps` | `VITE_SUPABASE_ANON_KEY` | ✅    | Anon/public key Supabase         |
| `semejamoves-web-apps` | `VITE_GEMINI_API_KEY`    | ❌    | API key Google Gemini (opsional) |

**Cara dapat kredensial Supabase:**

1. Buka [supabase.com](https://supabase.com) dan login
2. Pilih project kamu
3. Buka **Project Settings → API**
4. Copy **Project URL** dan **anon/public key**

---

## 🔗 Link Penting

| Platform                | Link                                                   |
| ----------------------- | ------------------------------------------------------ |
| 🌐 Instagram            | [@semejakerja](https://instagram.com/semejakerja)      |
| 🎵 TikTok               | [@semejakerja](https://www.tiktok.com/@semejakerja)    |
| 🌿 Linktree             | [linktr.ee/semejakerja](https://linktr.ee/semejakerja) |
| 📱 WhatsApp (Kemitraan) | [Hubungi Tim](https://wa.me/6281325392452)             |

---

## 👥 Kontribusi

Proyek ini dikelola secara internal oleh tim **Rumah Digicraft** untuk komunitas **Semeja Kerja** Purwokerto.

---

_© 2026 Semeja Kerja — Komunitas WFC Purwokerto 🏙️_
