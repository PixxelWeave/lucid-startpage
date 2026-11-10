import { useLayoutEffect, useRef, type RefObject } from 'react'
import { playExit } from './exitTransition'

interface PresenceHandlers<T extends HTMLElement> {
  /** 是否已显示（dialog.open / :popover-open） */
  isShown: (el: T) => boolean
  /** 显示：showModal / showPopover 等。进场动画由 CSS 的 @starting-style 负责 */
  show: (el: T) => void
  /** 退场动画结束后真正关闭：close / hidePopover */
  hide: (el: T) => void
  /** 关闭时是否播放退场动画，默认播放；false 时直接隐藏（如菜单） */
  animateExit?: boolean
}

/**
 * 浮层（Modal / Menu / Snackbar）统一的出现与退场：
 * - open 变为 true：显示，CSS 播放进场动画；若正在退场则取消，过渡平滑反向
 * - open 变为 false：先播放退场动画（[data-closing]，见 lib/exitTransition.ts），结束后再关闭
 *
 * 在绘制前执行（layout effect），调用方之后声明的 layout effect（如定位）可依赖已显示的元素。
 */
export function usePresence<T extends HTMLElement>(
  ref: RefObject<T | null>,
  open: boolean,
  handlers: PresenceHandlers<T>,
) {
  const cancelExit = useRef<(() => void) | null>(null)
  // 回调可能依赖最新的 props（如是否 sheet），用 ref 读取，不作为依赖；
  // 在下面的 layout effect 之前更新（同类 effect 按声明顺序执行）
  const latest = useRef(handlers)
  useLayoutEffect(() => {
    latest.current = handlers
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { isShown, show, hide, animateExit = true } = latest.current
    if (open) {
      cancelExit.current?.()
      cancelExit.current = null
      if (!isShown(el)) show(el)
      return
    }
    if (!isShown(el) || cancelExit.current) return
    if (!animateExit) {
      hide(el)
      return
    }
    cancelExit.current = playExit(el, () => {
      cancelExit.current = null
      hide(el)
    })
  }, [ref, open])
}
