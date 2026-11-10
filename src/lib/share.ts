export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * 分享链接：优先调用系统分享面板（Web Share API），不支持时复制到剪贴板。
 * 需在用户操作（点击）中调用。
 *
 * 系统分享与 Clipboard API 只在安全上下文（HTTPS / localhost）中可用；
 * 通过局域网 http 地址预览时都没有，退回旧式复制（execCommand）。
 */
export async function shareLink(title: string, url: string): Promise<ShareResult> {
  const data = { title, url }
  if (navigator.share && navigator.canShare?.(data) !== false) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // 其他错误（如权限策略不允许）退回复制
    }
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url)
      return 'copied'
    } catch {
      // 退回旧式复制
    }
  }
  return legacyCopy(url) ? 'copied' : 'failed'
}

/** 旧式复制：选中一个临时文本框再执行 copy。需在用户操作中同步调用（上面在 await 之前就会走到这里）。 */
function legacyCopy(text: string): boolean {
  const field = document.createElement('textarea')
  field.value = text
  // 只读：避免 iOS 弹出键盘；放在视口外，不影响布局
  field.readOnly = true
  field.style.position = 'fixed'
  field.style.top = '-1000px'
  field.style.opacity = '0'
  document.body.append(field)
  try {
    field.select()
    // iOS 需要显式设置选区
    field.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    field.remove()
  }
}
