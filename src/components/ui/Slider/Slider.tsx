import type { CSSProperties } from 'react'
import styles from './Slider.module.scss'

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** 无障碍名称 */
  label: string
  /** 右侧显示的数值文本 */
  format?: (value: number) => string
  disabled?: boolean
}

/** M3 连续滑块，基于原生 range input。 */
export function Slider({ value, min, max, step = 1, onChange, label, format, disabled }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100

  return (
    <span className={styles.slider}>
      <input
        type="range"
        className={styles.input}
        style={{ '--percent': `${percent}%` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={format?.(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {format && <span className={styles.value}>{format(value)}</span>}
    </span>
  )
}
