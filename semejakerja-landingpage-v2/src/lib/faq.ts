import type { Faq } from "./schema";

// Single source for the visible FAQ section AND the FAQPage JSON-LD.
// Google requires the markup to match the on-page text exactly — edit here only.

export const faqIntro =
  "Komunitas ini dibikin supaya teman-teman yang kerjanya fleksibel, sering WFC, atau suka belajar di cafe bisa dapet Teman Semeja alias temen produktif. Jadi kalau lagi mau WFC dan males sendirian, bisa dapet temen dari sini — plus referensi cafe yang cocok buat WFC.";

export const homeFaqs: Faq[] = [
  {
    q: "Apa itu Semeja Kerja?",
    a: "Semeja Kerja adalah komunitas WFC (Work From Cafe) di Purwokerto untuk orang yang kerjanya fleksibel, sering WFC, atau suka belajar di cafe. Di sini kamu dapat Teman Semeja — teman produktif — plus referensi cafe yang cocok buat WFC. Sudah 500+ member bergabung.",
  },
  {
    q: "Acaranya ngapain aja?",
    a: "Ini sesi produktif bareng! Mau nugas, kuliah, atau sekadar kerja santai? Bebas, tinggal gabung aja.",
  },
  {
    q: "Bayar gak?",
    a: "Nggak, gratis! Tapi kalau mau beli makan atau minum, siapin uang sendiri ya.",
  },
  {
    q: "Boleh datang atau pulang di luar jadwal?",
    a: "Boleh banget! Jadwal cuma buat info kalau admin bakal ada di lokasi di jam segitu.",
  },
  {
    q: "Harus bawa sesuatu?",
    a: "Bawa aja yang kamu butuhin. Kalau mau bawa kartu atau game buat seru-seruan bareng, gaskeun!",
  },
  {
    q: "Gimana cara gabung Semeja Kerja?",
    a: "Gratis dan gampang: klik tombol gabung di semejakerja.pages.dev atau lewat linktr.ee/semejakerja, lalu masuk grup komunitas. Info jadwal WFC bareng, Semeja Moves, Talks, dan English selalu diumumkan lewat grup dan Instagram @semejakerja.",
  },
  {
    q: "Apakah ada membership berbayar?",
    a: "Ada, tapi opsional. Tier Nyantai gratis selamanya. Tier Nongkrong membuka Maps lengkap (filter fasilitas & foto) plus diskon 10% di cafe mitra. Tier Mode Serius menambah priority booking Semeja Moves dan akses event eksklusif member.",
  },
  {
    q: "Di mana bisa lihat rekomendasi cafe buat WFC di Purwokerto?",
    a: "Buka peta interaktif kami di semeja-cafe.pages.dev — ada 350+ cafe di Purwokerto lengkap dengan rating, jam buka, kisaran harga, dan fasilitas seperti Wi-Fi, colokan, dan mushola.",
  },
];
