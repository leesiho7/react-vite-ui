'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 컨테이너의 실제 가로 폭(px)을 측정해 돌려준다. enabled=false 이면 측정하지 않고 null.
 * SVG 차트가 viewBox 고정 폭(340) 때문에 패널 가운데에 작게 그려지던 문제를 푸는 데 쓴다.
 */
export function useContainerWidth(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    const read = () => {
      const w = Math.floor(el.getBoundingClientRect().width)
      if (w > 0) setWidth(w)
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [enabled])

  return { ref, width }
}
