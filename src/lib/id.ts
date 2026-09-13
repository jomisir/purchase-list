/** Stable-enough unique id that works without `crypto.randomUUID`. */
export function createId(prefix = 'id'): string {
  const globalCrypto = globalThis.crypto
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return `${prefix}_${globalCrypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
