// Service Worker（只用于网页版）：GitHub Pages 对所有文件强制 max-age=600，
// 由这里在浏览器一侧实现“带哈希的文件永久缓存 + 页面秒开 + 离线可用”。
//
// 不经 vite 打包：构建时由 vite.config.ts 的 webApp 插件在文件头部注入本次构建的清单
// （self.__LUCID_SW__ = { version, precache }），输出为 dist-web/sw.js。
// version 由所有输出文件的内容计算，任何改动都会让 sw.js 变化，浏览器据此安装新版本。
//
// 策略：
// - 安装时预缓存本次构建的全部文件（字体除外，用到时再缓存），完成后立即接管（skipWaiting）
// - 打开页面（导航请求）：直接返回当前版本缓存的 index.html，与同版本的 JS / CSS 配套
// - 同源的其他请求：缓存优先；assets/ 下带哈希的文件（如字体）首次请求后存入运行时缓存
// - 跨域请求（iTab 图标 CDN、Google favicon）不拦截，交给浏览器自身的 HTTP 缓存
// - 激活时保留上一个版本的预缓存：已经打开的旧页面之后懒加载的旧文件仍然可用（新部署后服务器上已没有）
//
// 更新流程：页面打开时浏览器检查 sw.js（不走 HTTP 缓存）→ 新版本安装并接管 →
// 下次打开页面即为新版本；长时间不关闭的页面在切到后台时自动刷新（见 src/lib/serviceWorker.ts）。

const { version: VERSION, precache: PRECACHE } = self.__LUCID_SW__

const PREFIX = 'lucid-precache-'
const PRECACHE_NAME = `${PREFIX}${VERSION}`
const RUNTIME_NAME = 'lucid-runtime'
/** 保留的预缓存版本数（当前 + 上一个） */
const KEEP_VERSIONS = 2

const scope = new URL(self.registration.scope)
const toUrl = (path) => new URL(path, scope).href
const INDEX_URL = toUrl('index.html')
const ASSETS_PATH = `${scope.pathname}assets/`

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_NAME)
      // cache: 'reload' 绕过 HTTP 缓存，避免把 10 分钟内缓存的旧 index.html 存进新版本
      await cache.addAll(PRECACHE.map((path) => new Request(toUrl(path), { cache: 'reload' })))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // caches.keys() 按创建顺序排列：保留最新的几个版本，删除更早的
      const versions = (await caches.keys()).filter((name) => name.startsWith(PREFIX) && name !== PRECACHE_NAME)
      const stale = versions.slice(0, Math.max(0, versions.length - (KEEP_VERSIONS - 1)))
      await Promise.all(stale.map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return

  if (request.mode === 'navigate') {
    const isIndex = url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`
    if (isIndex) event.respondWith(appShell(request))
    return
  }
  event.respondWith(cacheFirst(event, request, url))
})

/** 当前版本的 index.html；缓存缺失时（如安装未完成）走网络 */
async function appShell(request) {
  const cache = await caches.open(PRECACHE_NAME)
  return (await cache.match(INDEX_URL)) ?? fetch(request)
}

async function cacheFirst(event, request, url) {
  // 在所有缓存中查找：包括上一个版本的预缓存（旧页面的懒加载文件）
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  // 只有带哈希的文件内容永远不变，可以放心长期缓存
  if (response.ok && url.pathname.startsWith(ASSETS_PATH)) {
    const copy = response.clone()
    event.waitUntil(caches.open(RUNTIME_NAME).then((cache) => cache.put(request, copy)))
  }
  return response
}
