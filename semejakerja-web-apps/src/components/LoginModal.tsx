import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Coffee } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onSignInWithGoogle: () => Promise<string | null>;
}

// Multicolor Google "G" — inline so no external asset is fetched.
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSignInWithGoogle }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If the user backs out of Google's account screen, the browser restores
  // this page from the bfcache with loading still true — re-enable the button.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') setLoading(false);
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const msg = await onSignInWithGoogle();
    // On success the browser redirects to Google, so we won't reach here.
    if (msg) {
      setError(msg);
      setLoading(false);
    }
  };

  // Portal to <body>: an ancestor with backdrop-filter (e.g. the glass-panel
  // header) would otherwise become the containing block for position: fixed.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 sm:p-8 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20 mb-3">
            <Coffee size={22} color="white" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900">Masuk ke Semeja Kerja</h2>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Masuk atau daftar cukup dengan Google untuk akses fitur member.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold shadow-sm hover:bg-gray-50 hover:border-gray-300 disabled:opacity-60 transition-all"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Menghubungkan…</>
          ) : (
            <><GoogleIcon /> Lanjut dengan Google</>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-5">
          Akun otomatis dibuat saat pertama kali masuk dengan Google.
        </p>
      </div>
    </div>,
    document.body
  );
};
