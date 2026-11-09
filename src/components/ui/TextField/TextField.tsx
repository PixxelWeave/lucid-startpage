import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import styles from './TextField.module.scss'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** 错误信息，存在时显示为错误态 */
  error?: string
  /** 辅助说明，error 存在时被替换 */
  hint?: string
}

export function TextField({ label, error, hint, className, id, ...rest }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const supportId = `${inputId}-support`
  const support = error ?? hint

  return (
    <div className={cx(styles.field, error && styles.invalid, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={support ? supportId : undefined}
        {...rest}
      />
      {support && (
        <div id={supportId} className={styles.support}>
          {support}
        </div>
      )}
    </div>
  )
}
