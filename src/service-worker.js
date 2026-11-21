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
// - 导航图标（iTab 图标 CDN、Google favicon）：先返回缓存，后台重新请求并更新（stale-while-revalidate），
//   图标秒出、离线可显示；后台请求先经过浏览器的 HTTP 缓存，新鲜时不产生网络流量。
//   iTab 允许跨域，按 CORS 请求后正常缓存；Google favicon 不允许跨域，只能缓存不透明响应
//   （Chrome 计算配额时每个按约 7MB 记账，不占真实空间），因此分开存放、各设上限。
//   Google favicon 会随机跳转到 t0–t3.gstatic.com，按原始请求地址缓存，避免跳转目标变化导致不命中
// - 其他跨域请求不拦截
// - 激活时保留上一个版本的预缓存：已经打开的旧页面之后懒加载的旧文件仍然可用（新部署后服务器上已没有）
//
// 更新流程：页面打开时浏览器检查 sw.js（不走 HTTP 缓存）→ 新版本安装并接管 →
// 下次打开页面即为新版本；长时间不关闭的页面在切到后台时自动刷新（见 src/lib/serviceWorker.ts）。

const { version: VERSION, precache: PRECACHE } = self.__LUCID_SW__

const PREFIX = 'lucid-precache-'
const PRECACHE_NAME = `${PREFIX}${VERSION}`
const RUNTIME_NAME = 'lucid-runtime'
/** 导航图标缓存：名称 → 条目上限（超出时删除最久未更新的） */
const ICON_CACHES = {
  itab: { name: 'lucid-icons-itab', limit: 500 },
  favicon: { name: 'lucid-icons-favicon', limit: 150 },
}
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

  const iconKind = iconKindOf(url)
  if (iconKind) {
    event.respondWith(staleWhileRevalidate(event, request, iconKind))
    return
  }

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

// ---- 导航图标 ----

/** 图标地址见 src/features/nav/icon.ts（iTab CDN）与 src/lib/url.ts（Google favicon） */
function iconKindOf(url) {
  if (url.hostname === 'files.itab.link') return 'itab'
  if (url.hostname === 'www.google.com' && url.pathname === '/s2/favicons') return 'favicon'
  return null
}

async function staleWhileRevalidate(event, request, kind) {
  const cache = await caches.open(ICON_CACHES[kind].name)
  const cached = await cache.match(request)
  const network = fetchIcon(request, kind)
  // 先注册写缓存：响应到达时先 clone，再交给 <img> 读取；写入在后台进行，不拖慢显示
  const update = network.then(async (response) => {
    if (!isCacheable(response)) return
    await cache.put(request, response.clone())
    await trimCache(kind)
  })
  // 离线等失败：有缓存时忽略；没有缓存时错误交给 <img>（页面退回首字）
  event.waitUntil(update.catch(() => {}))
  return cached ?? network
}

/** iTab 按 CORS 请求，得到可读的正常响应；失败时退回 <img> 原本的请求方式 */
function fetchIcon(request, kind) {
  if (kind !== 'itab') return fetch(request)
  return fetch(request.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(request))
}

/** 不透明响应读不到状态码，只能照单全收（Google 对未知站点返回的默认图标由页面按尺寸过滤） */
function isCacheable(response) {
  return response.ok || response.type === 'opaque'
}

/** 超出上限时删除最早写入的条目（每次使用都会重新写入，等同于最久未使用） */
async function trimCache(kind) {
  const { name, limit } = ICON_CACHES[kind]
  const cache = await caches.open(name)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)))
}
