import type { CSSProperties } from 'react'
import type { Settings } from '@/features/settings/types'

/**
 * 背景图片的裁切：不改动原图，只记录“显示哪一部分”，按任意长宽比的容器都能还原。
 *
 * 模型（与 CSS 等价，见 BackgroundView.module.scss）：图片先按 cover 铺满容器，再放大 zoom 倍，
 * 显示尺寸 dw × dh；x / y 为水平 / 垂直方向的位置比例（0 = 贴左 / 上，1 = 贴右 / 下），
 * 即图片左上角位于 (x · (W − dw), y · (H − dh))。
 * CSS 写法：object-fit: cover + object-position: x y，再以同一点为原点 scale(zoom)，展开后正好是上式，
 * 且放大后仍铺满容器。
 */
export interface BackgroundCrop {
  /** 0–1 */
  x: number
  /** 0–1 */
  y: number
  /** ≥ 1，相对 cover 的放大倍数 */
  zoom: number
}

export const DEFAULT_CROP: BackgroundCrop = { x: 0.5, y: 0.5, zoom: 1 }
export const MAX_ZOOM = 4

/** 设置里以百分比保存（backgroundX / backgroundY / backgroundZoom） */
export function cropFromSettings(s: Pick<Settings, 'backgroundX' | 'backgroundY' | 'backgroundZoom'>): BackgroundCrop {
  return { x: s.backgroundX / 100, y: s.backgroundY / 100, zoom: s.backgroundZoom / 100 }
}

export function cropToSettings(c: BackgroundCrop): Pick<Settings, 'backgroundX' | 'backgroundY' | 'backgroundZoom'> {
  return { backgroundX: c.x * 100, backgroundY: c.y * 100, backgroundZoom: c.zoom * 100 }
}

/** 写到容器上的 CSS 变量 */
export function cropVars(c: BackgroundCrop): CSSProperties {
  return {
    '--crop-x': `${c.x * 100}%`,
    '--crop-y': `${c.y * 100}%`,
    '--crop-zoom': c.zoom,
  } as CSSProperties
}

/**
 * 背景图层的长宽比（宽 / 高）。图层铺满 #root（整个文档），裁切与预览都以它为准；
 * 桌面与主屏幕模式下即为视口，手机 Safari 标签页中还包括工具栏后面的部分。
 */
export function backgroundAspect(): number {
  const rect = document.getElementById('root')?.getBoundingClientRect()
  if (rect && rect.width > 0 && rect.height > 0) return rect.width / rect.height
  return window.innerWidth / window.innerHeight
}
