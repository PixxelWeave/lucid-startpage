/**
 * iOS 主屏幕网页应用（standalone）+ 透明状态栏（black-translucent）的已知问题：
 * 视口高度比屏幕少了状态栏那一截，而页面又从屏幕顶端开始排，底部会空出一条黑边。
 *
 * 这里测出缺口（屏幕高度 - 视口高度），写入 CSS 变量 --viewport-gap，只用来补齐文档（html）的高度。
 * fixed 元素本来就按整个屏幕排布（真机实测），不需要也不能再补。
 * 不在主屏幕模式、或系统修复后缺口为 0，不产生影响。
 */

/**
 * 是否作为主屏幕网页应用运行。旧的 navigator.standalone 与 display-mode 媒体查询都检查：
 * iOS 按网页应用清单（manifest）打开时不一定设置前者
 */
export function isStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  )
}

/** 当前方向下屏幕的“高”（screen 的宽高不随横竖屏交换） */
function screenHeight(): number {
  const landscape = window.innerWidth > window.innerHeight
  return landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height)
}

export function watchViewportGap() {
  if (!isStandalone()) return

  const update = () => {
    const gap = Math.max(0, screenHeight() - window.innerHeight)
    document.documentElement.style.setProperty('--viewport-gap', `${gap}px`)
  }
  update()
  // 系统可能在启动后才把视口缩短，且不一定派发 resize：在启动后的几个时间点再测
  requestAnimationFrame(update)
  window.addEventListener('load', update)
  window.addEventListener('pageshow', update)
  for (const ms of [300, 1000, 3000]) window.setTimeout(update, ms)
  window.addEventListener('resize', update)
  window.visualViewport?.addEventListener('resize', update)
}

/** 视口诊断数据（设置 → 关于），用于排查 iOS 主屏幕模式下的布局问题 */
export function viewportDiagnostics(): Record<string, string> {
  const root = document.documentElement
  // 读取 env() 安全区：用一个临时元素的内边距换算成像素
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)'
  document.body.append(probe)
  const probeStyle = getComputedStyle(probe)
  const safeTop = probeStyle.paddingTop
  const safeBottom = probeStyle.paddingBottom
  probe.remove()

  const legacyStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return {
    主屏幕模式: isStandalone() ? '是' : '否',
    'navigator.standalone': String(legacyStandalone),
    'display-mode: standalone': String(window.matchMedia('(display-mode: standalone)').matches),
    屏幕高度: `${screenHeight()}`,
    视口高度: `${window.innerHeight}`,
    可视区域高度: `${Math.round(window.visualViewport?.height ?? 0)}`,
    文档高度: `${Math.round(root.getBoundingClientRect().height)}`,
    补齐缺口: root.style.getPropertyValue('--viewport-gap') || '未设置',
    安全区上: safeTop,
    安全区下: safeBottom,
  }
}
