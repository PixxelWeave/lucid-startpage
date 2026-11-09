/**
 * 把用户输入的地址规范化为绝对 URL；无法解析时返回 null。
 * 未写协议时默认补 https://。
 */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withScheme)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    // "https://foo" 这类没有点的主机名多半是输错了，localhost 除外
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null
    return url.href
  } catch {
    return null
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// 常见的两段式公共后缀，根域名需要再多取一段
const MULTI_PART_SUFFIXES = new Set([
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
  'com.hk', 'com.tw', 'org.tw', 'com.sg', 'com.my', 'com.au', 'net.au', 'org.au',
  'co.uk', 'org.uk', 'ac.uk', 'co.jp', 'ne.jp', 'or.jp', 'co.kr', 'co.in', 'co.nz', 'com.br',
])

/**
 * 根域名（可注册域名的近似）：mail.google.com → google.com，news.sina.com.cn → sina.com.cn。
 * IP、localhost 等原样返回。
 */
export function rootDomain(host: string): string {
  if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':')) return host
  const parts = host.split('.')
  const lastTwo = parts.slice(-2).join('.')
  return MULTI_PART_SUFFIXES.has(lastTwo) && parts.length > 2 ? parts.slice(-3).join('.') : lastTwo
}

/** 站点图标地址（Google favicon 服务）。 */
export function faviconUrl(url: string, size = 128): string {
  return faviconUrlForHost(hostnameOf(url), size)
}

/** 指定域名的站点图标地址（Google favicon 服务）。 */
export function faviconUrlForHost(host: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`
}
