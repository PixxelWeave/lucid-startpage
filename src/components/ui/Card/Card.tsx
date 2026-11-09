import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import styles from './Card.module.scss'

/** M3 filled card：圆角容器，常用于承载一组 ListItem。 */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.card, className)} {...rest} />
}
