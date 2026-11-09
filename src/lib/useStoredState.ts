import { useCallback, useEffect, useRef, useState } from 'react'
import type { Store } from './storage'

/**
 * 与 Store 双向同步的状态。
 * - 首次返回 null（加载中），加载完成后为已保存的值或 fallback()
 * - 本页修改自动写回；其他标签页的修改自动同步过来
 *
 * @param fallback 无存档时的初始值，需为稳定引用（模块级函数）
 */
export function useStoredState<T>(store: Store<T>, fallback: () => T) {
  const [value, setValue] = useState<T | null>(null)
  // 只有本页发起的修改才写回存储，避免多标签页之间来回同步
  const dirty = useRef(false)

  useEffect(() => {
    let cancelled = false
    void store.load().then((stored) => {
      if (!cancelled) setValue((prev) => prev ?? stored ?? fallback())
    })
    const unsubscribe = store.subscribe((next) => setValue(next))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [store, fallback])

  useEffect(() => {
    if (!dirty.current || value === null) return
    dirty.current = false
    void store.save(value)
  }, [store, value])

  const update = useCallback(
    (fn: (prev: T) => T) => {
      dirty.current = true
      setValue((prev) => fn(prev ?? fallback()))
    },
    [fallback],
  )

  return [value, update] as const
}
