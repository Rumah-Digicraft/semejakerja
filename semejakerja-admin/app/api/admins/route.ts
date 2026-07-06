import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/api/admin-guard'
import { createAdminClient } from '@/lib/supabase/server'
import { ALL_ROLES } from '@/lib/access'
import type { AdminRole } from '@/types'

export async function GET() {
  const guard = await requireSuperAdmin()
  if (guard instanceof NextResponse) return guard

  const admin = await createAdminClient()
  const { data, error } = await admin.rpc('admin_list_admins')

  if (error) {
    return NextResponse.json(
      { error: `Gagal memuat daftar admin: ${error.message}` },
      { status: 500 }
    )
  }
  return NextResponse.json({ admins: data ?? [], self: guard.user.id })
}

export async function POST(request: Request) {
  const guard = await requireSuperAdmin()
  if (guard instanceof NextResponse) return guard

  let body: { email?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const email = body.email?.trim()
  const role = body.role as AdminRole | undefined
  if (!email) {
    return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
  }
  if (!role || !ALL_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: userId, error: lookupError } = await admin.rpc(
    'admin_lookup_user_by_email',
    { p_email: email }
  )
  if (lookupError) {
    return NextResponse.json(
      { error: `Gagal mencari akun: ${lookupError.message}` },
      { status: 500 }
    )
  }
  if (!userId) {
    return NextResponse.json(
      { error: 'Email belum terdaftar — minta calon admin membuat akun dulu' },
      { status: 404 }
    )
  }

  const { data: existing } = await admin
    .from('admin_roles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Akun ini sudah menjadi admin' }, { status: 409 })
  }

  const { error: insertError } = await admin
    .from('admin_roles')
    .insert({ user_id: userId, role })
  if (insertError) {
    return NextResponse.json(
      { error: `Gagal menambah admin: ${insertError.message}` },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}
