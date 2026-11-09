export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * 分享链接：优先调用系统分享面板（Web Share API），不支持时复制到剪贴板。
 * 需在用户操作（点击）中调用。
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

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
