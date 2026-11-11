import { useState, type CSSProperties, type HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { cropVars, type BackgroundCrop } from './crop'
import styles from './BackgroundView.module.scss'

interface BackgroundViewProps extends HTMLAttributes<HTMLDivElement> {
  image: { url: string; placeholder: string }
  crop: BackgroundCrop
  /** 遮罩浓度（%） */
  dim: number
  /** 原图加载完成（可读取 naturalWidth / naturalHeight） */
  onImageLoad?: (img: HTMLImageElement) => void
}

/**
 * 按裁切显示背景图片：先显示模糊占位图，原图加载后淡入，最上层叠加 surface 色遮罩。
 * 首页背景图层与设置里的预览共用，两者效果一致。定位（position）由调用方的 className 决定。
 */
export function BackgroundView({ image, crop, dim, onImageLoad, className, style, ...rest }: BackgroundViewProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)

  return (
    <div
      className={cx(styles.view, loadedUrl === image.url && styles.loaded, className)}
      style={{ ...cropVars(crop), '--dim': `${dim}%`, ...style } as CSSProperties}
      {...rest}
    >
      <img className={styles.placeholder} src={image.placeholder} alt="" />
      <img
        className={styles.image}
        src={image.url}
        alt=""
        decoding="async"
        onLoad={(e) => {
          setLoadedUrl(image.url)
          onImageLoad?.(e.currentTarget)
        }}
      />
    </div>
  )
}
