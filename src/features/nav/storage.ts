import { createStore } from '@/lib/storage'
import { hostnameOf, normalizeUrl } from '@/lib/url'
import { clampScale, iconPresets } from './icon'
import type { IconSource, NavIcon, NavItem } from './types'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function parseSource(raw: unknown): IconSource | null {
  if (!isObject(raw)) return null
  switch (raw.kind) {
    case 'library':
      return typeof raw.path === 'string' && raw.path ? { kind: 'library', path: raw.path } : null
    case 'favicon':
      return typeof raw.domain === 'string' && raw.domain
        ? { kind: 'favicon', domain: raw.domain }
        : { kind: 'favicon' }
    case 'letter':
      return { kind: 'letter' }
    case 'image':
      return typeof raw.src === 'string' && raw.src.startsWith('data:image/')
        ? { kind: 'image', src: raw.src }
        : null
    default:
      return null
  }
}

function parseIcon(raw: unknown): NavIcon {
  if (!isObject(raw)) return iconPresets.favicon()

  // 旧格式：{ type: 'favicon' | 'letter' | 'image', src? }
  if (typeof raw.type === 'string') {
    if (raw.type === 'letter') return iconPresets.letter()
    if (raw.type === 'image' && typeof raw.src === 'string' && raw.src.startsWith('data:image/')) {
      return iconPresets.image(raw.src)
    }
    return iconPresets.favicon()
  }

  const source = parseSource(raw.source)
  if (!source) return iconPresets.favicon()
  return {
    source,
    fill: typeof raw.fill === 'boolean' ? raw.fill : true,
    scale: isNumber(raw.scale) ? clampScale(raw.scale) : 1,
    background: typeof raw.background === 'string' && raw.background ? raw.background : null,
  }
}

/** 校验并清洗导航数据（用于读取存储与导入备份）；格式不对返回 null。 */
export function parseNavItems(raw: unknown): NavItem[] | null {
  if (!Array.isArray(raw)) return null

  const items: NavItem[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (!isObject(entry) || typeof entry.url !== 'string') continue
    const url = normalizeUrl(entry.url)
    if (!url) continue

    let id = typeof entry.id === 'string' && entry.id ? entry.id : crypto.randomUUID()
    if (seen.has(id)) id = crypto.randomUUID()
    seen.add(id)

    items.push({
      id,
      url,
      name: (typeof entry.name === 'string' && entry.name.trim()) || hostnameOf(url),
      icon: parseIcon(entry.icon),
    })
  }
  return items
}

export const navStore = createStore('startpage:nav-items', parseNavItems)
