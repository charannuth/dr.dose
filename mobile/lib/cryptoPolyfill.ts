/**
 * Hermes / React Native does not always expose Web Crypto
 * (`crypto.randomUUID`, `crypto.getRandomValues`). Noble and dose inserts
 * need both. Install once at app entry.
 */
import * as Crypto from 'expo-crypto'

export function installCryptoPolyfill(): void {
  const g = globalThis as typeof globalThis & { crypto?: object }
  const target = (g.crypto ?? {}) as Record<string, unknown>

  if (typeof target.randomUUID !== 'function') {
    target.randomUUID = () => Crypto.randomUUID()
  }
  if (typeof target.getRandomValues !== 'function') {
    target.getRandomValues = Crypto.getRandomValues.bind(Crypto)
  }

  if (!g.crypto) {
    Object.defineProperty(g, 'crypto', {
      value: target,
      configurable: true,
      writable: true,
    })
  }
}

installCryptoPolyfill()
