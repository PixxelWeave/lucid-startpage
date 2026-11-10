/**
 * 浮层（dialog / popover）的退场动画。
 *
 * 浏览器关闭 dialog / popover 时会立即把它移出顶层，退场过渡需要 CSS 的 `overlay` 属性
 * （transition-behavior: allow-discrete）才能播完，Safari 不支持，于是一关闭就瞬间消失。
 * 这里改为：先加上 data-closing，由 CSS 过渡到退场状态，
 * 元素自身（含 ::backdrop）的过渡全部结束后再调用 done 真正关闭。
 *
 * 组件中一般通过 usePresence（lib/usePresence.ts）使用。
 *
 * @returns 取消函数：退场途中又被打开时调用，去掉 data-closing，过渡自然反向回到打开状态
 */
export function playExit(el: HTMLElement, done: () => void): () => void {
  let settled = false
  let timer: number | undefined
  const finish = () => {
    if (settled) return
    settled = true
    window.clearTimeout(timer)
    delete el.dataset.closing
    done()
  }

  el.dataset.closing = ''
  // 立即计算样式，使新的过渡开始，才能拿到对应的动画对象
  const style = getComputedStyle(el)
  void style.opacity
  const animations = el
    .getAnimations({ subtree: true })
    // 只等元素自身与其伪元素（::backdrop）的过渡，不等内容里的其他动画
    .filter((a) => (a.effect as KeyframeEffect | null)?.target === el)

  if (animations.length > 0) {
    void Promise.allSettled(animations.map((a) => a.finished)).then(finish)
  }
  // 兜底：浏览器没有生成可等待的过渡对象（或过渡被意外打断）时，按计算出的最长过渡时长关闭
  timer = window.setTimeout(finish, longestTransitionMs(style) + 50)

  return () => {
    if (settled) return
    settled = true
    window.clearTimeout(timer)
    delete el.dataset.closing
  }
}

/** 计算样式中最长的 transition（时长 + 延迟），单位 ms */
function longestTransitionMs(style: CSSStyleDeclaration): number {
  const toMs = (v: string) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000) || 0
  const durations = style.transitionDuration.split(',').map((v) => toMs(v.trim()))
  const delays = style.transitionDelay.split(',').map((v) => toMs(v.trim()))
  return Math.max(0, ...durations.map((d, i) => d + (delays[i % delays.length] ?? 0)))
}
