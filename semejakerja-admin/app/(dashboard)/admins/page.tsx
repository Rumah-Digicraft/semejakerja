'use client'

import { useEffect, useState, useCallback } from 'react'
import type { AdminRole, AdminUser } from '@/types'
import { ALL_ROLES } from '@/lib/access'
import { formatDate } from '@/lib/utils/format'
import { Plus, Loader2, X, Trash2, Save, ShieldCheck } from 'lucide-react'

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  maps_admin: 'Maps Admin',
  community_admin: 'Community Admin',
  moves_admin: 'Moves Admin',
}

const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  maps_admin: 'bg-emerald-100 text-emerald-700',
  community_admin: 'bg-blue-100 text-blue-700',
  moves_admin: 'bg-amber-100 text-amber-700',
}

// Semua operasi lewat /api/admins (service role di server) — RLS hanya
// mengizinkan browser client membaca baris admin_roles miliknya sendiri.
export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [selfId, setSelfId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingRow, setSavingRow] = useState('')
  const [toast, setToast] = useState('')
  const [draftRoles, setDraftRoles] = useState<Record<string, AdminRole>>({})

  const [form, setForm] = useState({ email: '', role: 'maps_admin' as AdminRole })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Tanpa setLoading(true) di sini: loading hanya untuk muatan pertama;
  // reload setelah mutasi cukup menyegarkan baris tanpa flash skeleton.
  const load = useCallback(async () => {
    const res = await fetch('/api/admins')
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      showToast(body.error ?? 'Gagal memuat daftar admin')
      setLoading(false)
      return
    }
    setAdmins(body.admins ?? [])
    setSelfId(body.self ?? '')
    setDraftRoles({})
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const body = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { showToast(body.error ?? 'Gagal menambah admin'); return }
    showToast('Admin berhasil ditambahkan')
    setShowModal(false)
    setForm({ email: '', role: 'maps_admin' })
    load()
  }

  const handleSaveRole = async (admin: AdminUser) => {
    const newRole = draftRoles[admin.user_id]
    if (!newRole || newRole === admin.role) return
    setSavingRow(admin.user_id)
    const res = await fetch(`/api/admins/${admin.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    const body = await res.json().catch(() => ({}))
    setSavingRow('')
    if (!res.ok) { showToast(body.error ?? 'Gagal mengubah role'); return }
    showToast(`Role ${admin.email} diubah ke ${ROLE_LABELS[newRole]}`)
    load()
  }

  const handleDelete = async (admin: AdminUser) => {
    if (!confirm(`Cabut akses admin "${admin.email}"? Akun ini tidak akan bisa masuk panel lagi.`)) return
    const res = await fetch(`/api/admins/${admin.user_id}`, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) { showToast(body.error ?? 'Gagal menghapus admin'); return }
    showToast('Akses admin dicabut')
    load()
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {toast && <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">{toast}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Admin</h1>
          <p className="text-slate-500 mt-1">Atur siapa saja yang bisa mengakses panel ini dan menu apa yang mereka pegang</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
        >
          <Plus size={16} /> Tambah Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Ditambahkan</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-48" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-50 rounded w-24" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-50 rounded w-16 ml-auto" /></td>
                </tr>
              )) : admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-slate-400">Belum ada admin terdaftar.</td>
                </tr>
              ) : admins.map(admin => {
                const isSelf = admin.user_id === selfId
                const draft = draftRoles[admin.user_id] ?? admin.role
                return (
                  <tr key={admin.user_id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        {admin.email}
                        {isSelf && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Anda</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {isSelf ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${ROLE_COLORS[admin.role]}`}>
                          <ShieldCheck size={12} /> {ROLE_LABELS[admin.role]}
                        </span>
                      ) : (
                        <select
                          value={draft}
                          onChange={e => setDraftRoles({ ...draftRoles, [admin.user_id]: e.target.value as AdminRole })}
                          className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(admin.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {!isSelf && draft !== admin.role && (
                          <button
                            onClick={() => handleSaveRole(admin)}
                            disabled={savingRow === admin.user_id}
                            title="Simpan role"
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 disabled:opacity-50"
                          >
                            {savingRow === admin.user_id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                          </button>
                        )}
                        {!isSelf && (
                          <button onClick={() => handleDelete(admin)} title="Cabut akses" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Calon admin harus sudah punya akun (pernah register/login di ekosistem Semeja) sebelum bisa ditambahkan.
        Role akun sendiri tidak bisa diubah atau dihapus dari sini.
      </p>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">Tambah Admin</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email akun</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="nama@email.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as AdminRole })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none"
                >
                  {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Batal</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
