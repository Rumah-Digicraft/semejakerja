'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle, Loader2 } from 'lucide-react'
import { usePendingActions } from '@/lib/usePendingActions'

export default function NotificationBell() {
  const { groups, total, loading, refresh } = usePendingActions()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) refresh() }}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition"
        title="Notifikasi"
      >
        <Bell size={19} className="text-slate-600" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-sm text-slate-800">Perlu Tindakan</p>
            {total > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{total} item</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="animate-spin text-slate-300" size={20} />
              </div>
            ) : groups.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="mx-auto text-emerald-400 mb-1.5" size={26} />
                <p className="text-xs text-slate-500 font-medium">Semua bersih, tidak ada yang perlu ditindaklanjuti.</p>
              </div>
            ) : groups.map(g => (
              <Link
                key={g.key}
                href={g.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition"
              >
                <span className="text-sm text-slate-700">{g.label}</span>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">{g.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
