/**
 * 记录最近一次交互方式，写在 <html data-input="pointer | keyboard">。
 *
 * 弹窗 / 菜单关闭时，浏览器会把焦点还给触发它的元素（如右上角设置按钮），
 * iOS 等环境会把这次归还当作 :focus-visible 显示焦点框。用鼠标 / 触屏操作时不需要焦点框，
 * global.scss 据此隐藏；键盘操作（Tab、Esc 关闭弹窗等）照常显示。
 */
export function trackInputModality() {
  const root = document.documentElement
  const set = (mode: 'pointer' | 'keyboard') => {
    if (root.dataset.input !== mode) root.dataset.input = mode
  }
  document.addEventListener('pointerdown', () => set('pointer'), true)
  document.addEventListener(
    'keydown',
    (e) => {
      // 组合快捷键（如 ⌘C）不算键盘导航
      if (!e.metaKey && !e.ctrlKey && !e.altKey) set('keyboard')
    },
    true,
  )
}
