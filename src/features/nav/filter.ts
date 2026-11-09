import type { NavItem } from './types'

/** 按名称或网址过滤导航（不区分大小写）；空关键词返回全部。 */
export function filterNavItems(items: readonly NavItem[], query: string): NavItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...items]
  return items.filter(
    (it) => it.name.toLowerCase().includes(q) || it.url.toLowerCase().replace(/^https?:\/\//, '').includes(q),
  )
}
