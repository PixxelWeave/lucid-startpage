import type { InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { Icon } from '../Icon/Icon'
import styles from './SearchField.module.scss'

interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  /** 无障碍名称 */
  label: string
}

/**
 * 圆角搜索框：前置搜索图标，有内容时显示清空按钮。
 * 回车不会提交外层表单；有内容时 Esc 先清空（不会关闭所在的对话框）。
 */
export function SearchField({ value, onChange, label, onKeyDown, className, ...rest }: SearchFieldProps) {
  return (
    <div className={cx(styles.field, className)}>
      <Icon name="search" size={20} className={styles.icon} />
      <input
        type="search"
        className={styles.input}
        value={value}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault()
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            onChange('')
          }
          onKeyDown?.(e)
        }}
        {...rest}
      />
      {value && (
        <button type="button" className={styles.clear} aria-label="清空" onClick={() => onChange('')}>
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  )
}
