import { useEffect, useState } from 'react'
import { useSettings } from '@/features/settings/SettingsContext'
import { cx } from '@/lib/cx'
import { paintBackground } from './paint'
import { useBackgroundImage } from './useBackgroundImage'
import styles from './Background.module.scss'

/**
 * 自定义背景图层，位于页面最底层。
 * <body> 上先铺模糊占位图（paint.ts），原图加载完成后在此淡入；两者都叠加同样的遮罩。
 */
export function Background() {
  const { settings } = useSettings()
  const image = useBackgroundImage(settings.backgroundImage)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)

  const placeholder = image.status === 'ready' ? image.placeholder : null
  const settled = image.status !== 'loading' && image.status !== 'error'
  useEffect(() => {
    // 读取中或出错时保留现有占位图，避免闪烁
    if (!settled) return
    paintBackground(placeholder ? { placeholder, dim: settings.backgroundDim } : null)
  }, [settled, placeholder, settings.backgroundDim])

  if (image.status !== 'ready') return null
  return (
    <div className={cx(styles.background, loadedUrl === image.url && styles.loaded)} aria-hidden="true">
      <img
        className={styles.image}
        src={image.url}
        alt=""
        decoding="async"
        onLoad={() => setLoadedUrl(image.url)}
      />
    </div>
  )
}
