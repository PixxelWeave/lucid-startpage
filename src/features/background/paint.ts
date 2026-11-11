// 背景图片在 IndexedDB 中需要异步读取。为避免首屏先闪一下纯色背景，
// 在 localStorage 缓存模糊占位图、遮罩浓度与裁切，渲染前同步铺到 <body> 上（见 global.scss），
// 随后由 <Background> 图层覆盖。
const CACHE_KEY = 'startpage:background'

export interface BackgroundPaint {
  /** 模糊占位图 data URL */
  placeholder: string
  /** 遮罩浓度（%） */
  dim: number
  /** 裁切（见 crop.ts） */
  x: number
  y: number
  zoom: number
  /** 原图长宽比；未知时只按位置铺，不放大 */
  ratio?: number
}

/**
 * CSS 背景无法直接表达“cover 再放大 zoom 倍”，按图片与窗口的长宽比换算成 background-size：
 * 图片更宽时由高度决定 cover，否则由宽度决定。只用于首屏一瞬间，与图层的细微差别可以忽略。
 */
function backgroundSize({ zoom, ratio }: BackgroundPaint) {
  if (!ratio) return 'cover'
  const percent = `${zoom * 100}%`
  return ratio > window.innerWidth / window.innerHeight ? `auto ${percent}` : `${percent} auto`
}

function apply(paint: BackgroundPaint | null) {
  const root = document.documentElement
  if (!paint) {
    delete root.dataset.background
    for (const name of ['placeholder', 'dim', 'position', 'size']) root.style.removeProperty(`--background-${name}`)
    return
  }
  root.dataset.background = ''
  root.style.setProperty('--background-placeholder', `url("${paint.placeholder}")`)
  root.style.setProperty('--background-dim', `${paint.dim}%`)
  root.style.setProperty('--background-position', `${paint.x * 100}% ${paint.y * 100}%`)
  root.style.setProperty('--background-size', backgroundSize(paint))
}

/** 应用并缓存背景；null 表示不使用背景图片。 */
export function paintBackground(paint: BackgroundPaint | null) {
  apply(paint)
  try {
    if (paint) localStorage.setItem(CACHE_KEY, JSON.stringify(paint))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // 忽略：仅影响首屏
  }
}

export function paintCachedBackground() {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    if (typeof raw !== 'object' || raw === null) return
    const r = raw as Record<string, unknown>
    const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
    const { placeholder, dim } = r
    if (typeof placeholder === 'string' && placeholder.startsWith('data:image/') && typeof dim === 'number') {
      apply({
        placeholder,
        dim,
        x: num(r.x, 0.5),
        y: num(r.y, 0.5),
        zoom: num(r.zoom, 1),
        ratio: typeof r.ratio === 'number' && r.ratio > 0 ? r.ratio : undefined,
      })
    }
  } catch {
    // 忽略
  }
}
