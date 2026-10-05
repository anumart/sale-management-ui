import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Where the tab bar with this key was when it last unmounted. Only reused right after a route switch. */
const lastPosition = new Map<string, { index: number; at: number }>()
const MEMORY_MS = 1500

/** Springy easing shared by the sliding tab indicators (SectionTabs, SegmentedControl mask). */
export const spring = 'cubic-bezier(0.34, 1.25, 0.64, 1)'

/** Tab box inside the track: offsets from the track's left/right padding edges, plus its width. */
export interface TabRect {
  left: number
  right: number
  width: number
}

/**
 * Tracks the index the indicator is drawn at (`shown`) and the measured box of every tab.
 * `shown` starts at the remembered tab and moves to `index` once painted, so the change animates.
 * The track element must be the tabs' offset parent (position: relative).
 */
export function useTabIndicator<T extends HTMLElement = HTMLDivElement>(index: number, count: number, memoryKey?: string) {
  const trackRef = useRef<T>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [rects, setRects] = useState<TabRect[] | null>(null)
  const [shown, setShown] = useState(() => {
    const mem = memoryKey ? lastPosition.get(memoryKey) : undefined
    return mem && Date.now() - mem.at < MEMORY_MS && mem.index < count ? mem.index : index
  })
  const [ready, setReady] = useState(false)
  // Bumps on every move so one-shot keyframe animations (the hop) restart
  const [moves, setMoves] = useState(0)
  const shownRef = useRef(shown)

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () =>
      setRects(
        itemRefs.current.slice(0, count).map((el) => {
          if (!el) return { left: 0, right: 0, width: 0 }
          return { left: el.offsetLeft, right: track.clientWidth - el.offsetLeft - el.offsetWidth, width: el.offsetWidth }
        }),
      )
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    itemRefs.current.forEach((el) => el && ro.observe(el))
    return () => ro.disconnect()
  }, [count])

  // Enable transitions only after the first measured paint, then move to the real tab
  useEffect(() => {
    if (!rects || ready) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [rects, ready])

  useEffect(() => {
    if (!ready || shownRef.current === index) return
    shownRef.current = index
    setShown(index)
    setMoves((m) => m + 1)
  }, [ready, index])

  useEffect(() => {
    if (!memoryKey) return
    return () => {
      lastPosition.set(memoryKey, { index: shownRef.current, at: Date.now() })
    }
  }, [memoryKey])

  return { trackRef, itemRefs, rects, shown, ready, moves }
}
