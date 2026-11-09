import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

/** 扩展图标的唯一源文件；页面 favicon 直接用它 */
const ICON_SOURCE = new URL('./public/icon.svg', import.meta.url)
/** Chrome manifest 只接受位图图标：构建时由 SVG 栅格化出这些尺寸 */
const ICON_SIZES = [16, 32, 48, 128] as const

/** 构建时生成 Chrome 扩展 manifest（MV3），接管新标签页。dist/ 可直接作为扩展加载。 */
function chromeExtensionManifest(): Plugin {
  return {
    name: 'startpage:chrome-manifest',
    apply: 'build',
    generateBundle() {
      const svg = readFileSync(ICON_SOURCE)
      const icons: Record<string, string> = {}
      for (const size of ICON_SIZES) {
        const fileName = `icons/icon-${size}.png`
        const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
        this.emitFile({ type: 'asset', fileName, source: png })
        icons[size] = fileName
      }

      const manifest = {
        manifest_version: 3,
        name: 'Lucid',
        description: '简洁的新标签页导航',
        version: pkg.version,
        // 扩展管理页 / 扩展菜单中的图标。不声明 action：新标签页扩展没有需要放在工具栏的操作
        icons,
        chrome_url_overrides: { newtab: 'index.html' },
        // unlimitedStorage：背景图片存在 IndexedDB，避免受配额限制或被浏览器清理
        permissions: ['storage', 'unlimitedStorage'],
      }
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), chromeExtensionManifest()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
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
})
