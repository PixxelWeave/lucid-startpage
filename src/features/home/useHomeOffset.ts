import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * 首页状态下图标区的起始位置（px）：时钟区域底部 + gap。
 * 使用 offsetTop / offsetHeight（不受 transform 影响），随尺寸变化更新。
 */
export function useHomeOffset(heroRef: RefObject<HTMLElement | null>, gap: number): number {
  const [offset, setOffset] = useState(0)

  useLayoutEffect(() => {
    const el = heroRef.current
    if (!el) return
    const update = () => setOffset(el.offsetTop + el.offsetHeight + gap)
    update()
    const ro = new ResizeObserver(update)
    // border-box：顶部距离（padding）变化也要重新计算
    ro.observe(el, { box: 'border-box' })
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [heroRef, gap])

  return offset
}
