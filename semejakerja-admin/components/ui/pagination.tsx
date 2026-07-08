'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

// Compact page list with ellipses: first, last, current ±1.
function pageWindow(current: number, count: number): (number | 'ellipsis')[] {
  const out: (number | 'ellipsis')[] = []
  for (let i = 1; i <= count; i++) {
    if (i === 1 || i === count || (i >= current - 1 && i <= current + 1)) {
      out.push(i)
    } else if (out[out.length - 1] !== 'ellipsis') {
      out.push('ellipsis')
    }
  }
  return out
}

export function Pagination({ page, pageCount, total, pageSize, onPageChange, itemLabel = 'data' }: PaginationProps) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Menampilkan <span className="font-medium text-slate-500">{from}–{to}</span> dari {total} {itemLabel}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
          >
            <ChevronLeft size={16} />
          </button>
          {pageWindow(page, pageCount).map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e${i}`} className="px-1.5 text-slate-300 text-sm select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition ${
                  p === page ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Halaman berikutnya"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
