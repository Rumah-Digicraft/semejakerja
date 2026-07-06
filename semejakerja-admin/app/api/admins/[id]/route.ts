import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/api/admin-guard'
import { createAdminClient } from '@/lib/supabase/server'
import { ALL_ROLES } from '@/lib/access'
import type { AdminRole } from '@/types'

// [id] = admin_roles.user_id (UNIQUE, sama dengan auth.users.id).
// Blok aksi ke akun sendiri sekaligus menjamin selalu tersisa minimal
// satu super_admin: pemanggil pasti super_admin dan tak pernah bisa
// menurunkan/menghapus dirinya.
type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireSuperAdmin()
  if (guard instanceof NextResponse) return guard

  const { id } = await params
  if (id === guard.user.id) {
    return NextResponse.json(
      { error: 'Tidak bisa mengubah role akun sendiri' },
      { status: 400 }
    )
  }

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }
  const role = body.role as AdminRole | undefined
  if (!role || !ALL_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('admin_roles')
    .update({ role })
    .eq('user_id', id)
    .select('user_id')

  if (error) {
    return NextResponse.json(
      { error: `Gagal mengubah role: ${error.message}` },
      { status: 500 }
    )
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'Admin tidak ditemukan' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: Params) {
  const guard = await requireSuperAdmin()
  if (guard instanceof NextResponse) return guard

  const { id } = await params
  if (id === guard.user.id) {
    return NextResponse.json(
      { error: 'Tidak bisa menghapus akun sendiri' },
      { status: 400 }
    )
  }

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('admin_roles')
    .delete()
    .eq('user_id', id)
    .select('user_id')

  if (error) {
    return NextResponse.json(
      { error: `Gagal menghapus admin: ${error.message}` },
      { status: 500 }
    )
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'Admin tidak ditemukan' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
