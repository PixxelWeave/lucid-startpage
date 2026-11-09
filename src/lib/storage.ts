import { isExtension } from './env'

/**
 * 持久化存储：扩展内使用 chrome.storage.local，开发预览时使用 localStorage。
 * 读出的数据一律经过 parse 校验，异常数据视为不存在。
 */
export interface Store<T> {
  /** 读取已保存的值；从未保存过或数据无效时返回 null。 */
  load(): Promise<T | null>
  save(value: T): Promise<void>
  /** 其他标签页修改时回调，返回取消订阅函数。 */
  subscribe(listener: (value: T) => void): () => void
}

export type Parser<T> = (raw: unknown) => T | null

function chromeStore<T>(key: string, parse: Parser<T>): Store<T> {
  return {
    async load() {
      const result = await chrome.storage.local.get(key)
      return parse(result[key])
    },
    async save(value) {
      await chrome.storage.local.set({ [key]: value })
    },
    subscribe(listener) {
      const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        if (area !== 'local' || !(key in changes)) return
        const value = parse(changes[key].newValue)
        if (value !== null) listener(value)
      }
      chrome.storage.onChanged.addListener(handler)
      return () => chrome.storage.onChanged.removeListener(handler)
    },
  }
}

function localStore<T>(key: string, parse: Parser<T>): Store<T> {
  const read = (raw: string | null) => {
    if (raw === null) return null
    try {
      return parse(JSON.parse(raw))
    } catch {
      return null
    }
  }

  return {
    async load() {
      try {
        return read(localStorage.getItem(key))
      } catch {
        return null
      }
    },
    async save(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (err) {
        console.error(`Failed to save ${key}`, err)
      }
    },
    subscribe(listener) {
      const handler = (e: StorageEvent) => {
        if (e.key !== key) return
        const value = read(e.newValue)
        if (value !== null) listener(value)
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    },
  }
}

export function createStore<T>(key: string, parse: Parser<T>): Store<T> {
  return isExtension ? chromeStore(key, parse) : localStore(key, parse)
}
