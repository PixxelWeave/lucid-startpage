import { useId, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import styles from './ListItem.module.scss'

interface ListItemProps {
  title: ReactNode
  description?: ReactNode
  /** 前置内容，通常是 IconTile */
  leading?: ReactNode
  /** 后置内容：Switch、SegmentedButton、文字或箭头图标 */
  trailing?: ReactNode
  /** 提供时整行渲染为按钮 */
  onClick?: () => void
  /** 整行渲染为 <label>，点击任意位置即可操作 trailing 中的表单控件 */
  asLabel?: boolean
  danger?: boolean
  disabled?: boolean
}

/**
 * 设置项列表行。放在 Card 中时，相邻行之间自动出现分隔线。
 */
export function ListItem({
  title,
  description,
  leading,
  trailing,
  onClick,
  asLabel,
  danger,
  disabled,
}: ListItemProps) {
  const descId = useId()
  const className = cx(
    styles.item,
    (onClick || asLabel) && styles.interactive,
    danger && styles.danger,
    disabled && styles.disabled,
  )

  const content = (
    <>
      {leading}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {description && (
          <span id={descId} className={styles.description}>
            {description}
          </span>
        )}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={disabled}
        aria-describedby={description ? descId : undefined}
      >
        {content}
      </button>
    )
  }
  if (asLabel) return <label className={className}>{content}</label>
  return <div className={className}>{content}</div>
}
