/**
 * 页面本身不滚动（滚动只发生在资源库等内部区域）。
 * iOS 弹出键盘时会滚动页面让输入框可见，键盘收起后有时停在滚动过的位置，
 * 底部弹出的 sheet 等 fixed 元素随之错位（如底部按钮落到屏幕外）。键盘收起后滚回顶部。
 */
export function keepScrollTop() {
  const reset = () => {
    // 焦点仍在输入框里（如在两个输入框之间切换）时不处理
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return
    if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0)
  }
  // focusout 时焦点尚未落到下一个元素，稍后再判断
  document.addEventListener('focusout', () => setTimeout(reset, 100))
  // 键盘收起时可视区域恢复高度
  window.visualViewport?.addEventListener('resize', reset)
}
