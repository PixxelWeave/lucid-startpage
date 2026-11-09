import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { createStore } from '@/lib/storage'
import { useStoredState } from '@/lib/useStoredState'
import { SettingsContext } from './SettingsContext'
import { applyTheme } from './theme'
import { DEFAULT_SETTINGS, parseSettings, type Settings } from './types'

const settingsStore = createStore('startpage:settings', parseSettings)
const defaults = () => DEFAULT_SETTINGS

/** 加载完设置后才渲染子树，避免首屏用默认值闪一下。 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, mutate] = useStoredState(settingsStore, defaults)

  useEffect(() => {
    if (settings) applyTheme(settings.theme)
  }, [settings])

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => mutate((prev) => ({ ...prev, ...patch })),
    [mutate],
  )

  const value = useMemo(
    () => (settings ? { settings, updateSettings } : null),
    [settings, updateSettings],
  )

  if (!value) return null
  return <SettingsContext value={value}>{children}</SettingsContext>
}
