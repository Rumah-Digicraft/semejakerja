import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session, Participant } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { Activity } from 'lucide-react';
import MovesPaymentStatus from '../components/MovesPaymentStatus';

export default function PublicFunminton() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const invoice = searchParams.get('invoice');

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [kritikSaran, setKritikSaran] = useState('');
  const [pollingAnswer, setPollingAnswer] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!token) return;

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('token', token)
        .eq('sport_type', 'funminton')
        .single();

      if (sessionError || !sessionData) {
        setLoading(false);
        return;
      }

      setSession(sessionData);

      const { data: pData } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionData.id)
        .neq('payment_status', 'approved');

      if (pData) setParticipants(pData);
      setLoading(false);
    }
    loadData();
  }, [token]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePay = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (selectedIds.length === 0 || !session || !token) {
      setErrorMsg('Pilih dulu nama yang mau dibayar.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('moves-create-payment', {
        body: {
          token,
          participant_ids: selectedIds,
          kritik_saran: kritikSaran || null,
          polling_hari: pollingAnswer,
          return_url: `${window.location.origin}/f/${token}`,
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-green"></div></div>;

  // Returned from DOKU → show the live payment status.
  if (invoice) return <MovesPaymentStatus invoice={invoice} accent="green" />;

  if (!session) return <div className="min-h-screen bg-gray-50 p-8 text-center"><p className="text-xl text-gray-500">Sesi tidak ditemukan atau link tidak valid.</p></div>;

  const expectedTotal = selectedIds.length * session.price_per_person;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-green text-white flex items-center justify-center rounded-xl shadow-lg mx-auto mb-4">
            <Activity size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pembayaran Funminton</h1>
          <p className="text-gray-500 mt-2">{formatDate(session.session_date)} • {session.venue}</p>
        </div>

        <form onSubmit={handlePay} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-6">
          {submitting && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-green mb-6"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Menyiapkan pembayaran… 🤙</h3>
                <p className="text-gray-500 text-sm">Bentar ya, kamu bakal diarahkan ke halaman pembayaran DOKU (QRIS) ✨</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="text-5xl mb-4">😭💀</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Waduh, gagal nih…</h3>
                <p className="text-gray-600 text-sm mb-6">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => setErrorMsg('')}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                  Coba lagi deh 🔄
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Nama Anda (Bisa &gt;1)</label>
            <div className="max-h-48 overflow-y-auto border rounded-xl p-2 space-y-1">
              {participants.length === 0 ? (
                <p className="text-sm text-gray-500 p-2 text-center">Semua peserta sudah membayar.</p>
              ) : (
                participants.map(p => (
                  <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedIds.includes(p.id) ? 'bg-green-50 border-green-200 border' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 text-primary-green rounded focus:ring-primary-green" />
                    <span className="font-medium text-gray-900">{p.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Total Tagihan</span>
              <span className="text-xl font-bold text-primary-green">{formatCurrency(expectedTotal)}</span>
            </div>
            <p className="text-xs text-gray-400">+ kode unik (Rp300–700) ditambahkan otomatis di halaman pembayaran.</p>
          </div>

          {session.announcement_config?.enabled && (
            session.announcement_config.type === 'libur' ? (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">🔊 Pengumuman</p>
                <p className="text-base font-bold text-gray-900">{session.announcement_config.title}</p>
                {session.announcement_config.caption && <p className="text-xs text-red-700 mt-2 font-medium">{session.announcement_config.caption}</p>}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">📢 Next Session</p>
                <p className="text-base font-bold text-gray-900">{session.announcement_config.title}</p>
                {session.announcement_config.date && <p className="text-sm text-gray-600 mt-0.5">{session.announcement_config.date}</p>}
                {session.announcement_config.caption && <p className="text-xs text-green-700 mt-2 font-medium">{session.announcement_config.caption}</p>}
              </div>
            )
          )}

          {session.polling_config?.enabled && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">{session.polling_config.question}</p>
              <div className="space-y-2">
                {session.polling_config.options.map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${pollingAnswer === opt ? 'bg-white border-primary-green shadow-sm' : 'bg-white/60 border-transparent hover:bg-white'}`}>
                    <input
                      type="radio"
                      name="polling"
                      value={opt}
                      checked={pollingAnswer === opt}
                      onChange={() => setPollingAnswer(opt)}
                      className="w-4 h-4 text-primary-green"
                    />
                    <span className="text-sm text-gray-800 font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kritik dan Saran <span className="text-gray-400 font-normal">(opsional)</span></label>
            <textarea
              placeholder="Kasih saran biar next minton tambah fun"
              className="w-full px-3 py-2 border rounded-xl text-sm resize-none"
              rows={3}
              value={kritikSaran}
              onChange={e => setKritikSaran(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || selectedIds.length === 0}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-green hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-green disabled:opacity-50 transition-all"
          >
            {submitting ? 'Memproses…' : 'Bayar Sekarang (QRIS)'}
          </button>
        </form>
      </div>
    </div>
  );
}
