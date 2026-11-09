import { useEffect, useState, type CSSProperties } from 'react'
import type { ClockSettings } from '@/features/settings/types'
import { cx } from '@/lib/cx'
import { formatDate, formatTime } from './format'
import styles from './Clock.module.scss'

interface ClockProps {
  settings: ClockSettings
  /** 设置里的预览：尺寸较小 */
  compact?: boolean
}

function Clock({ settings, compact }: ClockProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const date = formatDate(now, settings.dateFormat, settings.showWeekday)

  return (
    <div
      className={cx(styles.clock, compact && styles.compact)}
      data-font={settings.clockFont}
      data-weight={settings.clockWeight}
      style={
        {
          // 用户选择的颜色（内容色）；未设置时由样式按主题取 token
          '--clock-color': settings.clockColor ?? undefined,
          '--clock-opacity': settings.clockOpacity / 100,
        } as CSSProperties
      }
    >
      <time className={styles.time} dateTime={now.toISOString()}>
        {formatTime(now, settings.use24Hour)}
      </time>
      {date && <div className={styles.date}>{date}</div>}
    </div>
  )
}

export default Clock
