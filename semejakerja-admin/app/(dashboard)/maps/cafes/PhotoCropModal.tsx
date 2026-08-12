'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Loader2 } from 'lucide-react'

// Single standard everywhere a cafe photo is displayed (map cover, lightbox,
// admin grid, Tebak Kafe) — one crop, no per-context re-cropping. Portrait
// 3:4 (not landscape 4:3) — matches the default phone-camera aspect ratio,
// which is what's actually easy for admins to source.
const ASPECT = 3 / 4
export const CROP_OUTPUT_WIDTH = 900
export const CROP_OUTPUT_HEIGHT = 1200

interface PhotoCropModalProps {
  file: File
  /** 1-indexed position and total count, for a "2 dari 5" progress label. */
  position: number
  total: number
  onConfirm: (blob: Blob) => void
  onSkip: () => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', () => reject(new Error('Gagal memuat gambar')))
    img.src = src
  })
}

async function cropToBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = CROP_OUTPUT_WIDTH
  canvas.height = CROP_OUTPUT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak didukung')
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, CROP_OUTPUT_WIDTH, CROP_OUTPUT_HEIGHT)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Gagal mengekspor gambar'))),
      'image/jpeg',
      0.88
    )
  })
}

export default function PhotoCropModal({ file, position, total, onConfirm, onSkip }: PhotoCropModalProps) {
  const [imageSrc] = useState(() => URL.createObjectURL(file))
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [exporting, setExporting] = useState(false)

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedArea || exporting) return
    setExporting(true)
    try {
      const blob = await cropToBlob(imageSrc, croppedArea)
      URL.revokeObjectURL(imageSrc)
      onConfirm(blob)
    } catch {
      setExporting(false)
    }
  }

  const handleSkip = () => {
    URL.revokeObjectURL(imageSrc)
    onSkip()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg text-slate-900">Sesuaikan Foto</h3>
          <span className="text-xs font-medium text-slate-400">{position} dari {total}</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Geser dan zoom biar bagian penting kafe masuk ke frame 3:4. Foto ini dipakai di peta &amp; Tebak Kafe.
        </p>

        {/* Capped by width (not w-full) since 3:4 portrait would otherwise grow
            tall enough to overflow the viewport on shorter screens. */}
        <div className="relative mx-auto w-full max-w-[360px] aspect-[3/4] rounded-xl overflow-hidden bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full accent-purple-600"
          />
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={handleSkip}
            disabled={exporting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            Lewati foto ini
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={exporting || !croppedArea}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {exporting && <Loader2 size={14} className="animate-spin" />}
            {exporting ? 'Memproses...' : 'Pakai Foto Ini'}
          </button>
        </div>
      </div>
    </div>
  )
}
