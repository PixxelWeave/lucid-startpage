import { useEffect, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { cx } from '@/lib/cx'
import { usePresence } from '@/lib/usePresence'
import { swallowNextClick } from '@/lib/swallowClick'
import { Icon, type IconName } from '../Icon/Icon'
import styles from './Menu.module.scss'

export interface MenuItem {
  key: string
  label: string
  icon?: IconName
  /** 危险操作（删除等），使用 error 配色 */
  danger?: boolean
  /** 在此项之前显示分隔线 */
  divider?: boolean
  onSelect: () => void
}

/** 视口坐标下的矩形（DOMRect / dnd-kit 的 ClientRect 均可） */
export interface MenuAnchor {
  left: number
  top: number
  right: number
  bottom: number
}

interface MenuProps {
  open: boolean
  /** 弹出位置（视口坐标），空间不足时自动向左 / 向上翻转 */
  x: number
  y: number
  /**
   * 锚定的元素矩形（如长按的图标）：菜单贴着它显示、不遮挡它。提供时忽略 x / y。
   * 按它在视口中的位置在四个位置中选择：左半边左对齐、右半边右对齐；上半边在下方、下半边在上方
   */
  anchor?: MenuAnchor
  /** 打开后聚焦第一项（键盘 / 鼠标打开时）；触屏打开时关闭，避免显示焦点框 */
  focusFirst?: boolean
  items: readonly MenuItem[]
  onClose: () => void
  /** 无障碍名称 */
  label: string
  /** 顶部标题区（例如网站名称与域名） */
  title?: string
  subtitle?: string
}

/** 与视口边缘保持的最小距离 */
const EDGE = 8

/**
 * 弹出菜单（右键菜单 / 下拉卡片）。基于原生 popover 顶层渲染；点击外部或 Esc 关闭。
 * 使用 manual popover、自行处理关闭：触屏长按时菜单在手指按住期间弹出，
 * 原生的自动关闭会把这次按下与松手当成一次“点击外部”而立刻关掉菜单
 * - 打开后聚焦第一项，方向键 / Home / End 移动，关闭后焦点回到原处
 * - 点击外部关闭时吞掉这次点击，避免误触发下方元素（与系统菜单一致）
 * - 滚动、窗口尺寸变化或失焦时关闭
 */
export function Menu({
  open,
  x,
  y,
  anchor,
  focusFirst = true,
  items,
  onClose,
  label,
  title,
  subtitle,
}: MenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // 出现（统一机制，见 lib/usePresence.ts）：打开时播放进场动画；关闭时直接消失，不播放退场动画
  usePresence(ref, open, {
    isShown: (el) => el.matches(':popover-open'),
    show: (el) => {
      returnFocus.current = document.activeElement as HTMLElement | null
      el.showPopover()
    },
    hide: (el) => el.hidePopover(),
    animateExit: false,
  })

  // 定位（在绘制前完成，避免闪烁；上面已显示，可测量尺寸）
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !open) return
    // 用布局尺寸：弹出动画开始时菜单是缩小的，getBoundingClientRect 会量到缩放后的尺寸
    const width = el.offsetWidth
    const height = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    // 锚定矩形：上下留出 EDGE 间距；点：从该点展开
    const left = anchor ? anchor.left : x
    const right = anchor ? anchor.right : x
    const below = anchor ? anchor.bottom + EDGE : y
    const above = anchor ? anchor.top - EDGE : y
    const fitsBelow = below + height <= vh - EDGE
    const fitsAbove = above - height >= EDGE
    const fitsLeftAligned = left + width <= vw - EDGE
    const fitsRightAligned = right - width >= EDGE

    let alignRight: boolean
    let placeAbove: boolean
    if (anchor) {
      // 四个位置：朝视口中心展开（右半边右对齐，下半边显示在上方）；该侧放不下而另一侧放得下时换边
      const cx = (anchor.left + anchor.right) / 2
      const cy = (anchor.top + anchor.bottom) / 2
      alignRight = cx > vw / 2
      placeAbove = cy > vh / 2
      if (alignRight && !fitsRightAligned && fitsLeftAligned) alignRight = false
      if (!alignRight && !fitsLeftAligned && fitsRightAligned) alignRight = true
      if (placeAbove && !fitsAbove && fitsBelow) placeAbove = false
      if (!placeAbove && !fitsBelow && fitsAbove) placeAbove = true
    } else {
      // 点（右键）：默认向右下展开，放不下时翻转
      alignRight = !fitsLeftAligned
      placeAbove = !fitsBelow
    }

    const clamp = (v: number, max: number) => Math.min(Math.max(EDGE, v), Math.max(EDGE, max))
    // 以上为可视区域坐标；菜单是 absolute（相对文档），加上页面的滚动量
    el.style.left = `${clamp(alignRight ? right - width : left, vw - EDGE - width) + window.scrollX}px`
    el.style.top = `${clamp(placeAbove ? above - height : below, vh - EDGE - height) + window.scrollY}px`
    // 从靠近锚点的角展开
    el.style.transformOrigin = `${alignRight ? 'right' : 'left'} ${placeAbove ? 'bottom' : 'top'}`
    if (focusFirst) el.querySelector<HTMLElement>('[role=menuitem]')?.focus()
  }, [open, x, y, anchor, focusFirst])

  // popover 关闭时通知外部，并归还焦点
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState !== 'closed') return
      onCloseRef.current()
      const active = document.activeElement
      if (active === document.body || el.contains(active)) returnFocus.current?.focus()
    }
    el.addEventListener('toggle', onToggle)
    return () => el.removeEventListener('toggle', onToggle)
  }, [])

  useEffect(() => {
    if (!open) return
    const el = ref.current
    if (!el) return

    const close = () => onCloseRef.current()

    // 菜单打开后在外部按下：关闭，并吞掉这次点击（与系统菜单一致，不误触发下方元素）
    const onPointerDown = (e: PointerEvent) => {
      if (el.contains(e.target as Node)) return
      if (e.button === 0) swallowNextClick()
      close()
    }
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // 标记已处理：外层的 Esc 逻辑（如退出编辑模式）不再响应
      e.preventDefault()
      close()
    }
    document.addEventListener('keydown', onKeyDown, true)

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
    }
  }, [open])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])
    const index = nodes.indexOf(document.activeElement as HTMLElement)
    const focusAt = (i: number) => nodes[(i + nodes.length) % nodes.length]?.focus()

    switch (e.key) {
      case 'ArrowDown':
        focusAt(index + 1)
        break
      case 'ArrowUp':
        focusAt(index - 1)
        break
      case 'Home':
        focusAt(0)
        break
      case 'End':
        focusAt(nodes.length - 1)
        break
      case 'Tab':
        onClose()
        break
      default:
        return
    }
    e.preventDefault()
  }

  return (
    <div
      ref={ref}
      popover="manual"
      // 锚定在元素旁（触屏长按）：从锚点方向弹性弹出，菜单项依次淡入
      className={cx(styles.menu, anchor && styles.anchored)}
      onKeyDown={handleKeyDown}
    >
      {title && (
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      )}
      <div role="menu" aria-label={label} className={styles.items}>
        {items.map((item, index) => (
          <div key={item.key} role="none" style={{ '--index': index } as CSSProperties}>
            {item.divider && <div role="separator" className={styles.divider} />}
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={cx(styles.item, item.danger && styles.danger)}
              onClick={() => {
                onClose()
                item.onSelect()
              }}
            >
              {item.icon && <Icon name={item.icon} size={20} className={styles.icon} />}
              {item.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
