import { useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { useStoredState } from '@/lib/useStoredState'
import { iconPresets } from './icon'
import { navStore } from './storage'
import type { NavItem } from './types'

const DEFAULT_ITEMS: Omit<NavItem, 'id'>[] = [
  { name: 'Google', url: 'https://www.google.com/', icon: iconPresets.library('icons/google.svg', '#fff') },
  { name: 'Gmail', url: 'https://mail.google.com/', icon: iconPresets.library('icons/gmail.svg', '#fff') },
  { name: 'YouTube', url: 'https://www.youtube.com/', icon: iconPresets.library('icons/youtube.svg', '#ff0000') },
  { name: 'GitHub', url: 'https://github.com/', icon: iconPresets.library('icons/github.svg', '#000') },
  { name: 'Bilibili', url: 'https://www.bilibili.com/', icon: iconPresets.library('icons/bilibili2.svg', '#ff5ca1') },
]

const withId = (item: Omit<NavItem, 'id'>): NavItem => ({ ...item, id: crypto.randomUUID() })
const defaultItems = () => DEFAULT_ITEMS.map(withId)

export function useNavItems() {
  // items 为 null 表示还在加载
  const [items, mutate] = useStoredState(navStore, defaultItems)

  const add = useCallback(
    (item: Omit<NavItem, 'id'>) => mutate((prev) => [...prev, withId(item)]),
    [mutate],
  )

  const update = useCallback(
    (id: string, patch: Omit<NavItem, 'id'>) =>
      mutate((prev) => prev.map((it) => (it.id === id ? { ...patch, id } : it))),
    [mutate],
  )

  const remove = useCallback(
    (id: string) => mutate((prev) => prev.filter((it) => it.id !== id)),
    [mutate],
  )

  const move = useCallback(
    (activeId: string, overId: string) =>
      mutate((prev) => {
        const from = prev.findIndex((it) => it.id === activeId)
        const to = prev.findIndex((it) => it.id === overId)
        return from < 0 || to < 0 ? prev : arrayMove(prev, from, to)
      }),
    [mutate],
  )

  /** 整体替换（导入备份） */
  const replaceAll = useCallback((next: NavItem[]) => mutate(() => next), [mutate])

  const resetToDefaults = useCallback(() => mutate(defaultItems), [mutate])

  return { items, add, update, remove, move, replaceAll, resetToDefaults }
}

export type NavItemsApi = ReturnType<typeof useNavItems>
