'use client'

import { useEffect, useState } from 'react'

/** The element's width in pixels, measured on mount and on every resize. */
export function useWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }
    // Measure now for the first paint, then follow resizes.
    setWidth(element.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}
