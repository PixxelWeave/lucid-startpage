import { parseNavItems } from '@/features/nav/storage'
import type { NavItem } from '@/features/nav/types'
import { parseSettings, type Settings } from './types'

const APP_ID = 'startpage'

interface BackupFile {
  app: typeof APP_ID
  version: 1
  exportedAt: string
  items: NavItem[]
  settings: Settings
}

/** 导出为 JSON 文件并触发下载。 */
export function downloadBackup(items: NavItem[], settings: Settings) {
  const data: BackupFile = {
    app: APP_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    // 背景图片只存在本机，不进备份
    settings: { ...settings, backgroundImage: null },
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)

  const a = document.createElement('a')
  a.href = url
  a.download = `startpage-backup-${date}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** 解析备份文件内容；格式不对返回 null。 */
export function parseBackup(text: string): { items: NavItem[]; settings: Settings | null } | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null

  const r = raw as Record<string, unknown>
  if (r.app !== APP_ID) return null

  const items = parseNavItems(r.items)
  if (!items) return null
  return { items, settings: parseSettings(r.settings) }
}
