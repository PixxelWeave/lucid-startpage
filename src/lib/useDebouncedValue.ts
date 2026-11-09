import { useEffect, useState } from 'react'

/** 值停止变化 delay 毫秒后才更新，用于输入时避免频繁请求。 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}
