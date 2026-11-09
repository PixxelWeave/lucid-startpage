import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from '../Icon/Icon'
import styles from './Button.module.scss'

export type ButtonVariant = 'filled' | 'tonal' | 'text'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** 危险操作（删除等），使用 error 配色 */
  danger?: boolean
  icon?: IconName
  children: ReactNode
}

export function Button({
  variant = 'filled',
  danger = false,
  icon,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], danger && styles.danger, className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}
