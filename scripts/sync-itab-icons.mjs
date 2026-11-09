// 从 iTab 网站图标库同步图标索引，生成 src/features/nav/icon-library.json
//
// 用法：pnpm icons:sync
//
// 输出为数组，每项 [host, name, path, background]：
// - host：网站域名（去掉 www.），运行时按根域名分组匹配
// - path：透明底图案（imgSrc）相对 CDN 的路径；图标文件运行时从 iTab CDN 加载
// - background：iTab 给出的底色，图案叠在底色上即为原始图标
// 顺序请求、每页间隔一段时间，避免给对方服务造成压力

import { writeFile } from 'node:fs/promises'

const API = 'https://base.itab.link/website/list'
const CDN = 'https://files.itab.link/'
const OUT = new URL('../src/features/nav/icon-library.json', import.meta.url)
const DELAY_MS = 300

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(page) {
  const params = new URLSearchParams({ lang: 'zh', type: '', page: String(page), name: '', source: 'itab' })
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${API}?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.code !== 200 || !Array.isArray(json.data)) throw new Error(`Bad payload: ${json.msg}`)
      return json
    } catch (err) {
      if (attempt >= 3) throw err
      console.warn(`\npage ${page} failed (${err.message}), retrying…`)
      await sleep(DELAY_MS * attempt * 3)
    }
  }
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

const relative = (src) => (src.startsWith(CDN) ? src.slice(CDN.length) : src)

const entries = []
const seen = new Set()
let total = 0
let pages = 1

for (let page = 1; page <= pages; page++) {
  const json = await fetchPage(page)
  pages = json.pages
  for (const item of json.data) {
    total++
    const host = hostnameOf(item.url)
    const src = item.imgSrc || item.src
    if (!host || !src) continue
    const path = relative(src)
    const key = `${host} ${path}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push([host, String(item.name ?? '').trim(), path, String(item.backgroundColor ?? '').trim()])
  }
  process.stdout.write(`\rpage ${page}/${pages}`)
  if (page < pages) await sleep(DELAY_MS)
}

await writeFile(OUT, `${JSON.stringify(entries)}\n`)
console.log(`\n${total} entries → ${entries.length} icons written to ${OUT.pathname}`)
