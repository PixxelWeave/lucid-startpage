import { isExtension } from './env'

/** 页面可见时检查更新的最小间隔 */
const UPDATE_CHECK_INTERVAL = 10 * 60 * 1000

/**
 * 网页版注册 Service Worker（缓存策略见 src/service-worker.js）。
 * 扩展版文件本来就在本地，开发环境不缓存；非安全来源（局域网 http）浏览器不提供 Service Worker。
 *
 * 新版本接管后，已打开的页面仍在运行旧代码：在页面切到后台时静默刷新（没有打开的弹窗时），
 * 回来即为新版本。起始页常年开着（固定标签页、iOS 主屏幕应用从后台恢复而不是重新打开），
 * 不这样做可能很久都用不上新版本。
 */
export function registerServiceWorker() {
  if (isExtension || !import.meta.env.PROD || !('serviceWorker' in navigator)) return

  // 首次安装时 Service Worker 也会接管页面（clients.claim），那不是更新，不需要刷新
  const hadController = navigator.serviceWorker.controller !== null
  let updateReady = false
  let lastCheck = Date.now()

  const reloadIfIdle = () => {
    if (!document.querySelector('dialog[open]')) location.reload()
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    updateReady = true
    if (document.visibilityState === 'hidden') reloadIfIdle()
  })

  // 申请持久存储：浏览器空间紧张时不清理本站数据（导航与设置、背景图片、离线缓存与图标缓存）。
  // 由浏览器自行决定是否批准（如常用、已安装到主屏幕），不弹窗
  navigator.storage?.persist?.().catch(() => {})

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            if (updateReady) reloadIfIdle()
          } else if (Date.now() - lastCheck > UPDATE_CHECK_INTERVAL) {
            // 长时间开着的页面回到前台时主动检查一次（浏览器默认只在导航时检查）
            lastCheck = Date.now()
            registration.update().catch(() => {})
          }
        })
      })
      .catch((err: unknown) => console.error('Service worker registration failed', err))
  })
}
