import { createId } from '@/lib/id'
import { idbDelete, idbGet, idbKeys, idbSet } from '@/lib/idb'
import { compressImage } from '@/lib/image'

/**
 * 背景图片存在 IndexedDB（只在本机，不进备份），设置里只记录图片 id。
 * 每次更换都用新 id，其他标签页收到设置变化后按新 id 读取。
 */
const KEY_PREFIX = 'background:'
const keyOf = (id: string) => `${KEY_PREFIX}${id}`

interface BackgroundRecord {
  image: Blob
  /** 模糊占位图 data URL，原图加载前先显示它 */
  placeholder: string
}

export interface LoadedBackground {
  /** 原图的 object URL */
  url: string
  placeholder: string
}

function parseRecord(raw: unknown): BackgroundRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!(r.image instanceof Blob) || typeof r.placeholder !== 'string') return null
  return { image: r.image, placeholder: r.placeholder }
}

/** 存储尺寸：覆盖当前屏幕的物理像素，至少 2560、至多 3840（4K） */
function targetSide() {
  const screenSide = Math.max(screen.width, screen.height) * devicePixelRatio
  return Math.min(3840, Math.max(2560, Math.round(screenSide)))
}

/** 压缩并保存图片，返回新的图片 id 与压缩结果（裁切前预览用，不经过下方的共享缓存）。 */
export async function saveBackgroundImage(file: File): Promise<{ id: string } & BackgroundRecord> {
  const { blob, placeholder } = await compressImage(file, targetSide())
  const id = createId()
  await idbSet(keyOf(id), { image: blob, placeholder } satisfies BackgroundRecord)
  return { id, image: blob, placeholder }
}

/** 删除除 keepId 以外的所有背景图片（包括意外中断留下的孤儿数据）。 */
export async function pruneBackgroundImages(keepId: string | null) {
  const keep = keepId && keyOf(keepId)
  const keys = await idbKeys()
  await Promise.all(keys.filter((k) => k.startsWith(KEY_PREFIX) && k !== keep).map(idbDelete))
}

// 当前图片的 object URL 在页面内共享（背景层与设置预览），换图时释放旧的
let current: { id: string; promise: Promise<LoadedBackground | null> } | null = null

/** 读取图片；不存在时返回 null，读取出错时 reject。 */
export function loadBackgroundImage(id: string): Promise<LoadedBackground | null> {
  if (current?.id === id) return current.promise

  const previous = current
  const promise = idbGet(keyOf(id)).then((raw) => {
    const record = parseRecord(raw)
    return record && { url: URL.createObjectURL(record.image), placeholder: record.placeholder }
  })
  current = { id, promise }
  // 出错时允许下次重试
  promise.catch(() => {
    if (current?.promise === promise) current = null
  })
  void previous?.promise.then((loaded) => loaded && URL.revokeObjectURL(loaded.url), () => {})
  return promise
}
