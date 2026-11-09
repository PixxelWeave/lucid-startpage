import type { InputHTMLAttributes } from 'react'
import styles from './Switch.module.scss'

interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * M3 开关。基于原生 checkbox，放在 <label> 内时点击整行即可切换。
 */
export function Switch({ checked, onChange, ...rest }: SwitchProps) {
  return (
    <span className={styles.switch}>
      <input
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...rest}
      />
      <span className={styles.handle} aria-hidden="true" />
    </span>
  )
}
