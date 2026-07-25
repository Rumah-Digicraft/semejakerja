import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { Trophy } from 'lucide-react';
import MovesPaymentStatus from '../components/MovesPaymentStatus';

export default function PublicPadel() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const invoice = searchParams.get('invoice');

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form
  const [formData, setFormData] = useState({ name: '', phone: '' });

  useEffect(() => {
    async function loadData() {
      if (!token) return;

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('token', token)
        .eq('sport_type', 'padel')
        .single();

      if (sessionError || !sessionData) {
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setLoading(false);
    }
    loadData();
  }, [token]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !session || !token) {
      setErrorMsg('Isi nama dulu ya.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('moves-create-payment', {
        body: {
          token,
          new_participants: [{ name: formData.name, phone: formData.phone || null }],
          payer_name: formData.name,
          payer_phone: formData.phone || null,
          return_url: `${window.location.origin}/p/${token}`,
        },
      });

      // invoke() flags any non-2xx as `error`; the real message is in the body.
      if (error) {
        let msg = 'Gagal memulai pembayaran. Coba lagi ya.';
        try {
          const body = await error.context.json();
          if (body?.error) msg = body.error;
        } catch { /* keep default */ }
        throw new Error(msg);
      }

      if (data?.payment_url) {
        window.location.href = data.payment_url; // redirect to DOKU checkout
        return;
      }
      throw new Error('Link pembayaran tidak diterima. Coba lagi ya.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-purple"></div></div>;

  // Returned from DOKU → show the live payment status (registration is
  // created by the webhook only after the payment succeeds).
  if (invoice) return <MovesPaymentStatus invoice={invoice} accent="purple" />;

  if (!session) return <div className="min-h-screen bg-gray-50 p-8 text-center"><p className="text-xl text-gray-500">Sesi tidak ditemukan atau link tidak valid.</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-purple text-white flex items-center justify-center rounded-xl shadow-lg mx-auto mb-4">
            <Trophy size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Registrasi Padel</h1>
          <p className="text-gray-500 mt-2">{formatDate(session.session_date)} • {session.venue}</p>
        </div>

        <form onSubmit={handlePay} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-6">
          {submitting && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-purple mb-6"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Menyiapkan pembayaran…</h3>
                <p className="text-gray-500 text-sm">Sebentar ya, kamu akan diarahkan ke halaman pembayaran DOKU (QRIS).</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="text-5xl mb-4">😭</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Gagal memproses</h3>
                <p className="text-gray-600 text-sm mb-6">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => setErrorMsg('')}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                  Tutup & Coba Lagi
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. WhatsApp</label>
              <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Biaya Pendaftaran</span>
              <span className="text-xl font-bold text-primary-purple">{formatCurrency(session.price_per_person)}</span>
            </div>
            <p className="text-xs text-gray-400">+ kode unik (Rp300–700) ditambahkan otomatis di halaman pembayaran.</p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Pendaftaran kamu otomatis tercatat setelah pembayaran berhasil.
          </p>

          <button
            type="submit"
            disabled={submitting || !formData.name}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-purple hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-purple disabled:opacity-50 transition-all"
          >
            {submitting ? 'Memproses…' : 'Daftar & Bayar (QRIS)'}
          </button>
        </form>
      </div>
    </div>
  );
}
