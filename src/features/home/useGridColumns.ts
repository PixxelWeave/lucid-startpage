import { useLayoutEffect, useState, type RefObject } from 'react'
import { lengthPx } from '@/lib/tokens'

/**
 * 实际使用的网格列数：设置的列数，但不超过容器宽度能容纳的列数。
 * 列宽 / 列间距读取设计 token，与网格样式保持一致。
 */
export function useGridColumns(containerRef: RefObject<HTMLElement | null>, wanted: number): number {
  const [capacity, setCapacity] = useState(wanted)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const tile = lengthPx('--layout-tile-width')
    const gap = lengthPx('--space-2')

    const update = () => {
      const style = getComputedStyle(el)
      const width = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      setCapacity(Math.max(1, Math.floor((width + gap) / (tile + gap))))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  return Math.min(wanted, capacity)
}
