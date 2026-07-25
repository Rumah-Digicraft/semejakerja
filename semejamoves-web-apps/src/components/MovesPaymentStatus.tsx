import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

type Phase = 'loading' | 'pending' | 'success' | 'failed';

interface StatusRow {
  status: string;
  amount: number | null;
  participant_count: number | null;
  paid_at: string | null;
}

/**
 * Shown after DOKU redirects the payer back to /f/:token?invoice=... (or
 * /p/:token). Polls the moves_payment_status RPC until the webhook flips
 * the transaction to success/failed, or falls back to a "pending" notice.
 */
export default function MovesPaymentStatus({
  invoice,
  accent = 'green',
}: {
  invoice: string;
  accent?: 'green' | 'purple';
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [amount, setAmount] = useState<number | null>(null);

  const accentText = accent === 'purple' ? 'text-primary-purple' : 'text-primary-green';
  const spinnerBorder = accent === 'purple' ? 'border-primary-purple' : 'border-primary-green';

  useEffect(() => {
    let active = true;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      const { data, error } = await supabase.rpc('moves_payment_status', { p_invoice: invoice });
      if (!active) return;

      const row = (Array.isArray(data) ? data[0] : data) as StatusRow | undefined;
      if (!error && row) {
        setAmount(row.amount ?? null);
        if (row.status === 'success') return setPhase('success');
        if (row.status === 'failed' || row.status === 'expired') return setPhase('failed');
      }

      tries += 1;
      if (tries >= 24) return setPhase('pending'); // ~60s of polling
      timer = setTimeout(poll, 2500);
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [invoice]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
        {phase === 'loading' && (
          <>
            <div className={`animate-spin rounded-full h-14 w-14 border-b-4 ${spinnerBorder} mx-auto mb-6`} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Mengecek status pembayaran…</h2>
            <p className="text-gray-500 text-sm">
              Kalau kamu sudah menyelesaikan pembayaran di DOKU, sebentar lagi statusnya update otomatis. Jangan tutup dulu ya ✨
            </p>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className={`w-16 h-16 bg-green-100 ${accentText} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran berhasil! 🎉</h2>
            <p className="text-gray-500 text-sm">
              {amount != null ? `Pembayaran ${formatCurrency(amount)} sudah diterima. ` : ''}
              Kamu sudah tercatat lunas, sampai jumpa di lapangan 🔥
            </p>
          </>
        )}

        {phase === 'pending' && (
          <>
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Menunggu pembayaran</h2>
            <p className="text-gray-500 text-sm">
              Kami belum menerima konfirmasi dari DOKU. Kalau kamu sudah bayar, tunggu beberapa saat lalu refresh halaman ini. Kalau belum, silakan ulangi pembayaran.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Refresh status 🔄
            </button>
          </>
        )}

        {phase === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran gagal / kadaluarsa</h2>
            <p className="text-gray-500 text-sm">
              Transaksi tidak selesai atau melewati batas waktu. Silakan kembali ke halaman sesi dan coba lagi.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
