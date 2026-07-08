import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

/**
 * Lands here after the Google OAuth round-trip. The supabase client
 * (detectSessionInUrl) parses the code/token from the URL and fires
 * onAuthStateChange; we then send the user back to the map.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  // Read any provider error at render (SPA — window is always available).
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(
    window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  );
  const providerError =
    search.get('error_description') ||
    hash.get('error_description') ||
    search.get('error') ||
    hash.get('error');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (providerError) return; // nothing to wait for — error shown at render

    let redirected = false;
    const go = () => {
      if (!redirected) {
        redirected = true;
        navigate('/', { replace: true });
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });

    const timeout = setTimeout(() => {
      if (!redirected) setTimedOut(true);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMsg = providerError
    ? providerError
    : timedOut
    ? 'Login gagal atau tautan kedaluwarsa. Silakan coba lagi.'
    : '';

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#e9ecef] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
        {errorMsg ? (
          <>
            <h2 className="text-lg font-extrabold text-gray-900">Login Gagal</h2>
            <p className="text-sm text-gray-500">{errorMsg}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="mt-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors shadow-md"
            >
              Kembali ke Peta
            </button>
          </>
        ) : (
          <>
            <Loader2 size={32} className="animate-spin text-purple-600" />
            <p className="text-sm font-semibold text-gray-600">Menyelesaikan login…</p>
          </>
        )}
      </div>
    </div>
  );
}
