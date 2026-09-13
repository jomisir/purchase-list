import type { AppData } from '@/types'
import { IndexedDbAdapter } from './indexedDb'
import { LocalStorageAdapter } from './localStorage'
import type { PersistenceAdapter } from './types'

export type { PersistenceAdapter } from './types'
export { STORAGE_KEY } from './localStorage'

/** Last resort so the app still runs (in-memory) in a locked-down browser. */
class MemoryAdapter implements PersistenceAdapter {
  readonly name = 'memory'
  private data: AppData | null = null
  async load() {
    return this.data
  }
  async save(data: AppData) {
    this.data = data
  }
  async clear() {
    this.data = null
  }
}

/**
 * Picks IndexedDB when it works, falls back to localStorage, and migrates any
 * data left behind by an earlier localStorage-only session.
 */
export function createPersistence(): PersistenceAdapter {
  if (typeof window === 'undefined') return new MemoryAdapter()

  const local = LocalStorageAdapter.isAvailable() ? new LocalStorageAdapter() : null

  if (IndexedDbAdapter.isAvailable()) {
    const primary = new IndexedDbAdapter()
    return {
      name: local ? 'indexedDB (localStorage fallback)' : 'indexedDB',
      async load() {
        try {
          const fromIdb = await primary.load()
          if (fromIdb) return fromIdb
          // First run after an upgrade: adopt whatever localStorage still holds.
          const legacy = await local?.load()
          if (legacy) {
            await primary.save(legacy)
            return legacy
          }
          return null
        } catch {
          return local ? local.load() : null
        }
      },
      async save(data) {
        try {
          await primary.save(data)
        } catch (error) {
          if (!local) throw error
          await local.save(data)
        }
      },
      async clear() {
        await Promise.allSettled([primary.clear(), local?.clear()])
      },
    }
  }

  return local ?? new MemoryAdapter()
}
