# 🪑 semejakerja-landingpage

> Landing page publik komunitas **Semeja Kerja** — Komunitas WFC (Work From Cafe) Bareng Strangers di Purwokerto.

---

## 📋 Deskripsi

Halaman web statis yang berfungsi sebagai wajah publik komunitas Semeja Kerja. Dibangun dengan HTML murni + Tailwind CSS via CDN sehingga **tidak memerlukan proses build atau npm install** — cukup buka file `index.html` di browser.

### Brand Colors

| Nama         | Hex       | Fungsi                                   |
| ------------ | --------- | ---------------------------------------- |
| `primary`    | `#3D155F` | Ungu tua — warna brand utama             |
| `secondary`  | `#B5A566` | Krem gelap — digunakan minimal           |
| `accent`     | `#F0C733` | Kuning cerah — CTA & highlight           |
| `text-light` | `#F0E6D0` | Teks terang di atas background primary   |
| `background` | `#F9FAFB` | Abu-abu sangat terang — latar belakang   |

---

## 🛠️ Tech Stack

| Teknologi          | Keterangan                                          |
| ------------------ | --------------------------------------------------- |
| HTML5              | Struktur halaman semantik                           |
| Tailwind CSS (CDN) | Styling via CDN — tidak perlu instalasi npm         |
| Vanilla JavaScript | Animasi ringan & interaktivitas (inline di HTML)    |
| Google Fonts       | Font `Inter` — dimuat otomatis via Tailwind config  |

---

## 📁 Struktur File

```
semejakerja-landingpage/
├── index.html              # ← Satu-satunya file yang perlu dibuka
└── assets/
    ├── bg-hero.jpeg        # Background gambar hero section (parallax)
    ├── icons/
    │   └── ic-tiktok.png   # Icon TikTok untuk footer
    ├── logo-kafe/          # Logo kafe-kafe mitra
    │   ├── duanja.png
    │   ├── the-soeds.png
    │   ├── meatboss.png
    │   ├── ruang-temu.png
    │   └── atnine.png
    └── logos/              # Logo brand Semeja Kerja
        ├── semejakerja-logo.png       # Logo full (horizontal)
        └── semejakerja-only-logo.png  # Logo icon saja (favicon)
```

---

## 📄 Struktur Halaman

Halaman ini terdiri dari 4 section utama:

### 1. Header (Sticky Navbar)
- Logo Semeja Kerja di kiri
- Link "Tentang Kami" navigasi ke `#about`
- CTA button "Kafe Pilihan" navigasi ke `#mitra`

### 2. Hero Section
- Background parallax dengan overlay ungu (`bg-hero.jpeg`)
- Tagline: *#WFCBarengStrangers*
- Headline utama: "WFC Sendirian? Coba WFC Bareng Strangers!"
- CTA button → link ke Linktree komunitas

### 3. About Section (`#about`)
3 kartu alasan bergabung WFC:
1. **Perluas Jaringan Profesional** — networking dengan stranger
2. **Peningkatan Fokus & Motivasi** — efek co-working
3. **Eksplorasi Kafe Pilihan** — kurasi kafe terbaik Purwokerto

### 4. Mitra Section (`#mitra`)
- Grid logo kafe-kafe mitra (hover effect: grayscale → warna)
- Kafe yang ditampilkan: Duanja, The Soeds, Meatboss, Ruang Temu, At Nine
- CTA blok kemitraan → link WhatsApp tim

### 5. Footer
- Logo Semeja Kerja
- Link sosial media (Instagram + TikTok)
- Copyright notice

---

## ✨ Fitur & Animasi

| Fitur                | Detail                                                              |
| -------------------- | ------------------------------------------------------------------- |
| Parallax Hero        | `background-attachment: fixed` pada hero section                   |
| Hover Logo Mitra     | Grayscale + opacity 60% → full color saat hover, `translateY(-5px)` |
| Button Slide Effect  | Latar belakang menyapu dari kiri saat hover (`.btn-slide` class)   |
| Smooth Scroll        | `scroll-smooth` pada `<html>` — navigasi anchor mulus              |
| Sticky Header        | `sticky top-0 z-20` — header tetap terlihat saat scroll             |
| Responsive Layout    | Grid Tailwind responsive: `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` |

