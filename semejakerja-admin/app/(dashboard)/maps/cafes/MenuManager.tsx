'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { SectionCard } from './CafeForm'

const BUCKET = 'cafe-menus'
const MAX_FILE_BYTES = 10 * 1024 * 1024

interface MenuManagerProps {
  cafeId: string
  onToast: (message: string) => void
}

export default function MenuManager({ cafeId, onToast }: MenuManagerProps) {
  const supabase = createClient()
  const [path, setPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('cafes').select('menu_pdf_path').eq('id', cafeId).single()
    if (error) onToast(`Gagal memuat menu: ${error.message}`)
    setPath(data?.menu_pdf_path ?? null)
    setLoading(false)
  }, [cafeId])

  useEffect(() => { load() }, [load])

  const publicUrl = path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') { onToast('File menu harus format PDF'); return }
    if (file.size > MAX_FILE_BYTES) { onToast('Ukuran PDF maksimal 10MB'); return }

    setBusy(true)
    const newPath = `${cafeId}/menu-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, file, { upsert: false, contentType: 'application/pdf' })
    if (uploadError) {
      onToast(`Gagal upload: ${uploadError.message}`)
      setBusy(false)
      return
    }

    const { error: dbError } = await supabase.from('cafes').update({ menu_pdf_path: newPath }).eq('id', cafeId)
    if (dbError) {
      onToast(`Menu ke-upload tapi gagal disimpan: ${dbError.message}`)
      await supabase.storage.from(BUCKET).remove([newPath])
      setBusy(false)
      return
    }

    // Bersihkan file lama biar tak numpuk sampah di storage
    const oldPath = path
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])

    setPath(newPath)
    setBusy(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onToast('Menu PDF berhasil diupload')
  }

  const handleRemove = async () => {
    if (!path || !confirm('Hapus menu PDF ini?')) return
    setBusy(true)
    await supabase.storage.from(BUCKET).remove([path])
    const { error } = await supabase.from('cafes').update({ menu_pdf_path: null }).eq('id', cafeId)
    setBusy(false)
    if (error) { onToast(`Gagal menghapus: ${error.message}`); return }
    setPath(null)
    onToast('Menu PDF dihapus')
  }

  return (
    <SectionCard icon={<FileText size={16} />} title="Menu PDF">
      {loading ? (
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
      ) : path ? (
        <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3">
          <a
            href={publicUrl ?? '#'} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-500 min-w-0"
          >
            <FileText size={16} className="shrink-0" />
            <span className="truncate">Lihat menu</span>
            <ExternalLink size={13} className="shrink-0" />
          </a>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 rounded-lg text-xs font-medium text-slate-600 transition disabled:opacity-50"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              title="Hapus"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="w-full border-2 border-dashed border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 rounded-xl py-6 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-purple-500 transition disabled:opacity-50"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
          <span className="text-xs font-medium">{busy ? 'Mengunggah...' : 'Upload Menu PDF'}</span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {!loading && (
        <p className="text-xs text-slate-400 mt-3">Tampil sebagai tombol &quot;Lihat Menu&quot; di detail kafe peta publik. Maks. 10MB, format PDF.</p>
      )}
    </SectionCard>
  )
}
