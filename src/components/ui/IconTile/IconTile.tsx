import { cx } from '@/lib/cx'
import { Icon, type IconName } from '../Icon/Icon'
import styles from './IconTile.module.scss'

export type IconTileTone = 'primary' | 'secondary' | 'tertiary' | 'neutral'

interface IconTileProps {
  icon: IconName
  tone?: IconTileTone
  size?: 'sm' | 'lg'
  className?: string
}

/** 圆角矩形色块 + 图标，用于列表前置图标、分类图标等。 */
export function IconTile({ icon, tone = 'neutral', size = 'sm', className }: IconTileProps) {
  return (
    <span className={cx(styles.tile, styles[tone], styles[size], className)} aria-hidden="true">
      <Icon name={icon} size={size === 'lg' ? 36 : 18} />
    </span>
  )
}
