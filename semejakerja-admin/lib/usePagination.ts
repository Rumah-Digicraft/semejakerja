import { useMemo, useState } from 'react'

export const PAGE_SIZE = 20

// Client-side pagination over an already-loaded (and optionally filtered) array.
// Pass a `resetKey` built from the active filters/tab so the page snaps back to
// page 1 whenever that signature changes; deletions just clamp the page in range.
export function usePagination<T>(items: T[], resetKey?: unknown, pageSize = PAGE_SIZE) {
  const [rawPage, setRawPage] = useState(1)
  const [prevKey, setPrevKey] = useState(resetKey)

  // Adjust-state-during-render (React-sanctioned): reset to page 1 on filter change.
  if (resetKey !== prevKey) {
    setPrevKey(resetKey)
    setRawPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(rawPage, pageCount) // clamp when items shrink

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  )

  const setPage = (p: number) => setRawPage(Math.min(Math.max(1, p), pageCount))

  return { page, setPage, pageCount, pageItems, pageSize, total: items.length }
}
