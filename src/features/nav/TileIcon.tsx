import { useState, type CSSProperties } from 'react'
import { isDarkColor } from '@/lib/color'
import { cx } from '@/lib/cx'
import { hostnameOf } from '@/lib/url'
import { iconImageSrc, MIN_FAVICON_SIZE } from './icon'
import type { NavIcon } from './types'
import styles from './TileIcon.module.scss'

interface TileIconProps {
  name: string
  url: string
  icon: NavIcon
  /** md：主页图标（64px）；sm：候选列表（48px） */
  size?: 'md' | 'sm'
}

/**
 * 导航图标：圆角矩形底板 + 图案。
 * 按 NavIcon 的背景填充 / 缩放 / 背景颜色渲染；图片加载失败（或 favicon 不清晰）时显示首字。
 */
export function TileIcon({ name, url, icon, size = 'md' }: TileIconProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const src = iconImageSrc(icon.source, url)
  const percent = `${Math.round(icon.scale * 100)}%`

  const tileStyle: CSSProperties | undefined =
    icon.fill && icon.background ? { background: icon.background } : undefined
  const className = cx(styles.icon, styles[size], !icon.fill && styles.bare)

  if (src && src !== failedSrc) {
    return (
      <span className={className} style={tileStyle}>
        <img
          key={src}
          className={styles.image}
          style={{ width: percent, height: percent }}
          src={src}
          alt=""
          draggable={false}
          // 候选列表可能有几十个图标，滚动到可见区域再加载
          loading="lazy"
          onError={() => setFailedSrc(src)}
          onLoad={(e) => {
            // Google 对未知站点返回 16px 默认图标而非报错；不清晰的 favicon 一律改用首字
            if (icon.source.kind === 'favicon' && e.currentTarget.naturalWidth < MIN_FAVICON_SIZE) {
              setFailedSrc(src)
            }
          }}
        />
      </span>
    )
  }

  const label = name.trim() || hostnameOf(url) || '?'
  // 首字颜色随底色深浅切换；无填充时跟随页面文字颜色
  const letterClass = !icon.fill
    ? styles.letterOnSurface
    : icon.background && isDarkColor(icon.background)
      ? styles.letterOnDark
      : styles.letterOnLight

  return (
    <span className={className} style={tileStyle} aria-hidden="true">
      <svg className={cx(styles.letter, letterClass)} viewBox="0 0 100 100">
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={icon.scale * 100}
          fontWeight={500}
          fill="currentColor"
        >
          {Array.from(label)[0].toUpperCase()}
        </text>
      </svg>
    </span>
  )
}
