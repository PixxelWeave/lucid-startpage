/**
 * 弹窗遮罩。
 *
 * <dialog> 自带的 ::backdrop 是铺满屏幕的 fixed 层，手机 Safari 会从贴边的 fixed 层取色去涂状态栏与工具栏
 * （变成纯色，遮住撑高到工具栏后面的背景，见 lib/viewportGap.ts）。
 * 所以 ::backdrop 不画背景，改由 <html data-scrim> 显示 #root 上的遮罩（随文档铺满，见 global.scss）。
 * 多个弹窗叠加时按引用计数，全部关闭后才移除。
 */
let holders = 0

/** 显示遮罩；返回释放函数 */
export function holdScrim(): () => void {
  holders += 1
  document.documentElement.dataset.scrim = ''
  let released = false
  return () => {
    if (released) return
    released = true
    holders -= 1
    if (holders === 0) delete document.documentElement.dataset.scrim
  }
}
