import type { AppData } from '@/types'

/**
 * The only contract the app has with persistence.
 *
 * It is async on purpose: a Supabase-backed adapter can be dropped in behind
 * this interface without touching a single component.
 */
export interface PersistenceAdapter {
  readonly name: string
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
  clear(): Promise<void>
}
