import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './Snackbar.module.scss'

interface SnackbarProps {
  /** 要显示的消息；null 表示隐藏 */
  message: string | null
  onClose: () => void
  /** 自动隐藏时间（ms） */
  duration?: number
}

/** M3 snackbar：屏幕底部的简短提示，自动消失。顶层渲染，可显示在对话框之上。 */
export function Snackbar({ message, onClose, duration = 3000 }: SnackbarProps) {
  const ref = useRef<HTMLDivElement>(null)
  // 退场动画期间保留上一条文字
  const [text, setText] = useState(message)
  if (message !== null && message !== text) setText(message)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const isOpen = el.matches(':popover-open')
    if (message !== null && !isOpen) el.showPopover()
    if (message === null && isOpen) el.hidePopover()
  }, [message])

  useEffect(() => {
    if (message === null) return
    const id = window.setTimeout(onClose, duration)
    return () => window.clearTimeout(id)
  }, [message, duration, onClose])

  return (
    <div ref={ref} popover="manual" role="status" aria-live="polite" className={styles.snackbar}>
      {text}
    </div>
  )
}
