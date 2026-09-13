import type { AppData } from '@/types'
import type { PersistenceAdapter } from './types'

/**
 * The app was renamed to "Shopping List", but this key was not: it identifies
 * data already saved on people's phones. Renaming it would orphan their lists.
 */
export const STORAGE_KEY = 'dubai-shopping-planner/v1'

/** Fallback adapter. Small quota, but available almost everywhere. */
export class LocalStorageAdapter implements PersistenceAdapter {
  readonly name = 'localStorage'
  private readonly key: string

  constructor(key: string = STORAGE_KEY) {
    this.key = key
  }

  static isAvailable(): boolean {
    try {
      const probe = '__dsp_probe__'
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
      return true
    } catch {
      return false
    }
  }

  async load(): Promise<AppData | null> {
    try {
      const raw = window.localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as AppData) : null
    } catch {
      return null
    }
  }

  async save(data: AppData): Promise<void> {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data))
    } catch (error) {
      throw new Error(
        error instanceof DOMException && error.name === 'QuotaExceededError'
          ? 'Browser storage is full. Remove a few uploaded photos or export and reset your data.'
          : 'Could not save to browser storage.',
      )
    }
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.removeItem(this.key)
    } catch {
      /* nothing useful to do */
    }
  }
}
