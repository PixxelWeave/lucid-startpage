import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cx } from '@/lib/cx'
import { Icon } from '../Icon/Icon'
import styles from './ExpandableSearch.module.scss'

interface ExpandableSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  /** 无障碍名称，同时作为收起状态按钮的悬停提示 */
  label: string
  placeholder?: string
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  tabIndex?: number
}

/**
 * 可展开的搜索：收起时是圆形图标按钮，点击后向右展开为搜索框并聚焦。
 * - 内容为空时失去焦点或按 Esc 收起；有内容时 Esc 先清空
 * - 回车不会提交外层表单；处理过的 Esc 会 preventDefault，外层可据此忽略
 */
export function ExpandableSearch({
  open,
  onOpenChange,
  value,
  onChange,
  label,
  placeholder,
  onKeyDown,
  tabIndex,
}: ExpandableSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <div className={cx(styles.root, open && styles.open)}>
      <button
        type="button"
        className={styles.toggle}
        aria-label={label}
        title={open ? undefined : label}
        aria-expanded={open}
        tabIndex={tabIndex}
        // 保持输入框焦点，避免展开状态下点击图标先触发失焦收起
        onMouseDown={(e) => open && e.preventDefault()}
        onClick={() => (open ? inputRef.current?.focus() : onOpenChange(true))}
      >
        <Icon name="search" size={20} />
      </button>
      <input
        ref={inputRef}
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        tabIndex={open ? tabIndex : -1}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!value) onOpenChange(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault()
          if (e.key === 'Escape') {
            e.preventDefault()
            if (value) onChange('')
            else {
              onOpenChange(false)
              e.currentTarget.blur()
            }
          }
          onKeyDown?.(e)
        }}
      />
      {open && value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="清空"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange('')}
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  )
}
