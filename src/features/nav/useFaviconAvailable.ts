import { useEffect, useState } from 'react'
import { faviconUrlForHost } from '@/lib/url'
import { MIN_FAVICON_SIZE } from './icon'

/** 预加载域名的 Google favicon，仅当尺寸足够清晰时返回 true。 */
export function useFaviconAvailable(host: string | null): boolean {
  const [result, setResult] = useState<{ host: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!host) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) setResult({ host, ok: img.naturalWidth >= MIN_FAVICON_SIZE })
    }
    img.onerror = () => {
      if (!cancelled) setResult({ host, ok: false })
    }
    img.src = faviconUrlForHost(host)
    return () => {
      cancelled = true
    }
  }, [host])

  return host !== null && result?.host === host && result.ok
}
