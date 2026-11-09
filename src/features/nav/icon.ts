import { toHex6 } from '@/lib/color'
import { faviconUrl, faviconUrlForHost } from '@/lib/url'
import type { IconSource, NavIcon } from './types'

export const SCALE_MIN = 0.3
export const SCALE_MAX = 1

/** Google favicon 小于此尺寸（px）视为不清晰，不使用 */
export const MIN_FAVICON_SIZE = 64

const CDN = 'https://files.itab.link/'

/** 各来源的默认外观 */
export const iconPresets = {
  /** iTab 图案铺满在其底色上 = 原始图标 */
  library: (path: string, background: string | null): NavIcon => ({
    source: { kind: 'library', path },
    fill: true,
    scale: 1,
    // 白色即默认底色，统一记为 null
    background: background && toHex6(background, '') !== '#ffffff' ? background : null,
  }),
  favicon: (domain?: string): NavIcon => ({
    source: domain ? { kind: 'favicon', domain } : { kind: 'favicon' },
    fill: true,
    scale: 0.6,
    background: null,
  }),
  letter: (): NavIcon => ({ source: { kind: 'letter' }, fill: true, scale: 0.5, background: null }),
  image: (src: string): NavIcon => ({ source: { kind: 'image', src }, fill: true, scale: 1, background: null }),
}

export const libraryIconUrl = (path: string) => (/^https?:/.test(path) ? path : CDN + path)

/** 图标来源对应的图片地址；首字类型返回 null。 */
export function iconImageSrc(source: IconSource, url: string): string | null {
  switch (source.kind) {
    case 'library':
      return libraryIconUrl(source.path)
    case 'favicon':
      return source.domain ? faviconUrlForHost(source.domain) : faviconUrl(url)
    case 'image':
      return source.src
    case 'letter':
      return null
  }
}

export function sameSource(a: IconSource, b: IconSource): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'library' && b.kind === 'library') return a.path === b.path
  if (a.kind === 'image' && b.kind === 'image') return a.src === b.src
  if (a.kind === 'favicon' && b.kind === 'favicon') return a.domain === b.domain
  return true
}

export const clampScale = (v: number) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, v))
