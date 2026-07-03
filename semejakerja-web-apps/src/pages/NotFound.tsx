import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import Seo from '../components/Seo';

// Cloudflare Pages serves index.html (200) for unknown paths, so this is a
// soft 404 — the noindex meta keeps it out of search indexes.
export default function NotFound() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-4 bg-[#f8f9fa] text-center px-6">
      <Seo
        title="Halaman Tidak Ditemukan | Peta Cafe Purwokerto"
        description="Halaman yang kamu cari tidak ada."
        path="/404"
        noindex
      />
      <p className="text-5xl font-extrabold text-purple-600">404</p>
      <h1 className="text-xl font-bold text-gray-900">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Halaman yang kamu cari nggak ada atau sudah dipindah. Balik ke peta buat
        cari cafe WFC di Purwokerto.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors shadow-md"
      >
        <MapPin size={16} />
        Buka Peta Cafe
      </Link>
    </div>
  );
}
