import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 时钟“圆体”字体：随扩展打包，浏览器只在用到时加载对应字符子集
import '@fontsource-variable/nunito'
import '@/styles/global.scss'
import App from '@/App'
import { paintCachedBackground } from '@/features/background/paint'
import { loadIconLibrary } from '@/features/nav/iconLibrary'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { applyCachedTheme } from '@/features/settings/theme'
import { trackInputModality } from '@/lib/inputModality'
import { keepScrollTop } from '@/lib/keepScrollTop'
import { preventZoom } from '@/lib/preventZoom'
import { watchViewportGap } from '@/lib/viewportGap'

// 设置异步加载前先应用上次的主题，避免闪烁
applyCachedTheme()
paintCachedBackground()
// iOS 主屏幕模式下补齐底部缺口（见 lib/viewportGap.ts）
watchViewportGap()
// 手机上禁止双指缩放（见 lib/preventZoom.ts）
preventZoom()
// 键盘收起后页面滚回顶部（见 lib/keepScrollTop.ts）
keepScrollTop()
// 鼠标 / 触屏操作时不显示焦点框（见 lib/inputModality.ts）
trackInputModality()

// 提前加载图标库，与读取存储并行
void loadIconLibrary()

// TODO(临时)：开发时用彩色渐变背景调试半透明效果，构建时会被剔除
if (import.meta.env.DEV) void import('@/styles/debug-background.scss')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
)
