import { useEffect, useState } from 'react'
import { hostnameOf, rootDomain } from '@/lib/url'

/**
 * iTab 网站图标库索引。由 `pnpm icons:sync` 生成，按需懒加载；图标文件从 iTab CDN 加载。
 * 运行时按根域名分组，供添加 / 编辑导航时列出候选图标。
 */
export interface LibraryIcon {
  host: string
  name: string
  path: string
  /** iTab 给出的底色；没有时为 null */
  background: string | null
}

type RawEntry = [host: string, name: string, path: string, background: string]

interface LibraryIndex {
  /** 根域名 → 图标 */
  byRoot: Map<string, LibraryIcon[]>
  /** 全部图标（同一图案只保留一条），用于搜索 */
  all: LibraryIcon[]
}

let index: LibraryIndex | null = null
let pending: Promise<LibraryIndex> | null = null

function buildIndex(raw: RawEntry[]): LibraryIndex {
  const byRoot = new Map<string, LibraryIcon[]>()
  const all: LibraryIcon[] = []
  const seenPaths = new Set<string>()
  for (const [host, name, path, background] of raw) {
    const icon: LibraryIcon = { host, name, path, background: background || null }
    const key = rootDomain(host)
    const list = byRoot.get(key) ?? []
    if (!list.some((e) => e.path === path)) list.push(icon)
    byRoot.set(key, list)
    if (!seenPaths.has(path)) {
      seenPaths.add(path)
      all.push(icon)
    }
  }
  return { byRoot, all }
}

/** 开始加载（可提前调用以预热），重复调用只加载一次。 */
export function loadIconLibrary(): Promise<LibraryIndex> {
  pending ??= import('./icon-library.json').then((m) => {
    index = buildIndex(m.default as RawEntry[])
    return index
  })
  return pending
}

/**
 * 与网址同根域名的全部图标（同 iTab），排序：
 * 1. 域名完全匹配（mail.google.com → Gmail）
 * 2. 根域名本身（google.com → Google）
 * 3. 同根域名下的其他子域名
 */
export function findLibraryIcons(lib: LibraryIndex, url: string): LibraryIcon[] {
  const host = hostnameOf(url)
  if (!host) return []
  const root = rootDomain(host)
  const rank = (e: LibraryIcon) => (e.host === host ? 0 : e.host === root ? 1 : 2)
  // Array.prototype.sort 是稳定排序，同级内保持 iTab 原有顺序
  return [...(lib.byRoot.get(root) ?? [])].sort((a, b) => rank(a) - rank(b))
}

/**
 * 按名称或域名搜索整个图标库（不区分大小写），用于域名匹配不到的情况，
 * 例如 proton.me 的图标收录在旧域名 protonmail.com 下。
 * 排序：完全相同 → 开头匹配 → 包含。
 */
export function searchLibraryIcons(lib: LibraryIndex, query: string, limit = 60): LibraryIcon[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored: [number, LibraryIcon][] = []
  for (const icon of lib.all) {
    const name = icon.name.toLowerCase()
    const score =
      name === q || icon.host === q
        ? 0
        : name.startsWith(q) || icon.host.startsWith(q)
          ? 1
          : name.includes(q) || icon.host.includes(q)
            ? 2
            : -1
    if (score >= 0) scored.push([score, icon])
  }
  return scored
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)
    .map(([, icon]) => icon)
}

/** 图标在库中的原始底色。 */
export function libraryBackground(lib: LibraryIndex, path: string): string | null {
  return lib.all.find((e) => e.path === path)?.background ?? null
}

/** 返回图标库索引；加载完成前为 null。 */
export function useIconLibrary(): LibraryIndex | null {
  const [lib, setLib] = useState(index)
  useEffect(() => {
    if (!lib) void loadIconLibrary().then(setLib)
  }, [lib])
  return lib
}
