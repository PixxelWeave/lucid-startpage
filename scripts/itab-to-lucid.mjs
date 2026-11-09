#!/usr/bin/env node
/**
 * 把 iTab 导出的备份（.itabdata）转换为 Lucid 可导入的备份 JSON。
 *
 *   node scripts/itab-to-lucid.mjs <iTab备份.itabdata> [输出.json]
 *
 * 转换规则：
 * - Lucid 没有文件夹：文件夹里的图标按原位置展开（文件夹在哪，里面的图标就排在哪）
 * - iTab 图标库里的图案 → library 来源（相对 CDN 的路径，外观与 iTab 一致）；其他网址的图片同样直接引用
 * - 用户上传到 iTab 的自定义图标：图标库里有同一网站时改用官方图标（自定义 SVG 常带深色模式样式，在 Lucid 里会看不清）
 * - 文字图标（type: text）→ 首字图标，保留背景色（Lucid 显示名称首字，不支持自定义文字）
 * - 背景色 transparent → 关闭背景填充；白色 → 默认底色
 * - 跳过 iTab 的“添加图标”等内部入口（itab:// 链接）
 * 备份中不包含设置，导入时只替换导航，保留 Lucid 现有设置。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const CDN = 'https://files.itab.link/'

const [input, outputArg] = process.argv.slice(2)
if (!input) {
  console.error('用法：node scripts/itab-to-lucid.mjs <iTab备份.itabdata> [输出.json]')
  process.exit(1)
}

const data = JSON.parse(readFileSync(input, 'utf8'))
if (!Array.isArray(data.navConfig)) {
  console.error('不是有效的 iTab 备份：缺少 navConfig')
  process.exit(1)
}

/** iTab 颜色 → Lucid 背景：null 为默认白色；undefined 表示透明（关闭填充） */
function background(color) {
  if (!color) return null
  const c = color.trim().toLowerCase()
  if (c === 'transparent') return undefined
  if (c === '#fff' || c === '#ffffff') return null
  return c
}

// iTab 图标库索引（[域名, 名称, 图案路径, 底色]），见 scripts/sync-itab-icons.mjs
const library = new Map(
  JSON.parse(readFileSync(new URL('../src/features/nav/icon-library.json', import.meta.url), 'utf8')).map(
    (e) => [e[0], e],
  ),
)
const replaced = []

/** 用户上传到 iTab 的图标（user-website-icon/）：图标库里有同一网站的官方图标时改用官方图标 */
function officialIcon(entry) {
  if (!entry.src?.startsWith(`${CDN}user-website-icon/`)) return null
  const host = new URL(entry.url).hostname
  const hit = library.get(host) ?? library.get(host.replace(/^www\./, ''))
  if (!hit) return null
  replaced.push(entry.name)
  const bg = background(hit[3])
  return { source: { kind: 'library', path: hit[2] }, fill: bg !== undefined, scale: 1, background: bg ?? null }
}

function toIcon(entry) {
  const official = officialIcon(entry)
  if (official) return official

  const bg = background(entry.backgroundColor)
  const fill = bg !== undefined
  const color = bg ?? null

  if (entry.type === 'icon' && entry.src) {
    const path = entry.src.startsWith(CDN) ? entry.src.slice(CDN.length) : entry.src
    return { source: { kind: 'library', path }, fill, scale: 1, background: color }
  }
  return { source: { kind: 'letter' }, fill, scale: 0.5, background: color }
}

const items = []
const skipped = []
const folders = []

function walk(nodes) {
  for (const node of nodes ?? []) {
    if (node.type === 'folder' || Array.isArray(node.children)) {
      folders.push(`${node.name}（${node.children?.length ?? 0} 个）`)
      walk(node.children)
      continue
    }
    if (!node.url || !/^https?:\/\//i.test(node.url)) {
      skipped.push(`${node.name}（${node.url ?? '无网址'}）`)
      continue
    }
    items.push({ id: randomUUID(), name: node.name?.trim() || new URL(node.url).hostname, url: node.url, icon: toIcon(node) })
  }
}

for (const page of data.navConfig) walk(page.children)

const backup = {
  app: 'startpage',
  version: 1,
  exportedAt: new Date().toISOString(),
  items,
}

const output = outputArg ?? join(dirname(input), `Lucid导入-${basename(input).replace(/\.itabdata$/, '')}.json`)
writeFileSync(output, `${JSON.stringify(backup, null, 2)}\n`)

console.log(`已转换 ${items.length} 个导航 → ${output}`)
if (folders.length) console.log(`已展开文件夹：${folders.join('、')}`)
if (skipped.length) console.log(`已跳过：${skipped.join('、')}`)
if (replaced.length) console.log(`自定义图标改用图标库官方图标：${replaced.join('、')}`)
