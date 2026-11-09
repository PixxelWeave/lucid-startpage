import { useEffect, useRef } from 'react'
import { durationMs } from '@/lib/tokens'

interface Options {
  expanded: boolean
  onExpand: () => void
  onCollapse: () => void
  /** 编辑模式：禁用触摸手势（避免与长按拖拽冲突）和键盘切换 */
  editing: boolean
}

/** 两次滚轮事件间隔超过此值，视为新的一次手势（触控板惯性事件约 16ms 一个） */
const GESTURE_GAP_MS = 200
/** 首页向下滚动多少触发展开 */
const EXPAND_DELTA = 20
const SWIPE_EXPAND = 40

const overlayOpen = () => document.querySelector('dialog[open], :popover-open') !== null

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/**
 * 首页 ⇄ 展开 的手势：
 * - 展开：首页向下滚动（滚轮 / 触控板）、向上滑（触屏）、↓ / PageDown
 * - 收起：返回按钮（在页面上）或 Esc；不通过滚动收起，避免误触
 *
 * 触发展开的那次滚动手势（含惯性）余下的事件全部忽略，不会滚动图标区；
 * 切换动画期间（duration extra-long）也不接受滚动。
 */
export function useExpandGestures({ expanded, onExpand, onCollapse, editing }: Options) {
  // 最新的 props 放在 ref 里，监听只绑定一次，手势状态不会因重新渲染而丢失
  const latest = useRef({ expanded, editing, onExpand, onCollapse })
  useEffect(() => {
    latest.current = { expanded, editing, onExpand, onCollapse }
  })

  useEffect(() => {
    let lastWheel = 0
    /** 当前滚动手势已用于展开 */
    let consumed = false
    let acc = 0
    let lockedUntil = 0
    const switchMs = durationMs('extra-long')

    const now = () => performance.now()
    const locked = () => now() < lockedUntil

    const expand = () => {
      acc = 0
      lockedUntil = now() + switchMs
      // 进行中的滚动手势（如惯性）余下部分不再生效
      if (now() - lastWheel < GESTURE_GAP_MS) consumed = true
      latest.current.onExpand()
    }

    const onWheel = (e: WheelEvent) => {
      const t = now()
      if (t - lastWheel > GESTURE_GAP_MS) {
        consumed = false
        acc = 0
      }
      lastWheel = t
      if (e.ctrlKey || overlayOpen()) return
      if (consumed || locked()) {
        // 切换只负责进入，不附带滚动
        e.preventDefault()
        return
      }
      if (latest.current.expanded || e.deltaY <= 0) return

      acc += e.deltaY
      if (acc > EXPAND_DELTA) {
        e.preventDefault()
        expand()
      }
    }

    let touchStartY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      const { expanded, editing } = latest.current
      if (touchStartY === null || expanded || editing || overlayOpen() || locked()) return
      const dy = (e.touches[0]?.clientY ?? touchStartY) - touchStartY
      if (dy < -SWIPE_EXPAND) {
        touchStartY = null
        expand()
      }
    }

    // 键盘是明确的意图，不受动画锁限制
    const onKeyDown = (e: KeyboardEvent) => {
      const { expanded, editing } = latest.current
      if (e.defaultPrevented || overlayOpen() || editing) return
      if (!expanded && (e.key === 'ArrowDown' || e.key === 'PageDown') && !isTypingTarget(e.target)) {
        e.preventDefault()
        expand()
      } else if (expanded && e.key === 'Escape') {
        latest.current.onCollapse()
      }
    }

    // 非 passive：需要对已用掉的手势调用 preventDefault
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
