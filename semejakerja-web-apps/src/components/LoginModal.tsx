import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Eye, EyeOff, Coffee } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<string | null>;
  landingUrl: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onSignIn, landingUrl }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const msg = await onSignIn(email, password);
    if (msg) {
      setError(msg === 'Invalid login credentials' ? 'Email atau password salah.' : msg);
      setLoading(false);
      return;
    }
    // onAuthStateChange in useAuth updates the header; just close.
    onClose();
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
            Masuk untuk akses fitur member.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="login-password">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold shadow-md shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-60 transition-all"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Masuk...</> : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Belum punya akun?{' '}
          <a
            href={`${landingUrl}/auth/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 font-semibold hover:underline"
          >
            Daftar Gratis
          </a>
        </p>
      </div>
    </div>,
    document.body
  );
};
