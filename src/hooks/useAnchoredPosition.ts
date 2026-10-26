import { useLayoutEffect, useState, type RefObject } from 'react'

export interface AnchoredPosition {
  left: number
  /** Width of the anchor — panels that need a fixed width ignore it. */
  width: number
  /** Set when the panel opens downward. */
  top?: number
  /** Set when the panel opens upward. */
  bottom?: number
  maxHeight: number
}

interface Options {
  /** Tallest the panel may grow (px). */
  maxHeight?: number
  /** Open upward when the room below is smaller than this and the room above is larger (px). */
  minBelow?: number
  /** Keeps a panel of this fixed width inside the viewport horizontally. */
  panelWidth?: number
}

const GAP = 8
const EDGE = 12

/** Where to place a fixed-position panel under (or over) `anchor`; follows scroll and resize while `open`. */
export function useAnchoredPosition(open: boolean, anchor: RefObject<HTMLElement | null>, { maxHeight = 320, minBelow = 220, panelWidth }: Options = {}) {
  const [pos, setPos] = useState<AnchoredPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = anchor.current?.getBoundingClientRect()
      if (!r) return
      const below = window.innerHeight - r.bottom - GAP - EDGE
      const above = r.top - GAP - EDGE
      const up = below < minBelow && above > below
      const left = panelWidth ? Math.max(8, Math.min(r.left, window.innerWidth - panelWidth - 8)) : r.left
      setPos({
        left,
        width: r.width,
        maxHeight: Math.min(maxHeight, up ? above : below),
        ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor, maxHeight, minBelow, panelWidth])

  return open ? pos : null
}
