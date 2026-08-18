import * as Crypto from 'expo-crypto'

/** UUID v4 that works on React Native (Web Crypto is often missing). */
export function newId(): string {
  if (typeof Crypto.randomUUID === 'function') {
    return Crypto.randomUUID()
  }
  const web = globalThis.crypto
  if (web && typeof web.randomUUID === 'function') {
    return web.randomUUID()
  }
  throw new Error('No UUID generator available')
}
