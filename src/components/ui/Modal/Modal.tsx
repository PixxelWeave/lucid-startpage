import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
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
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // 只有按下和松开都在遮罩上才关闭，避免在输入框里拖选文字时误关
  const pressedBackdrop = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // React 的 autoFocus 在 dialog 打开前执行会失效，改用 data-autofocus 标记
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, styles[size])}
      aria-labelledby={bare ? undefined : titleId}
      aria-label={bare ? title : undefined}
      onCancel={(e) => {
        // 由父组件控制开关
        e.preventDefault()
        onClose()
      }}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose()
        pressedBackdrop.current = false
      }}
    >
      {bare ? (
        children
      ) : (
        <div className={styles.surface}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description && <p className={styles.description}>{description}</p>}
          {children && <div className={styles.body}>{children}</div>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
    </dialog>
  )
}
