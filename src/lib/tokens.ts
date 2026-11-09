/**
 * 在 JS 中读取设计 token（CSS 变量），避免与 _tokens.scss 重复定义数值。
 */
export function durationMs(name: 'short' | 'medium' | 'long' | 'extra-long'): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--duration-${name}`).trim()
  const value = parseFloat(raw)
  if (Number.isNaN(value)) return 0
  return raw.endsWith('ms') ? value : value * 1000
}

/** 读取以 px 为单位的长度 token（如 --layout-tile-width、--space-2）。 */
export function lengthPx(cssVar: `--${string}`): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(cssVar))
  return Number.isNaN(value) ? 0 : value
}

/** 读取缓动曲线 token（如 expressive → cubic-bezier(...)），供 JS 动画使用。 */
export function easing(name: 'standard' | 'emphasized-decelerate' | 'emphasized-accelerate' | 'expressive'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--easing-${name}`).trim() || 'ease'
}
