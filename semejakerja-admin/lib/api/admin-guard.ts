import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Gate untuk route handler /api/admins: hanya super_admin.
// Cek role lewat session client (RLS self-read di admin_roles) —
// proxy.ts sudah memblokir juga, ini lapisan kedua kalau middleware
// terlewati. Pemanggil: `if (guard instanceof NextResponse) return guard`.
export async function requireSuperAdmin(): Promise<{ user: User } | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Harus login' }, { status: 401 })
  }

  const { data: adminRole } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminRole?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  return { user }
}