---

## 🚀 Cara Menjalankan

### Cara 1 — Buka Langsung di Browser (Paling Simple)

```bash
# Di macOS
open index.html

# Di Linux
xdg-open index.html

# Di Windows
start index.html
```

Atau **drag & drop** file `index.html` ke browser (Chrome, Firefox, Safari, dll).

> ✅ Tidak perlu `npm install`, tidak perlu server, tidak perlu koneksi internet (kecuali Tailwind CDN + Google Fonts).

---

### Cara 2 — Jalankan dengan Local Server (Opsional)

Berguna agar bisa menggunakan fitur yang memerlukan server (misalnya Service Worker, CORS, dll):

```bash
cd semejakerja-landingpage

# Menggunakan npx serve (tidak perlu install global)
npx serve .

# Atau dengan Python (jika Python terinstall)
python3 -m http.server 8080

# Atau dengan PHP (jika PHP terinstall)
php -S localhost:8080
```

Akses di: `http://localhost:3000` (serve) atau `http://localhost:8080` (Python/PHP)

---

### Cara 3 — VS Code Live Server

1. Install extension **Live Server** di VS Code
2. Klik kanan `index.html` → **"Open with Live Server"**
3. Browser otomatis terbuka dan auto-reload saat ada perubahan

---

## 🔗 External Links yang Digunakan

| Tujuan              | URL                                                      |
| ------------------- | -------------------------------------------------------- |
| Tailwind CSS CDN    | `https://cdn.tailwindcss.com`                            |
| Gabung Komunitas    | `https://linktr.ee/semejakerja`                          |
| WhatsApp Kemitraan  | `https://wa.me/6281325392452`                            |
| Instagram           | `https://instagram.com/semejakerja`                      |
| TikTok              | `https://www.tiktok.com/@semejakerja`                    |

---

## 🎨 Mengedit Konten

Semua konten ada di dalam satu file `index.html`. Berikut lokasi bagian yang sering diubah:

| Yang ingin diubah        | Cari di `index.html`                         |
| ------------------------ | -------------------------------------------- |
| Warna brand              | Blok `tailwind.config` di `<script>` tag     |
| Teks hero / tagline      | Section `class="py-24 md:py-36"` (hero)      |
| Kafe mitra               | Section `id="mitra"` — div `.logo-item`      |
| Link CTA / WhatsApp      | `href="https://wa.me/..."` atau Linktree URL |
| Link sosial media footer | Section `<footer>` — anchor tags             |
| Logo/gambar              | Folder `assets/` — ganti file sesuai nama    |

### Menambah Kafe Mitra Baru

Di dalam section `id="mitra"`, tambahkan div baru:

```html
<div class="logo-item">
    <img class="logo-img" 
         src="assets/logo-kafe/nama-kafe.png" 
         alt="Logo Nama Kafe"
         onerror="this.onerror=null; this.src='https://placehold.co/150x80/WARNA/ffffff?text=NAMA+KAFE';">
</div>
```

> 💡 Sertakan `onerror` fallback agar tidak muncul gambar rusak jika file tidak ditemukan.

---

## 🌐 Deployment

Karena ini file statis, bisa di-deploy ke mana saja:

### GitHub Pages
```bash
# Pastikan index.html ada di root repo
# Aktifkan GitHub Pages di Settings → Pages → Source: main branch
```

### Netlify (Drag & Drop)
1. Buka [netlify.com](https://netlify.com)
2. Drag & drop folder `semejakerja-landingpage/` ke dashboard
3. Selesai — dapat URL otomatis

### Vercel
```bash
npx vercel --cwd semejakerja-landingpage
```

---

## ⚠️ Catatan Penting

- **Tailwind via CDN** hanya cocok untuk produksi dengan traffic rendah. Untuk optimasi, pertimbangkan migrate ke Tailwind CLI dengan PurgeCSS.
- File gambar di `assets/` harus ada agar tampil benar. Jika tidak ada, fallback `onerror` akan menampilkan gambar placeholder dari `placehold.co`.
- Font `Inter` dimuat dari Google Fonts (memerlukan koneksi internet).

---

_© 2026 Semeja Kerja — Komunitas WFC Purwokerto 🏙️_
