import { useRef, type TouchEvent } from 'react'

interface LongPressOptions {
  /** 按住多久触发（ms） */
  delay: number
  /** 期间移动超过此距离（px）则取消，如开始滚动 */
  tolerance: number
}

/**
 * 触屏长按。返回需绑定到元素上的 touch 事件处理函数。
 * 触发后，松手时阻止随后的 click（避免长按后又打开链接）。
 */
export function useLongPress(onLongPress: (el: HTMLElement) => void, { delay, tolerance }: LongPressOptions) {
  const timer = useRef<number | undefined>(undefined)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    origin.current = null
  }

  return {
    onTouchStart(e: TouchEvent<HTMLElement>) {
      clear()
      fired.current = false
      if (e.touches.length !== 1) return
      const { clientX, clientY } = e.touches[0]
      origin.current = { x: clientX, y: clientY }
      const el = e.currentTarget
      timer.current = window.setTimeout(() => {
        fired.current = true
        onLongPress(el)
      }, delay)
    },
    onTouchMove(e: TouchEvent<HTMLElement>) {
      const touch = e.touches[0]
      const start = origin.current
      if (start && touch && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > tolerance) clear()
    },
    onTouchEnd(e: TouchEvent<HTMLElement>) {
      clear()
      if (fired.current) {
        fired.current = false
        e.preventDefault()
      }
    },
    onTouchCancel() {
      clear()
    },
  }
}
