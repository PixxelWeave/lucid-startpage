import { useCallback, useSyncExternalStore } from 'react'

/** 紧凑布局（手机），与 tokens 的 `@mixin compact` 保持一致 */
export const COMPACT_QUERY = '(width < 640px)'

/** 订阅媒体查询，窗口尺寸变化时自动更新。 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
