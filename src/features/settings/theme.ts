import type { ThemeMode } from './types'

// 设置存在 chrome.storage 中需要异步读取，为避免首屏主题闪烁，
// 额外在 localStorage 缓存一份主题，渲染前同步应用。
const CACHE_KEY = 'startpage:theme'

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme

  try {
    localStorage.setItem(CACHE_KEY, theme)
  } catch {
    // 忽略：仅影响首屏
  }
}

export function applyCachedTheme() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached === 'light' || cached === 'dark') document.documentElement.dataset.theme = cached
  } catch {
    // 忽略
  }
}
