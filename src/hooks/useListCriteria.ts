import { useState } from 'react'

/**
 * Search/filter state for a list page plus its current page number. Every change goes back to page 1 so the user
 * never lands on a page that no longer exists after the result set shrinks.
 */
export function useListCriteria<C extends object>(empty: C) {
  const [criteria, setCriteria] = useState<C>(empty)
  const [page, setPage] = useState(1)

  const update = (patch: Partial<C>) => {
    setCriteria((c) => ({ ...c, ...patch }))
    setPage(1)
  }
  const clear = () => {
    setCriteria(empty)
    setPage(1)
  }
  return { criteria, update, clear, page, setPage }
}
