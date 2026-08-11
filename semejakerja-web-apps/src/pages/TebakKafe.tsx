import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Coffee, Loader2, MapPin } from 'lucide-react';
import Seo from '../components/Seo';
import ClueCard from '../components/tebak-kafe/ClueCard';
import GuessMap, { type LatLng } from '../components/tebak-kafe/GuessMap';
import { useCafes } from '../hooks/useCafes';
import {
  ROUND_COUNT, pickRoundCafes, distanceBetween, scoreForDistance,
  verdictForDistance, formatDistance, rankForScore, type RoundResult,
} from '../lib/tebakKafe';
import type { Cafe } from '../types/cafe';

export default function TebakKafe() {
  const { cafes, loading, error, refetch } = useCafes();

  const [roundCafes, setRoundCafes] = useState<Cafe[] | null>(null);
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [locked, setLocked] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);

  const started = roundCafes !== null;
  const finished = started && round >= ROUND_COUNT;
  const currentCafe = started && !finished ? roundCafes![round] : null;
  const totalScore = results.reduce((sum, r) => sum + r.points, 0);

  const startGame = useCallback(() => {
    setRoundCafes(pickRoundCafes(cafes));
    setRound(0);
    setResults([]);
    setGuess(null);
    setLocked(false);
  }, [cafes]);

  const handleGuess = useCallback((latlng: LatLng) => {
    if (locked) return;
    setGuess(latlng);
  }, [locked]);

  const lockGuess = useCallback(() => {
    if (!guess || !currentCafe || locked) return;
    const distance = distanceBetween(guess, { lat: currentCafe.lat, lng: currentCafe.lng });
    const points = scoreForDistance(distance);
    const verdict = verdictForDistance(distance);
    setResults(prev => [...prev, { cafeId: currentCafe.id, cafeName: currentCafe.name, distanceMeters: distance, points, verdict }]);
    setLocked(true);
  }, [guess, currentCafe, locked]);

  const nextRound = useCallback(() => {
    setRound(r => r + 1);
    setGuess(null);
    setLocked(false);
  }, []);

  const lastResult = results[results.length - 1] ?? null;
  const canStart = !loading && !error && cafes.length >= ROUND_COUNT;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e9ecef]">
      <Seo
        title="Tebak Kafe | Semeja Kerja"
        description="Mini-game tebak lokasi kafe di Purwokerto dari ciri-cirinya, langsung di peta asli."
        path="/tebak-kafe"
        noindex
      />

      {started && !finished && (
        <GuessMap guess={guess} actual={locked ? currentCafe : null} locked={locked} onGuess={handleGuess} />
      )}

      {/* Top bar */}
      <header className="absolute top-3 left-3 right-3 sm:top-6 sm:left-6 sm:right-6 z-50 glass-panel rounded-2xl sm:rounded-3xl flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            title="Kembali ke peta"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white/80 border border-white/90 shadow-sm hover:bg-white transition-colors"
          >
            <ArrowLeft size={17} className="text-purple-600" />
          </Link>
          <div className="flex items-center gap-2">
            <Coffee size={20} className="text-purple-600" />
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-gray-900 text-sm sm:text-base">Tebak Kafe</span>
              <span className="text-[11px] text-gray-500 hidden sm:block">Mini-game &middot; peta asli Purwokerto</span>
            </div>
          </div>
        </div>

        {started && !finished && (
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Ronde</span>
              <span className="font-bold text-gray-900 text-sm tabular-nums">{round + 1}/{ROUND_COUNT}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Skor</span>
              <span className="font-bold text-purple-600 text-sm tabular-nums">{totalScore}</span>
            </div>
          </div>
        )}
      </header>

      {/* Intro */}
      {!started && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-6">
          <div className="glass-panel rounded-3xl shadow-2xl p-8 max-w-md w-full flex flex-col gap-5">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wide">
              <MapPin size={14} /> Mini-game baru
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
              Tebak lokasi kafenya, bukan cuma nongkrongnya.
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Lihat ciri-ciri kafe (fasilitas, rating, suasana), lalu tancapkan pin di peta Purwokerto asli.
              Nama &amp; alamatnya baru kebuka setelah kamu kunci tebakan.
            </p>
            <ol className="flex flex-col gap-2 text-sm text-gray-700">
              {[
                'Lihat petunjuk fasilitas & suasana kafenya',
                'Tebak lokasinya langsung di peta',
                'Kunci tebakan, lihat jaraknya & kumpulkan poin',
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full border border-gray-300 text-gray-500 text-xs font-bold flex items-center justify-center flex-none">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            {error ? (
              <div className="flex flex-col gap-2 text-sm text-red-600">
                <span>Gagal memuat data kafe: {error}</span>
                <button onClick={refetch} className="self-start px-4 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100">
                  Coba Lagi
                </button>
              </div>
            ) : (
              <button
                onClick={startGame}
                disabled={!canStart}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Memuat data kafe...</> : <>Mulai Main <ArrowLeft size={16} className="rotate-180" /></>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clue + guess panel */}
      {started && !finished && currentCafe && (
        <div
          className={[
            'glass-panel z-40 flex flex-col gap-4 shadow-xl px-5 py-5',
            'fixed bottom-0 left-0 right-0 rounded-t-3xl',
            'md:absolute md:top-[104px] md:bottom-6 md:right-6 md:left-auto md:w-[380px] md:rounded-3xl md:h-auto md:overflow-y-auto',
          ].join(' ')}
        >
          <ClueCard cafe={currentCafe} />

          {!locked ? (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-200/70">
              <p className="text-xs text-gray-500 pt-3">
                {guess ? 'Pin ditaruh — klik lagi buat geser, atau kunci tebakanmu.' : 'Klik di peta buat naruh pin tebakanmu.'}
              </p>
            </div>
          ) : null}

          {!locked ? (
            <button
              onClick={lockGuess}
              disabled={!guess}
              className="px-5 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              Kunci Tebakan
            </button>
          ) : lastResult && (
            <div className="flex flex-col gap-3 pt-1 border-t border-gray-200/70">
              <div className="flex items-center justify-between gap-3 pt-3">
                <div className="flex flex-col gap-1">
                  <span
                    className={[
                      'text-xs font-bold px-2.5 py-1 rounded-full w-fit',
                      lastResult.verdict.tier === 'good' && 'bg-emerald-100 text-emerald-700',
                      lastResult.verdict.tier === 'mid' && 'bg-amber-100 text-amber-700',
                      lastResult.verdict.tier === 'critical' && 'bg-red-100 text-red-700',
                    ].filter(Boolean).join(' ')}
                  >
                    {lastResult.verdict.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {currentCafe.name} &middot; meleset {formatDistance(lastResult.distanceMeters)}
                  </span>
                </div>
                <span className="text-2xl font-extrabold text-purple-600 tabular-nums">+{lastResult.points}</span>
              </div>
              <button
                onClick={nextRound}
                className="px-5 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors shadow-md"
              >
                {round === ROUND_COUNT - 1 ? 'Lihat Hasil' : 'Ronde Berikutnya'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {finished && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-6">
          <div className="glass-panel rounded-3xl shadow-2xl p-8 max-w-sm w-full flex flex-col gap-5">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-purple-600">Hasil Main</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1 tabular-nums">{totalScore}</p>
              <p className="text-sm font-semibold text-gray-600 mt-1">{rankForScore(totalScore)}</p>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {results.map((r, i) => (
                <div key={r.cafeId} className="flex items-center justify-between gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{i + 1}. {r.cafeName}</span>
                    <span className="text-xs text-gray-500">{r.verdict.label} &middot; {formatDistance(r.distanceMeters)}</span>
                  </div>
                  <span className="font-bold text-purple-600 tabular-nums">{r.points}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 px-5 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors shadow-md"
              >
                Main Lagi
              </button>
              <Link
                to="/"
                className="flex-1 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors text-center"
              >
                Ke Peta
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
