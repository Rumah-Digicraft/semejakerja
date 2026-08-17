'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CafePhoto } from '@/types'
import { Camera, Check, GripVertical, Loader2, Trash2, X } from 'lucide-react'
import { SectionCard } from './CafeForm'
import PhotoCropModal from './PhotoCropModal'

const BUCKET = 'cafe-photos'
const MAX_FILE_BYTES = 10 * 1024 * 1024 // matches the bucket's file_size_limit
const MAX_PHOTOS = 15 // batas foto tayang per kafe

const STATUS_BADGE: Record<CafePhoto['status'], string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<CafePhoto['status'], string> = {
  approved: 'Tayang',
  pending: 'Menunggu review',
  rejected: 'Ditolak',
}

interface PhotoManagerProps {
  cafeId: string
  onToast: (message: string) => void
}

export default function PhotoManager({ cafeId, onToast }: PhotoManagerProps) {
  const supabase = createClient()
  const [photos, setPhotos] = useState<CafePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [queueTotal, setQueueTotal] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragPointerId = useRef<number | null>(null)
  const nextOrderRef = useRef(0)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('cafe_photos')
      .select('*')
      .eq('cafe_id', cafeId)
      .neq('status', 'rejected') // foto ditolak tak perlu nongkrong di grid ini
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) onToast(`Gagal memuat foto: ${error.message}`)
    setPhotos(data ?? [])
    setLoading(false)
  }, [cafeId])

  useEffect(() => { load() }, [load])

  const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

  const approvedCount = photos.filter(p => p.status === 'approved').length
  const slotsLeft = Math.max(0, MAX_PHOTOS - approvedCount)

  // File selection just validates and queues — actual upload happens after
  // each file goes through the 4:3 crop step (see PhotoCropModal below).
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (slotsLeft === 0) {
      onToast(`Kafe ini sudah punya ${MAX_PHOTOS} foto (maksimal). Hapus foto lama dulu sebelum menambah.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const valid: File[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        onToast(`${file.name} dilewati — bukan file gambar`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        onToast(`${file.name} dilewati — ukuran lebih dari 10MB`)
        continue
      }
      valid.push(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (valid.length === 0) return
    if (valid.length > slotsLeft) {
      onToast(`Cuma ${slotsLeft} foto yang diunggah — sisanya dilewati karena kafe ini maksimal ${MAX_PHOTOS} foto.`)
      valid.length = slotsLeft
    }
    nextOrderRef.current = photos.length // new uploads are appended after existing photos
    setQueueTotal(valid.length)
    setPendingFiles(valid)
    setUploading(true)
  }

  // Advances the crop queue; once it's empty the batch is done, so re-enable
  // the uploader and refresh the grid from the DB.
  const advanceQueue = () => {
    setPendingFiles(prev => {
      const next = prev.slice(1)
      if (next.length === 0) {
        setUploading(false)
        load()
      }
      return next
    })
  }

  const handleCropConfirm = async (blob: Blob) => {
    const path = `${cafeId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: false, contentType: 'image/jpeg' })

    if (uploadError) {
      onToast(`Gagal upload: ${uploadError.message}`)
      advanceQueue()
      return
    }

    const { error: dbError } = await supabase.from('cafe_photos').insert({
      cafe_id: cafeId,
      submitter_name: 'Admin',
      storage_path: path,
      status: 'approved',
      sort_order: nextOrderRef.current++,
      reviewed_at: new Date().toISOString(),
    })
    if (dbError) {
      onToast(`Foto ke-upload tapi gagal disimpan: ${dbError.message}`)
      await supabase.storage.from(BUCKET).remove([path])
    }
    advanceQueue()
  }

  // Rewrites sort_order for the whole list as a dense 0..N-1 sequence — with
  // only a handful of photos per cafe this is simpler than juggling gaps.
  const persistOrder = async (ordered: CafePhoto[]) => {
    setReordering(true)
    await Promise.all(ordered.map((p, i) =>
      p.sort_order === i ? null : supabase.from('cafe_photos').update({ sort_order: i }).eq('id', p.id)
    ))
    setReordering(false)
    load()
  }

  // Pointer Events (not native HTML5 draggable, which is mouse-only and
  // never fires from a touchscreen) — one code path drags with mouse, pen,
  // or a finger. The handle captures the pointer so move/up keep firing on
  // it even once the finger/cursor drifts outside the small grip icon.
  const finishDrag = (dropIndex: number | null) => {
    const from = draggingIndex
    setDraggingIndex(null)
    setDragOverIndex(null)
    dragPointerId.current = null
    if (from === null || dropIndex === null || dropIndex === from) return
    const next = [...photos]
    const [moved] = next.splice(from, 1)
    next.splice(dropIndex, 0, moved)
    setPhotos(next)
    persistOrder(next)
  }

  const handlePointerDown = (index: number) => (e: React.PointerEvent) => {
    if (reordering) return
    e.preventDefault()
    dragPointerId.current = e.pointerId
    setDraggingIndex(index)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragPointerId.current !== e.pointerId || draggingIndex === null) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const card = el?.closest<HTMLElement>('[data-photo-index]')
    const overIndex = card ? Number(card.dataset.photoIndex) : null
    if (overIndex !== null && overIndex !== dragOverIndex) setDragOverIndex(overIndex)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragPointerId.current !== e.pointerId) return
    finishDrag(dragOverIndex)
  }

  const setStatus = async (photo: CafePhoto, status: CafePhoto['status']) => {
    if (status === 'approved' && slotsLeft === 0) {
      onToast(`Kafe ini sudah punya ${MAX_PHOTOS} foto (maksimal). Hapus foto lama dulu sebelum menyetujui foto ini.`)
      return
    }
    setBusyId(photo.id)
    const { error } = await supabase
      .from('cafe_photos')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', photo.id)
    setBusyId(null)
    if (error) { onToast(`Gagal update status: ${error.message}`); return }
    load()
  }

  const removePhoto = async (photo: CafePhoto) => {
    if (!confirm('Hapus foto ini secara permanen?')) return
    setBusyId(photo.id)
    await supabase.storage.from(BUCKET).remove([photo.storage_path])
    const { error } = await supabase.from('cafe_photos').delete().eq('id', photo.id)
    setBusyId(null)
    if (error) { onToast(`Gagal menghapus foto: ${error.message}`); return }
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  return (
    <SectionCard icon={<Camera size={16} />} title="Foto Kafe">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-slate-100 animate-pulse" />
          ))
        ) : (
          photos.map((photo, index) => (
            <div
              key={photo.id}
              data-photo-index={index}
              className={[
                'relative group aspect-[3/4] rounded-xl overflow-hidden border bg-slate-50 transition-[opacity,box-shadow]',
                draggingIndex === index ? 'opacity-40' : 'opacity-100',
                dragOverIndex === index && draggingIndex !== index ? 'border-purple-400 ring-2 ring-purple-300' : 'border-slate-100',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a local/optimizable asset */}
              <img src={publicUrl(photo.storage_path)} alt={photo.caption ?? 'Foto kafe'} className="w-full h-full object-cover pointer-events-none" />

              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[photo.status]}`}>
                  {STATUS_LABEL[photo.status]}
                </span>
                {index === 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Sampul</span>
                )}
              </div>

              {/* Drag handle: pointer capture on this element keeps move/up
                  events routed here even once the finger/cursor drifts off
                  it, so this is the one spot that starts a reorder drag.
                  z-10 so this sits above the inset-0 action overlay below it
                  in the DOM — without it, that overlay intercepts these clicks. */}
              <div
                title="Seret buat urutkan ulang"
                onPointerDown={handlePointerDown(index)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'none' }}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-md bg-white/90 flex items-center justify-center text-slate-500 shadow-sm cursor-grab active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <GripVertical size={14} />
              </div>

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-2 gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                {photo.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setStatus(photo, 'approved')}
                      disabled={busyId === photo.id || slotsLeft === 0}
                      title={slotsLeft === 0 ? `Maksimal ${MAX_PHOTOS} foto — hapus foto lama dulu` : 'Setujui'}
                      className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-emerald-600 shadow-sm disabled:opacity-50"
                    >
                      {busyId === photo.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button
                      onClick={() => setStatus(photo, 'rejected')}
                      disabled={busyId === photo.id}
                      title="Tolak"
                      className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-amber-600 shadow-sm disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => removePhoto(photo)}
                  disabled={busyId === photo.id}
                  title="Hapus"
                  className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-red-600 shadow-sm disabled:opacity-50"
                >
                  {busyId === photo.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || slotsLeft === 0}
          className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-purple-500 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          <span className="text-xs font-medium">
            {uploading ? 'Mengunggah...' : slotsLeft === 0 ? 'Maksimal 15 foto' : 'Tambah Foto'}
          </span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {!loading && photos.length === 0 && (
        <p className="text-xs text-slate-400 mt-3">Belum ada foto. Upload langsung dari sini tayang otomatis di peta publik.</p>
      )}
      {!loading && photos.length > 1 && (
        <p className="text-xs text-slate-400 mt-3">Seret (drag) foto buat urutkan ulang — foto pertama jadi sampul di peta publik.</p>
      )}
      {!loading && (
        <p className={`text-xs mt-1.5 ${slotsLeft === 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
          {approvedCount}/{MAX_PHOTOS} foto tayang{slotsLeft === 0 ? ' — hapus foto lama dulu untuk menambah atau menyetujui foto baru.' : ''}
        </p>
      )}

      {pendingFiles.length > 0 && (
        <PhotoCropModal
          key={pendingFiles.length}
          file={pendingFiles[0]}
          position={queueTotal - pendingFiles.length + 1}
          total={queueTotal}
          onConfirm={handleCropConfirm}
          onSkip={advanceQueue}
        />
      )}
    </SectionCard>
  )
}
