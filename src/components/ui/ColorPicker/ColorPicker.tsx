import type { CSSProperties } from 'react'
import { cx } from '@/lib/cx'
import { toHex6 } from '@/lib/color'
import { Icon } from '../Icon/Icon'
import styles from './ColorPicker.module.scss'

export interface ColorSwatch {
  /** CSS 颜色；null 表示“默认” */
  value: string | null
  label: string
}

interface ColorPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  swatches: readonly ColorSwatch[]
  /** 无障碍名称 */
  label: string
  disabled?: boolean
  /**
   * value 为 null 的色块外观：tile 显示图标默认底色；
   * theme 表示“跟随主题”，显示为半明半暗
   */
  defaultSwatch?: 'tile' | 'theme'
}

const same = (a: string | null, b: string | null) =>
  a === b || (a !== null && b !== null && toHex6(a) === toHex6(b))

/**
 * 颜色选择：预设色块 + 自定义颜色（系统取色器）。
 * value 为 null 的色块显示为默认底色（tile token），或“跟随主题”（defaultSwatch="theme"）。
 */
export function ColorPicker({
  value,
  onChange,
  swatches,
  label,
  disabled,
  defaultSwatch = 'tile',
}: ColorPickerProps) {
  const isCustom = !swatches.some((s) => same(s.value, value))

  return (
    <div className={cx(styles.picker, disabled && styles.disabled)} role="radiogroup" aria-label={label}>
      {swatches.map((s) => (
        <button
          key={s.value ?? 'default'}
          type="button"
          role="radio"
          aria-checked={same(s.value, value)}
          aria-label={s.label}
          title={s.label}
          disabled={disabled}
          className={cx(styles.swatch, s.value === null && defaultSwatch === 'theme' && styles.theme)}
          style={s.value ? ({ '--swatch': s.value } as CSSProperties) : undefined}
          onClick={() => onChange(s.value)}
        />
      ))}
      <label
        className={cx(styles.swatch, styles.custom)}
        aria-checked={isCustom}
        title="自定义颜色"
        style={isCustom && value ? ({ '--swatch': value } as CSSProperties) : undefined}
      >
        <input
          type="color"
          className={styles.native}
          value={toHex6(value)}
          disabled={disabled}
          aria-label="自定义颜色"
          onChange={(e) => onChange(e.target.value)}
        />
        <Icon name="palette" size={16} />
      </label>
    </div>
  )
}
