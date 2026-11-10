import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'


const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

const APP_NAME = 'Lucid'
const APP_DESCRIPTION = '简洁的新标签页导航'

/** 图标的唯一源文件；页面 favicon 直接用它，位图图标都由它栅格化 */
const ICON_SVG = readFileSync(new URL('./public/icon.svg', import.meta.url), 'utf8')

/** 页面底色（与 tokens 的 surface 一致），用于网页版的启动画面与浏览器界面着色 */
const SURFACE = { light: '#f9f9ff', dark: '#111318' }

/**
 * 满版图标：去掉圆角底板四周的留白，底色铺满整个画布。
 * iOS 主屏幕 / Android 自适应图标会自己裁出圆角，留白处会变成黑边。
 */
function fullBleedIcon(svg: string) {
  const tile = '<rect x="8" y="8" width="112" height="112" rx="30"'
  if (!svg.includes(tile)) throw new Error('public/icon.svg 的底板形状变了，请同步更新 fullBleedIcon()')
  return svg.replace(tile, '<rect x="0" y="0" width="128" height="128"')
}

/** 插件钩子里的 this：只用到 emitFile */
interface Emitter {
  emitFile(file: { type: 'asset'; fileName: string; source: string | Uint8Array }): string
}

function emitPng(ctx: Emitter, svg: string, size: number, fileName: string) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  ctx.emitFile({ type: 'asset', fileName, source: png })
  return fileName
}

function emitJson(ctx: Emitter, fileName: string, data: unknown) {
  ctx.emitFile({ type: 'asset', fileName, source: `${JSON.stringify(data, null, 2)}\n` })
}

/** 扩展版：生成 Chrome 扩展 manifest（MV3），接管新标签页。dist/ 可直接作为扩展加载。 */
function chromeExtension(): Plugin {
  return {
    name: 'lucid:chrome-extension',
    apply: 'build',
    generateBundle() {
      // Chrome manifest 只接受位图图标
      const icons: Record<number, string> = {}
      for (const size of [16, 32, 48, 128]) {
        icons[size] = emitPng(this, ICON_SVG, size, `icons/icon-${size}.png`)
      }

      emitJson(this, 'manifest.json', {
        manifest_version: 3,
        name: APP_NAME,
        description: APP_DESCRIPTION,
        version: pkg.version,
        // 扩展管理页 / 扩展菜单中的图标。不声明 action：新标签页扩展没有需要放在工具栏的操作
        icons,
        chrome_url_overrides: { newtab: 'index.html' },
        // unlimitedStorage：背景图片存在 IndexedDB，避免受配额限制或被浏览器清理
        permissions: ['storage', 'unlimitedStorage'],
      })
    },
  }
}

/** 网页版的附加文件（路径 → 内容）：主屏幕图标、Web App manifest */
function webAppFiles(): Map<string, { type: string; body: string | Uint8Array }> {
  const fullBleed = fullBleedIcon(ICON_SVG)
  const png = (svg: string, size: number) =>
    new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  const files = new Map<string, { type: string; body: string | Uint8Array }>([
    ['apple-touch-icon.png', { type: 'image/png', body: png(fullBleed, 180) }],
    ['icons/icon-192.png', { type: 'image/png', body: png(ICON_SVG, 192) }],
    ['icons/icon-512.png', { type: 'image/png', body: png(ICON_SVG, 512) }],
    ['icons/icon-maskable-512.png', { type: 'image/png', body: png(fullBleed, 512) }],
  ])
  const manifest = {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    // 相对于 manifest 所在目录：部署在子路径（如 GitHub Pages 的 /仓库名/）下同样正确
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: SURFACE.light,
    theme_color: SURFACE.light,
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  files.set('manifest.webmanifest', {
    type: 'application/manifest+json',
    body: `${JSON.stringify(manifest, null, 2)}\n`,
  })
  return files
}

/**
 * 网页版：可“添加到主屏幕”的 Web App（manifest、iOS 主屏幕图标、状态栏样式）。
 * 构建网页版时输出文件；开发服务器上同样提供，便于在手机上直接测试主屏幕模式。
 */
function webApp(): Plugin {
  let files: ReturnType<typeof webAppFiles> | undefined
  const getFiles = () => (files ??= webAppFiles())
  // 部署路径前缀（vite 的 base），注入的链接要带上；index.html 里写的 /xxx 由 vite 自动加前缀
  let base = '/'

  return {
    name: 'lucid:web-app',
    configResolved(config) {
      base = config.base
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = getFiles().get((req.url ?? '').split('?')[0].replace(/^\//, ''))
        if (!file) return next()
        res.setHeader('Content-Type', file.type)
        res.end(file.body)
      })
    },
    generateBundle() {
      for (const [fileName, file] of getFiles()) {
        this.emitFile({ type: 'asset', fileName, source: file.body })
      }
    },
    transformIndexHtml() {
      const meta = (name: string, content: string, media?: string) => ({
        tag: 'meta',
        attrs: media ? { name, media, content } : { name, content },
        injectTo: 'head' as const,
      })
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` }, injectTo: 'head' },
        meta('apple-mobile-web-app-capable', 'yes'),
        meta('apple-mobile-web-app-title', APP_NAME),
        // 主屏幕模式下状态栏透明，页面（背景图）铺到状态栏下方；内容用 safe-area 避让。
        // Safari 标签页里状态栏 / 工具栏区域由系统绘制，只会取页面边缘的颜色填充，无法透出背景
        meta('apple-mobile-web-app-status-bar-style', 'black-translucent'),
        // theme-color：Android / 桌面 Chrome 用来给地址栏等浏览器界面着色。
        // 与 iOS 主屏幕模式状态栏下的暗色渐变无关（实测去掉后渐变不变，是系统为白色状态栏文字加的）
        meta('theme-color', SURFACE.light, '(prefers-color-scheme: light)'),
        meta('theme-color', SURFACE.dark, '(prefers-color-scheme: dark)'),
      ]
    },
  }
}

// 两种构建：
// - 扩展版 `pnpm build`        → dist/（Chrome 加载的目录，路径不要改）
// - 网页版 `pnpm build:web`    → dist-web/（--mode web）。部署在子路径下时用 BASE_PATH 指定前缀，
//   如 GitHub Pages：BASE_PATH=/仓库名/ pnpm build:web（见 .github/workflows/deploy-pages.yml）
// - 开发预览 `pnpm dev`         → 按网页版提供主屏幕图标等文件
// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const web = mode === 'web'
  // 开发服务器按网页版处理（手机上预览）；只有构建扩展版时生成扩展 manifest
  const extension = command === 'build' && !web
  return {
    // 部署路径前缀：只用于网页版（扩展与开发服务器都在根路径）
    base: web ? (process.env.BASE_PATH ?? '/') : '/',
    plugins: [react(), extension ? chromeExtension() : webApp()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
      outDir: web ? 'dist-web' : 'dist',
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    css: {
      modules: {
        // styles.searchBar  <=>  .search-bar
        localsConvention: 'camelCaseOnly',
      },
      preprocessorOptions: {
        scss: {
          // 每个 SCSS 文件自动注入设计 token，见 src/styles/_tokens.scss
          additionalData: `@use "@/styles/tokens" as t;\n`,
        },
      },
    },
  };
})