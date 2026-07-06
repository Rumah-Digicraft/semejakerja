import type { AdminRole } from '@/types'

export const ALL_ROLES: AdminRole[] = ['super_admin', 'maps_admin', 'community_admin', 'moves_admin']

// Single source of truth for which roles may open which route.
// Consumed by proxy.ts (hard gate) and the sidebar in app/(dashboard)/layout.tsx
// (visibility). Paths not listed here (e.g. /dashboard) are open to every admin.
// Keep this module dependency-free: proxy.ts runs in the middleware bundle.
export const ROUTE_ACCESS: ReadonlyArray<{ prefix: string; roles: AdminRole[] }> = [
  { prefix: '/maps', roles: ['super_admin', 'maps_admin'] },
  { prefix: '/community', roles: ['super_admin', 'community_admin'] },
  { prefix: '/moves', roles: ['super_admin', 'moves_admin'] },
  { prefix: '/addon', roles: ['super_admin', 'moves_admin'] },
  { prefix: '/lapkeu', roles: ['super_admin'] },
  { prefix: '/settings', roles: ['super_admin'] },
  { prefix: '/admins', roles: ['super_admin'] },
  { prefix: '/api/admins', roles: ['super_admin'] },
]

export function allowedRolesFor(pathname: string): AdminRole[] | null {
  const entry = ROUTE_ACCESS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
  return entry?.roles ?? null
}

export function canAccessPath(pathname: string, role: string | null): boolean {
  const roles = allowedRolesFor(pathname)
  if (!roles) return true
  return role !== null && roles.includes(role as AdminRole)
}
