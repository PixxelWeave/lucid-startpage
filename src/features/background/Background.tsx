import { useEffect, useState } from 'react'
import { useSettings } from '@/features/settings/SettingsContext'
import { BackgroundView } from './BackgroundView'
import { cropFromSettings } from './crop'
import { paintBackground } from './paint'
import { useBackgroundImage } from './useBackgroundImage'
import styles from './Background.module.scss'

/**
 * 自定义背景图层，位于页面最底层。
 * <body> 上先铺模糊占位图（paint.ts，首屏渲染前同步铺上）；本图层同样先显示占位图，原图加载完成后淡入。
 * 手机 Safari 标签页中本图层向上下延伸到工具栏后面（见 Background.module.scss）。
 */
export function Background() {
  const { settings } = useSettings()
  const image = useBackgroundImage(settings.backgroundImage)
  /** 原图长宽比，供首屏占位图按同样的缩放铺底（paint.ts） */
  const [ratio, setRatio] = useState<{ url: string; value: number } | null>(null)
  const crop = cropFromSettings(settings)

  const placeholder = image.status === 'ready' ? image.placeholder : null
  const imageRatio = image.status === 'ready' && ratio?.url === image.url ? ratio.value : undefined
  const settled = image.status !== 'loading' && image.status !== 'error'
  const { x, y, zoom } = crop
  useEffect(() => {
    // 读取中或出错时保留现有占位图，避免闪烁
    if (!settled) return
    paintBackground(placeholder ? { placeholder, dim: settings.backgroundDim, x, y, zoom, ratio: imageRatio } : null)
  }, [settled, placeholder, settings.backgroundDim, x, y, zoom, imageRatio])

  if (image.status !== 'ready') return null
  return (
    <BackgroundView
      className={styles.background}
      image={image}
      crop={crop}
      dim={settings.backgroundDim}
      aria-hidden="true"
      onImageLoad={(img) => setRatio({ url: image.url, value: img.naturalWidth / img.naturalHeight })}
    />
  )
}
