import type { AppData } from '@/types'
import type { PersistenceAdapter } from './types'

const DB_NAME = 'dubai-shopping-planner'
const DB_VERSION = 1
const STORE_NAME = 'app-state'
const RECORD_KEY = 'state'

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

/**
 * Primary adapter. Uploaded photos are stored as data URLs, which quickly
 * outgrow the ~5MB localStorage budget, so IndexedDB is the default.
 */
export class IndexedDbAdapter implements PersistenceAdapter {
  readonly name = 'indexedDB'
  private dbPromise: Promise<IDBDatabase> | null = null

  static isAvailable(): boolean {
    try {
      return typeof indexedDB !== 'undefined' && indexedDB !== null
    } catch {
      return false
    }
  }

  private open(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
      request.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'))
    })
    return this.dbPromise
  }

  private async withStore<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open()
    const transaction = db.transaction(STORE_NAME, mode)
    const result = promisify(run(transaction.objectStore(STORE_NAME)))
    return result
  }

  async load(): Promise<AppData | null> {
    const value = await this.withStore<AppData | undefined>('readonly', (store) =>
      store.get(RECORD_KEY),
    )
    return value ?? null
  }

  async save(data: AppData): Promise<void> {
    // Structured clone cannot carry React state proxies or functions; the data
    // model is plain JSON, but round-tripping keeps that guarantee honest.
    await this.withStore('readwrite', (store) =>
      store.put(JSON.parse(JSON.stringify(data)), RECORD_KEY),
    )
  }

  async clear(): Promise<void> {
    await this.withStore('readwrite', (store) => store.delete(RECORD_KEY))
  }
}
