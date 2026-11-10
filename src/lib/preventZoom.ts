/**
 * 禁止双指缩放（手机）。iOS 自 10 起忽略 viewport 的 user-scalable=no，这里多层处理：
 * - index.html 的 maximum-scale=1：同时避免小字号输入框聚焦时自动放大
 * - global.scss 的 touch-action: pan-x pan-y：只允许平移
 * - 拦截 iOS 专有的缩放手势事件（gesturestart / gesturechange）
 */
export function preventZoom() {
  const block = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', block, { passive: false })
  document.addEventListener('gesturechange', block, { passive: false })
}
