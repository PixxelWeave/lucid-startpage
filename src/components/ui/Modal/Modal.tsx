import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { holdScrim } from '@/lib/scrim'
import { usePresence } from '@/lib/usePresence'
import styles from './Modal.module.scss'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** 标题下方的说明文字 */
  description?: ReactNode
  /** 底部操作区，通常放 Button */
  actions?: ReactNode
  children?: ReactNode
  /** md：普通对话框；wide：双栏表单；lg：固定高度的大面板（如设置） */
  size?: 'md' | 'wide' | 'lg'
  /** 不渲染标题与内边距，由 children 完全控制布局；title 仅用作无障碍名称 */
  bare?: boolean
  /**
   * 紧凑布局（手机）下显示为从底部弹出的 sheet（Google 系应用的样式）。
   * 内容中带 data-sheet-grab 的区域（拖动条 / 标题栏）可以向下拖动关闭。
   */
  sheet?: boolean
}

/** 向下拖动超过 sheet 高度的这个比例，或松手时速度足够快，即关闭 */
const DISMISS_RATIO = 0.25
const DISMISS_VELOCITY = 0.5 // px/ms

interface Drag {
  pointerId: number
  startY: number
  lastY: number
  lastTime: number
  velocity: number
}

/**
 * 基于原生 <dialog> 的模态框：自带焦点管理、Esc 关闭、顶层渲染。
 * 点击遮罩关闭。打开时自动聚焦带 data-autofocus 属性的元素。
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  actions,
  children,
  size = 'md',
  bare = false,
  sheet = false,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // 只有按下和松开都在遮罩上才关闭，避免在输入框里拖选文字时误关
  const pressedBackdrop = useRef(false)
  const drag = useRef<Drag | null>(null)
  // 出现 / 退场（统一机制，见 lib/usePresence.ts）：关闭时先播放退场动画，结束后再真正关闭
  usePresence(ref, open, {
    isShown: (dialog) => dialog.open,
    show: (dialog) => {
      dialog.showModal()
      // React 的 autoFocus 在 dialog 打开前执行会失效，改用 data-autofocus 标记。
      // 没有标记时聚焦弹窗本身：浏览器默认会聚焦第一个按钮（如关闭），
      // 触屏上会显示出焦点圈；键盘用户按 Tab 仍可依次进入各个控件。
      // sheet（手机）不自动聚焦输入框：键盘会在 sheet 滑入时弹出，把它顶出屏幕
      const target = (!sheet && dialog.querySelector<HTMLElement>('[data-autofocus]')) || dialog
      target.focus()
    },
    hide: (dialog) => dialog.close(),
  })

  // 遮罩：不用 ::backdrop（手机 Safari 会据此给工具栏着色），改用随文档铺满的遮罩（见 lib/scrim.ts）
  useEffect(() => (open ? holdScrim() : undefined), [open])

  // ---- sheet 拖动关闭 ----
  const startDrag = (e: PointerEvent<HTMLDialogElement>) => {
    const target = e.target as Element
    // 拖动条里的按钮（关闭 / 返回）照常点击
    if (!sheet || !target.closest('[data-sheet-grab]') || target.closest('button')) return
    drag.current = { pointerId: e.pointerId, startY: e.clientY, lastY: e.clientY, lastTime: e.timeStamp, velocity: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const moveDrag = (e: PointerEvent<HTMLDialogElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const dt = e.timeStamp - d.lastTime
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt
    d.lastY = e.clientY
    d.lastTime = e.timeStamp
    // 只能向下拖；跟手时关闭过渡
    const dy = Math.max(0, e.clientY - d.startY)
    e.currentTarget.style.transition = 'none'
    e.currentTarget.style.transform = `translateY(${dy}px)`
  }

  const endDrag = (e: PointerEvent<HTMLDialogElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    const dialog = e.currentTarget
    const dy = Math.max(0, d.lastY - d.startY)
    const dismiss = dy > dialog.offsetHeight * DISMISS_RATIO || d.velocity > DISMISS_VELOCITY
    // 关闭时先标记退场状态，从手指松开的位置直接滑出（否则会先弹回一点再关闭）
    if (dismiss) dialog.dataset.closing = ''
    // 清掉内联样式：从当前位置过渡回原位，或过渡到退场状态
    dialog.style.removeProperty('transition')
    dialog.style.removeProperty('transform')
    if (dismiss) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, styles[size], sheet && styles.sheet)}
      // 可被程序聚焦（见上），但不进入 Tab 顺序
      tabIndex={-1}
      aria-labelledby={bare ? undefined : titleId}
      aria-label={bare ? title : undefined}
      onCancel={(e) => {
        // 由父组件控制开关
        e.preventDefault()
        onClose()
      }}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget
        startDrag(e)
      }}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose()
        pressedBackdrop.current = false
      }}
    >
      {bare ? (
        children
      ) : (
        <div className={styles.surface}>
          {/* 标题区：sheet 下可向下拖动关闭 */}
          <div className={styles.header} data-sheet-grab={sheet || undefined}>
            {sheet && <SheetHandle />}
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {children && <div className={styles.body}>{children}</div>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
    </dialog>
  )
}

/** sheet 顶部的拖动条（只在紧凑布局下显示）。bare 的 sheet 内容需自行放在 data-sheet-grab 区域中 */
export function SheetHandle() {
  return <span className={styles.handle} aria-hidden="true" />
}
