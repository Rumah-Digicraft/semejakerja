import { useState } from 'react';
import { AdminLayout, type AdminPage } from '../../components/admin/AdminLayout';
import { DashboardPage } from './DashboardPage';
import { CafesPage } from './CafesPage';
import { ModerasiPage } from './ModerasiPage';
import { AdminLogin } from './AdminLogin';
import { useAdminAuth } from '../../hooks/useAdminAuth';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );
}

export function AdminPanel() {
  const { user, loading } = useAdminAuth();
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');

  if (loading) return <LoadingScreen />;
  if (!user) return <AdminLogin />;

  return (
    <AdminLayout activePage={activePage} onNavigate={setActivePage}>
      {activePage === 'dashboard' && <DashboardPage />}
      {activePage === 'cafes' && <CafesPage />}
      {activePage === 'moderasi' && <ModerasiPage />}
    </AdminLayout>
  );
}
