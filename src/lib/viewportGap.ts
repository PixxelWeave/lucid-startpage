/**
 * iOS 主屏幕网页应用（standalone）+ 透明状态栏（black-translucent）的已知问题：
 * 视口高度比屏幕少了状态栏那一截，而页面又从屏幕顶端开始排，底部会空出一条黑边。
 *
 * 这里测出缺口（屏幕高度 - 视口高度），写入 CSS 变量 --viewport-gap，只用来补齐文档（html）的高度。
 * fixed 元素本来就按整个屏幕排布（真机实测），不需要也不能再补。
 * 不在主屏幕模式、或系统修复后缺口为 0，不产生影响。
 */
export function watchViewportGap() {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!standalone) return

  const update = () => {
    // screen 的宽高不随横竖屏交换：按当前方向取屏幕的“高”
    const landscape = window.innerWidth > window.innerHeight
    const screenHeight = landscape
      ? Math.min(screen.width, screen.height)
      : Math.max(screen.width, screen.height)
    const gap = Math.max(0, screenHeight - window.innerHeight)
    document.documentElement.style.setProperty('--viewport-gap', `${gap}px`)
  }
  update()
  window.addEventListener('resize', update)
}
