import { restoreScroll } from './viewportGap'

/**
 * 页面本身不滚动（滚动只发生在资源库等内部区域），但页面的滚动位置仍可能被改变：
 * - iOS 弹出键盘时会滚动页面让输入框可见，键盘收起后有时停在滚动过的位置，
 *   底部弹出的 sheet 等 fixed 元素随之错位（如底部按钮落到屏幕外）
 * - 元素获得焦点（点图标、打开菜单 / 弹窗）时，浏览器可能为了“让它可见”而滚动页面
 * - 刷新时浏览器会恢复上次的滚动位置
 * 手机 Safari 标签页中页面需要停在撑高部分的中间（工具栏后面才有背景，见 viewportGap.ts），
 * 位置一变，状态栏或工具栏后面就会露出纯色。所以只要发生滚动就拉回应在的位置（restoreScroll）。
 * 输入框获得焦点时（键盘弹出）不干预，避免与 iOS 的自动滚动来回拉扯。
 */
export function keepScrollTop() {
  // 刷新后不恢复上次的滚动位置，由这里决定
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  const editing = () => {
    const active = document.activeElement
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
  }
  const reset = () => {
    if (!editing()) restoreScroll()
  }

  // 任何页面滚动：下一帧拉回（restoreScroll 位置已正确时不做任何事）
  let frame = 0
  window.addEventListener(
    'scroll',
    () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        reset()
      })
    },
    { passive: true },
  )
  // focusout 时焦点尚未落到下一个元素，稍后再判断（键盘收起）
  document.addEventListener('focusout', () => setTimeout(reset, 100))
  // 键盘收起时可视区域恢复高度
  window.visualViewport?.addEventListener('resize', reset)
}
