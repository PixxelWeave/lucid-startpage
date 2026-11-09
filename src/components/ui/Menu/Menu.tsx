import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { cx } from '@/lib/cx'
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

interface MenuProps {
  open: boolean
  /** 弹出位置（视口坐标），空间不足时自动向左 / 向上翻转 */
  x: number
  y: number
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
 * 弹出菜单（右键菜单 / 下拉卡片）。基于原生 popover：顶层渲染，点击外部或 Esc 自动关闭。
 * - 打开后聚焦第一项，方向键 / Home / End 移动，关闭后焦点回到原处
 * - 点击外部关闭时吞掉这次点击，避免误触发下方元素（与系统菜单一致）
 * - 滚动、窗口尺寸变化或失焦时关闭
 */
export function Menu({ open, x, y, items, onClose, label, title, subtitle }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // 打开 / 关闭与定位（在绘制前完成，避免闪烁）
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (!open) {
      if (el.matches(':popover-open')) el.hidePopover()
      return
    }

    if (!el.matches(':popover-open')) {
      returnFocus.current = document.activeElement as HTMLElement | null
      el.showPopover()
    }
    const { width, height } = el.getBoundingClientRect()
    const flipX = x + width > window.innerWidth - EDGE
    const flipY = y + height > window.innerHeight - EDGE
    el.style.left = `${Math.max(EDGE, flipX ? x - width : x)}px`
    el.style.top = `${Math.max(EDGE, flipY ? y - height : y)}px`
    el.style.transformOrigin = `${flipX ? 'right' : 'left'} ${flipY ? 'bottom' : 'top'}`
    el.querySelector<HTMLElement>('[role=menuitem]')?.focus()
  }, [open, x, y])

  // 原生 popover 自行关闭（点击外部 / Esc）时通知外部，并归还焦点
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

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || el.contains(e.target as Node)) return
      const swallow = (ev: MouseEvent) => {
        ev.preventDefault()
        ev.stopPropagation()
      }
      window.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 600)
    }
    const close = () => onCloseRef.current()

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
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
    <div ref={ref} popover="auto" className={styles.menu} onKeyDown={handleKeyDown}>
      {title && (
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      )}
      <div role="menu" aria-label={label} className={styles.items}>
        {items.map((item) => (
          <div key={item.key} role="none">
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
