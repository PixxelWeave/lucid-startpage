/**
 * 吞掉接下来的一次 click（阻止默认行为与传递），用于：
 * - 拖拽 / 长按结束后浏览器补发的 click（否则会打开图标链接）
 * - 点击外部关闭菜单时，避免误触发下方元素
 * 若 timeout 内没有 click 到来，自动撤销，不影响之后的正常点击。
 */
export function swallowNextClick(timeout = 600) {
  const swallow = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  window.addEventListener('click', swallow, { capture: true, once: true })
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), timeout)
}
