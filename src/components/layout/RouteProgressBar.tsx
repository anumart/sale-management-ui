import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

/**
 * Thin bar fixed to the very top of the viewport. Grows (slowly, easing out) while a route
 * navigation is pending — e.g. fetching a lazy-loaded feature chunk — then snaps to 100% and
 * fades out once it resolves. Same idea as YouTube/GitHub/Linear's nav loading bar.
 */
export function RouteProgressBar() {
  const isPending = useRouterState({ select: (s) => s.status === 'pending' })
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const [duration, setDuration] = useState(0)
  const hideTimer = useRef<number | undefined>(undefined)
  const resetTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(hideTimer.current)
    window.clearTimeout(resetTimer.current)

    if (isPending) {
      setVisible(true)
      setDuration(0)
      setWidth(0)
      // Next frame: grow slowly toward (not all the way to) 100% — if the route resolves
      // quickly, only a little of this transition has actually played, same trick NProgress uses.
      const raf = requestAnimationFrame(() => {
        setDuration(4000)
        setWidth(88)
      })
      return () => cancelAnimationFrame(raf)
    }

    // Resolved: snap the rest of the way to 100%, hold briefly, fade out, then reset for next time.
    setDuration(200)
    setWidth(100)
    hideTimer.current = window.setTimeout(() => setVisible(false), 220)
    resetTimer.current = window.setTimeout(() => setWidth(0), 520)
    return undefined
  }, [isPending])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-300 h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 280ms ease' }}
    >
      <div
        className="h-full bg-gradient-to-r from-theme to-accent"
        style={{ width: `${width}%`, transition: `width ${duration}ms cubic-bezier(0.3,0,0.2,1)` }}
      />
    </div>
  )
}
