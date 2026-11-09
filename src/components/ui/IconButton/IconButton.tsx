import type { ButtonHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from '../Icon/Icon'
import styles from './IconButton.module.scss'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName
  /** 无障碍名称，同时作为悬停提示 */
  label: string
  /** standard：透明底；tonal：浅色实底圆形（M3 filled tonal icon button） */
  variant?: 'standard' | 'tonal'
}

/** M3 standard icon button（40×40）。 */
export function IconButton({
  icon,
  label,
  variant = 'standard',
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(styles.iconButton, variant === 'tonal' && styles.tonal, className)}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  )
}
