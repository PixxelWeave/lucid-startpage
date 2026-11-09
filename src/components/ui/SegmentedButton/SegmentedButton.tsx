import { Icon } from '../Icon/Icon'
import styles from './SegmentedButton.module.scss'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedButtonProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** 无障碍名称 */
  label: string
}

/** M3 单选分段按钮。 */
export function SegmentedButton<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedButtonProps<T>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={styles.segment}
            onClick={() => onChange(opt.value)}
          >
            {selected && <Icon name="check" size={18} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
