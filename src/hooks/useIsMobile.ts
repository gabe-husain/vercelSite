'use client'

import { useState, useEffect } from 'react'

/**
 * Detects if viewport is below a breakpoint using matchMedia.
 * SSR-safe: defaults to false, hydrates on mount.
 * Uses matchMedia change event — no resize listener spam.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
