import { useEffect, useState } from 'react'
import { loadBackgroundImage, type LoadedBackground } from './storage'

export type BackgroundImageState =
  | { status: 'none' }
  | { status: 'loading' }
  /** 设置里有 id 但本机没有这张图（例如数据被清除） */
  | { status: 'missing' }
  | { status: 'error' }
  | ({ status: 'ready' } & LoadedBackground)

type Result = { id: string } & ({ ok: true; image: LoadedBackground | null } | { ok: false })

/** 按 id 读取背景图片，得到可直接使用的 object URL。 */
export function useBackgroundImage(id: string | null): BackgroundImageState {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    loadBackgroundImage(id).then(
      (image) => !cancelled && setResult({ id, ok: true, image }),
      (err: unknown) => {
        console.error('Failed to load background image', err)
        if (!cancelled) setResult({ id, ok: false })
      },
    )
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) return { status: 'none' }
  if (result?.id !== id) return { status: 'loading' }
  if (!result.ok) return { status: 'error' }
  return result.image ? { status: 'ready', ...result.image } : { status: 'missing' }
}
