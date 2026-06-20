import { useState } from 'react';
import {
  Coffee, LayoutDashboard, Store, LogOut,
  Menu, X, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { usePendingCounts } from '../../hooks/useModerations';

export type AdminPage = 'dashboard' | 'cafes' | 'moderasi';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

const NAV = [
  { id: 'dashboard' as AdminPage, label: 'Dashboard',  sub: 'Statistik & ringkasan',  icon: LayoutDashboard },
  { id: 'cafes'     as AdminPage, label: 'Data Cafe',   sub: 'Kelola semua cafe',      icon: Store },
  { id: 'moderasi'  as AdminPage, label: 'Moderasi',    sub: 'Verifikasi kontribusi',   icon: ShieldCheck },
];

const TITLES: Record<AdminPage, string> = {
  dashboard: 'Dashboard',
  cafes: 'Data Cafe',
  moderasi: 'Moderasi Kontribusi',
};

function SidebarContent({
  activePage,
  onNavigate,
  onClose,
}: {
  activePage: AdminPage;
  onNavigate: (p: AdminPage) => void;
  onClose?: () => void;
}) {
  const { user, signOut } = useAdminAuth();
  const initial = user?.email?.[0]?.toUpperCase() ?? 'A';
  const { data: pendingCounts } = usePendingCounts();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none">
              Semeja Kerja
            </p>
            <p className="text-sm font-bold text-gray-900 leading-snug mt-0.5">Cafe Bos Panel</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Menu</p>
        <div className="space-y-0.5">
          {NAV.map(({ id, label, sub, icon: Icon }) => {
            const active = activePage === id;
            return (
              <button
                key={id}
                onClick={() => { onNavigate(id); onClose?.(); }}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
                  active
                    ? 'bg-purple-600 shadow-sm'
                    : 'hover:bg-gray-100',
                ].join(' ')}
              >
                <Icon className={['w-4 h-4 shrink-0', active ? 'text-white' : 'text-gray-500'].join(' ')} />
                <div className="flex-1 min-w-0">
                  <p className={['text-sm font-semibold flex items-center gap-2', active ? 'text-white' : 'text-gray-800'].join(' ')}>
                    {label}
                    {id === 'moderasi' && (pendingCounts?.total ?? 0) > 0 && (
                      <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${active ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-700'}`}>
                        {(pendingCounts?.total ?? 0) > 99 ? '99+' : pendingCounts?.total}
                      </span>
                    )}
                  </p>
                  <p className={['text-[11px]', active ? 'text-purple-200' : 'text-gray-400'].join(' ')}>
                    {sub}
                  </p>
                </div>
                <ChevronRight className={['w-3.5 h-3.5 shrink-0', active ? 'text-purple-300' : 'text-gray-300'].join(' ')} />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 px-3 pb-4 border-t border-gray-100 pt-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-purple-600">{initial}</span>
          </div>
          <p className="text-xs font-medium text-gray-600 truncate">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Keluar
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children, activePage, onNavigate }: AdminLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f8f9fb]">

      {/* ── Desktop sidebar (static, part of flex flow) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-gray-100">
        <SidebarContent activePage={activePage} onNavigate={onNavigate} />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full shadow-2xl">
            <SidebarContent
              activePage={activePage}
              onNavigate={onNavigate}
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-8 gap-4 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">{TITLES[activePage]}</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
