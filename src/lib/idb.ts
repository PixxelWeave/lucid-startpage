/**
 * 极简 IndexedDB 键值存储，用于存放体积较大的二进制数据（如背景图片 Blob）。
 * 扩展和开发预览都可用；小而结构化的数据仍走 lib/storage.ts。
 */
const DB_NAME = 'startpage'
const STORE = 'files'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).catch((err: unknown) => {
    // 允许下次重试
    dbPromise = null
    throw err
  })
  return dbPromise
}

/** 在一个事务中执行请求；读取在请求成功时返回，写入等事务提交后才返回。 */
async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export function idbGet(key: string): Promise<unknown> {
  return run('readonly', (s) => s.get(key))
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  await run('readwrite', (s) => s.put(value, key))
}

export async function idbDelete(key: string): Promise<void> {
  await run('readwrite', (s) => s.delete(key))
}

export async function idbKeys(): Promise<string[]> {
  const keys = await run('readonly', (s) => s.getAllKeys())
  return keys.filter((k): k is string => typeof k === 'string')
}
