// 背景图片在 IndexedDB 中需要异步读取。为避免首屏先闪一下纯色背景，
// 在 localStorage 缓存模糊占位图和遮罩浓度，渲染前同步铺到 <body> 上（见 global.scss），
// 原图加载后再由 <Background> 淡入覆盖。
const CACHE_KEY = 'startpage:background'

export interface BackgroundPaint {
  /** 模糊占位图 data URL */
  placeholder: string
  /** 遮罩浓度（%） */
  dim: number
}

function apply(paint: BackgroundPaint | null) {
  const root = document.documentElement
  if (!paint) {
    delete root.dataset.background
    root.style.removeProperty('--background-placeholder')
    root.style.removeProperty('--background-dim')
    return
  }
  root.dataset.background = ''
  root.style.setProperty('--background-placeholder', `url("${paint.placeholder}")`)
  root.style.setProperty('--background-dim', `${paint.dim}%`)
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
    const { placeholder, dim } = raw as Record<string, unknown>
    if (typeof placeholder === 'string' && placeholder.startsWith('data:image/') && typeof dim === 'number') {
      apply({ placeholder, dim })
    }
  } catch {
    // 忽略
  }
}
