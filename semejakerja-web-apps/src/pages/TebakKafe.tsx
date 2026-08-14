import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Coffee, LogIn, Loader2, MapPin, Trophy, X } from 'lucide-react';
import Seo from '../components/Seo';
import ClueCard from '../components/tebak-kafe/ClueCard';
import GuessMap, { type LatLng } from '../components/tebak-kafe/GuessMap';
import Leaderboard from '../components/tebak-kafe/Leaderboard';
import { LoginModal } from '../components/LoginModal';
import { useAuth } from '../hooks/useAuth';
import { useCafes } from '../hooks/useCafes';
import { useSubmitTebakKafeScore } from '../hooks/useTebakKafeLeaderboard';
import {
  ROUND_COUNT, pickRoundCafes, distanceBetween, scoreForDistance,
  verdictForDistance, formatDistance, rankForScore, type RoundResult,
} from '../lib/tebakKafe';
import type { Cafe } from '../types/cafe';

export default function TebakKafe() {
  const { cafes, loading, error, refetch } = useCafes();
  const { user, signInWithGoogle } = useAuth();
  const submitScore = useSubmitTebakKafeScore();

  const [roundCafes, setRoundCafes] = useState<Cafe[] | null>(null);
  // Set once per game (in startGame, a click handler — not render) so
  // ClueCard can pick a different-but-stable photo per cafe each playthrough
  // without calling Math.random() during render. See ClueCard's hashString.
  const [photoSeed, setPhotoSeed] = useState(0);
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [locked, setLocked] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [resultsTab, setResultsTab] = useState<'rounds' | 'leaderboard'>('rounds');
  const [showLogin, setShowLogin] = useState(false);
  const [showIntroLeaderboard, setShowIntroLeaderboard] = useState(false);
  // Mobile-only: lets the player collapse the clue panel down to a thin bar
  // to see more of the map while placing their pin. Desktop's side panel
  // never covers the map, so this only matters below the md breakpoint.
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  // Swipe (not tap) on the handle bar — same threshold-delta technique as
  // CafeModal/PhotoLightbox's photo-swipe, just on the Y axis.
  const panelTouchStartY = useRef<number | null>(null);
  const handlePanelTouchStart = (e: TouchEvent) => { panelTouchStartY.current = e.touches[0].clientY; };
  const handlePanelTouchEnd = (e: TouchEvent) => {
    if (panelTouchStartY.current == null) return;
    const delta = e.changedTouches[0].clientY - panelTouchStartY.current;
    if (delta > 30) setPanelCollapsed(true);
    else if (delta < -30) setPanelCollapsed(false);
    panelTouchStartY.current = null;
  };

  const started = roundCafes !== null;
  const finished = started && round >= ROUND_COUNT;
  const currentCafe = started && !finished ? roundCafes![round] : null;
  const totalScore = results.reduce((sum, r) => sum + r.points, 0);

  // Submit once per finished game, only when logged in — leaderboard
  // requires an account (see migration 039). Guards against re-submitting
  // if the component re-renders while finished stays true.
  const submittedForRef = useRef<RoundResult[] | null>(null);
  useEffect(() => {
    if (!finished || !user || results.length === 0) return;
    if (submittedForRef.current === results) return;
    submittedForRef.current = results;
    submitScore.mutate(results);
  }, [finished, user, results, submitScore]);

  const startGame = useCallback(() => {
    setRoundCafes(pickRoundCafes(cafes));
    setPhotoSeed(Date.now());
    setRound(0);
    setResults([]);
    setGuess(null);
    setLocked(false);
    setResultsTab('rounds');
    setPanelCollapsed(false);
    submittedForRef.current = null;
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
    setResults(prev => [...prev, {
      cafeId: currentCafe.id, cafeName: currentCafe.name, distanceMeters: distance, points, verdict,
      guessLat: guess.lat, guessLng: guess.lng,
    }]);
    setLocked(true);
  }, [guess, currentCafe, locked]);

  const nextRound = useCallback(() => {
    setRound(r => r + 1);
    setGuess(null);
    setLocked(false);
    setPanelCollapsed(false);
  }, []);

  const lastResult = results[results.length - 1] ?? null;
  const canStart = !loading && !error && cafes.length >= ROUND_COUNT;

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-[#e9ecef]">
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
              <div className="flex flex-col gap-2">
                <button
                  onClick={startGame}
                  disabled={!canStart}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Memuat data kafe...</> : <>Mulai Main <ArrowLeft size={16} className="rotate-180" /></>}
                </button>
                <button
                  onClick={() => setShowIntroLeaderboard(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-50 text-purple-700 font-bold text-sm hover:bg-purple-100 transition-colors"
                >
                  <Trophy size={16} /> Lihat Leaderboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clue + guess panel */}
      {started && !finished && currentCafe && (
        <div
          className={[
            'glass-panel z-40 flex flex-col shadow-xl rounded-t-3xl overflow-hidden',
            // Collapsible on mobile — swipe the handle to shrink this down to
            // a thin bar and see the whole map while placing a pin. No inner
            // scroll when expanded — the panel just grows to fit its content
            // (max-h here is a viewport safety net, not a scroll trigger).
            'fixed bottom-0 left-0 right-0 transition-[max-height] duration-300 ease-in-out',
            panelCollapsed ? 'max-h-14' : 'max-h-[85vh]',
            'md:absolute md:top-[104px] md:bottom-6 md:right-6 md:left-auto md:w-[380px] md:rounded-3xl md:h-auto md:max-h-none',
          ].join(' ')}
        >
          {/* Same visual handle as CafeModal's mobile drag handle — swipe up/down
              to collapse/expand (CafeModal's is decorative only; this one is
              wired up since the map needs to be reachable underneath). */}
          <div
            onTouchStart={handlePanelTouchStart}
            onTouchEnd={handlePanelTouchEnd}
            className="md:hidden flex-shrink-0 flex items-center justify-center py-3 touch-none"
          >
            <span className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="flex flex-col gap-4 px-5 pb-5 md:pt-5">
          <ClueCard cafe={currentCafe} photoSeed={photoSeed} />

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
                  <span className="text-sm font-bold text-gray-800">
                    {currentCafe.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    meleset {formatDistance(lastResult.distanceMeters)}
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

              {user ? (
                <p className="text-xs text-gray-400 mt-2">
                  {submitScore.isPending && 'Menyimpan skor ke leaderboard...'}
                  {submitScore.isSuccess && 'Skor tersimpan ke leaderboard ✓'}
                  {submitScore.isError && 'Gagal menyimpan skor — coba lagi nanti.'}
                </p>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-1.5 mx-auto mt-2 text-xs font-bold text-purple-600 hover:text-purple-700"
                >
                  <LogIn size={12} /> Masuk buat simpan skor ke leaderboard
                </button>
              )}
            </div>

            {/* Tab toggle: this game's round breakdown vs the global leaderboard */}
            <div className="flex rounded-xl bg-gray-100 p-1 text-sm font-bold">
              <button
                onClick={() => setResultsTab('rounds')}
                className={[
                  'flex-1 py-2 rounded-lg transition-colors',
                  resultsTab === 'rounds' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500',
                ].join(' ')}
              >
                Hasil Ronde
              </button>
              <button
                onClick={() => setResultsTab('leaderboard')}
                className={[
                  'flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5',
                  resultsTab === 'leaderboard' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500',
                ].join(' ')}
              >
                <Trophy size={13} /> Leaderboard
              </button>
            </div>

            {resultsTab === 'rounds' ? (
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
            ) : (
              <Leaderboard currentUserId={user?.id} />
            )}

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

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSignInWithGoogle={signInWithGoogle}
        />
      )}

      {showIntroLeaderboard && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowIntroLeaderboard(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <Trophy size={18} className="text-purple-600" /> Leaderboard
              </h2>
              <button
                onClick={() => setShowIntroLeaderboard(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <Leaderboard currentUserId={user?.id} />
          </div>
        </div>
      )}
    </div>
  );
}
