import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, PlusCircle, Bookmark, Gamepad2, Trophy } from 'lucide-react';

interface BottomNavProps {
  onAddCafeClick: () => void;
}

// Mobile-only tab bar — desktop keeps Header + Sidebar as its nav (see
// App.tsx), so this renders nothing at md: and up. Tebak Kafe and Kontributor
// used to live as icon-only buttons in the mobile Header (no room for a
// label there); moved here where a label always fits, and Header no longer
// renders them below md: (see Header.tsx).
//
// Order flanks the "+" with the two highest-frequency surfaces (Explore,
// Saved) and pushes the lower-frequency engagement features (game,
// leaderboard) to the outer edges — same reasoning restaurants put specials
// in the middle of a menu and everyday items at the ends.
//
// /tebak-kafe itself is deliberately NOT in VISIBLE_PATHS: the game's active
// play screen has its own fixed-bottom-0 clue/guess panel (see TebakKafe.tsx)
// with a "Kunci Tebakan" action button — stacking this bar under/behind it
// works z-index-wise (same as Sidebar/CafeModal covering this bar elsewhere)
// but wastes the tab's screen real estate for no benefit, since you can't
// tap back to Explore mid-guess anyway without losing your pin. The tab is
// still reachable from every other screen; it just doesn't render on the
// game screen itself.
//
// z-30, deliberately below Sidebar's z-40 and CafeModal's z-50: when either
// of those mobile bottom sheets is open, it should visually cover this bar
// rather than float above it — same as a normal app hiding its tab bar
// under a full takeover sheet.
const VISIBLE_PATHS = [/^\/$/, /^\/cafe\//, /^\/tersimpan$/, /^\/papan-kontributor$/];

const BottomNav: React.FC<BottomNavProps> = ({ onAddCafeClick }) => {
  const location = useLocation();
  if (!VISIBLE_PATHS.some(re => re.test(location.pathname))) return null;

  const isExplore = location.pathname === '/' || location.pathname.startsWith('/cafe/');
  const isSaved = location.pathname === '/tersimpan';
  const isKontributor = location.pathname === '/papan-kontributor';

  const tabClass = (active: boolean) =>
    `flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-colors ${
      active ? 'text-purple-600' : 'text-gray-400'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-panel rounded-t-3xl shadow-2xl flex items-center justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {/* Never the active tab — /tebak-kafe isn't in VISIBLE_PATHS, so this
          bar never renders while actually on that page. */}
      <Link to="/tebak-kafe" className={tabClass(false)}>
        <Gamepad2 size={20} />
        <span className="text-[10px] font-bold">Tebak Kafe</span>
      </Link>

      <Link to="/" className={tabClass(isExplore)}>
        <Compass size={20} />
        <span className="text-[10px] font-bold">Explore</span>
      </Link>

      <button
        onClick={onAddCafeClick}
        title="Tambahkan Tempat Baru"
        className="-mt-6 w-14 h-14 rounded-full flex items-center justify-center bg-purple-600 text-white shadow-lg shadow-purple-500/40 hover:bg-purple-700 transition-all hover:-translate-y-0.5 flex-shrink-0"
      >
        <PlusCircle size={26} />
      </button>

      <Link to="/tersimpan" className={tabClass(isSaved)}>
        <Bookmark size={20} />
        <span className="text-[10px] font-bold">Saved</span>
      </Link>

      <Link to="/papan-kontributor" className={tabClass(isKontributor)}>
        <Trophy size={20} />
        <span className="text-[10px] font-bold">Kontributor</span>
      </Link>
    </nav>
  );
};

export default BottomNav;
