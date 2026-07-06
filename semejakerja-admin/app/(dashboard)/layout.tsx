'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AdminRole } from '@/types'
import { ALL_ROLES, allowedRolesFor } from '@/lib/access'
import {
  LayoutDashboard, Map, Store, Shield, Users, Tag,
  Dumbbell, CalendarDays, UserCheck, Layers, Settings,
  Bike, Menu, X, LogOut, ChevronRight, TrendingUp,
  BarChart2, MapPin, UsersRound, Activity, Wallet, Receipt,
  UserCog
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  icon: React.ReactNode
  items: NavItem[]
}

// Role per menu tidak di-hardcode di sini — sumbernya lib/access.ts
// (ROUTE_ACCESS), yang juga dipakai proxy.ts sebagai gerbang route.
const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: <BarChart2 size={14} />,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    label: 'Semeja Moves',
    icon: <Activity size={14} />,
    items: [
      { href: '/moves/sessions', label: 'Jadwal & Sesi', icon: <CalendarDays size={16} /> },
      { href: '/moves/participants', label: 'Peserta', icon: <UserCheck size={16} /> },
    ],
  },
  {
    label: 'Community',
    icon: <UsersRound size={14} />,
    items: [
      { href: '/community/members', label: 'Manajemen Member', icon: <Users size={16} /> },
      { href: '/community/transactions', label: 'Transaksi Membership', icon: <Receipt size={16} /> },
      { href: '/community/promo-codes', label: 'Promo Code', icon: <Tag size={16} /> },
    ],
  },
  {
    label: 'Add-on Olahraga',
    icon: <Dumbbell size={14} />,
    items: [
      { href: '/addon/manage', label: 'Kelola Add-on', icon: <Layers size={16} /> },
      { href: '/addon/subscribers', label: 'Subscriber & Drop-in', icon: <Bike size={16} /> },
    ],
  },
  {
    label: 'Maps Purwokerto',
    icon: <MapPin size={14} />,
    items: [
      { href: '/maps/cafes', label: 'Data Kafe', icon: <Store size={16} /> },
      { href: '/maps/moderasi', label: 'Moderasi Komunitas', icon: <Shield size={16} /> },
    ],
  },
  {
    label: 'Keuangan',
    icon: <Wallet size={14} />,
    items: [
      { href: '/lapkeu', label: 'Laporan Keuangan', icon: <TrendingUp size={16} /> },
    ],
  },
  {
    label: 'Sistem',
    icon: <Settings size={14} />,
    items: [
      { href: '/settings', label: 'Pengaturan', icon: <Settings size={16} /> },
      { href: '/admins', label: 'Manajemen Admin', icon: <UserCog size={16} /> },
    ],
  },
]

interface SidebarProps {
  userRole: AdminRole | null
  userEmail: string
  onClose?: () => void
}

export function Sidebar({ userRole, userEmail, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const canAccess = (href: string) => {
    if (!userRole) return false
    return (allowedRolesFor(href) ?? ALL_ROLES).includes(userRole)
  }

  const filteredGroups = navGroups
    .map(g => ({ ...g, items: g.items.filter(item => canAccess(item.href)) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Semeja<span className="text-purple-400">kerja</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {filteredGroups.map(group => (
          <div key={group.label} className="mb-4">
            <div className="flex items-center gap-2 px-3 mb-2 text-slate-500">
              {group.icon}
              <p className="text-[10px] font-bold uppercase tracking-widest">
                {group.label}
              </p>
            </div>
            {group.items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{userEmail}</p>
            <p className="text-[10px] text-slate-500 capitalize">{userRole?.replace('_', ' ') ?? 'No role'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 text-sm transition"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userRole, setUserRole] = useState<AdminRole | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).single()
      // No role row → not an admin. Middleware (proxy.ts) already blocks this;
      // sign out here as belt-and-braces instead of assuming super_admin.
      if (data) setUserRole(data.role as AdminRole)
      else await supabase.auth.signOut()
    }
    init()
  }, [])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col">
        <Sidebar userRole={userRole} userEmail={userEmail} />
      </aside>

      {/* Sidebar — mobile */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 z-40 lg:hidden transition-sidebar ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar userRole={userRole} userEmail={userEmail} onClose={() => setIsMobileOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200 flex-shrink-0">
          <button onClick={() => setIsMobileOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
            <Menu size={20} className="text-slate-600" />
          </button>
          <h1 className="font-bold text-slate-800">
            Semeja<span className="text-purple-600">kerja</span>
          </h1>
          <div className="w-9" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
