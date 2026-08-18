/**
 * Zero-access field encryption primitives.
 * DEK stays in process memory / SecureStore — never uploaded plaintext.
 */
import { gcm } from '@noble/ciphers/aes.js'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { bytesToHex, hexToBytes, utf8ToBytes, randomBytes as nobleRandom } from '@noble/hashes/utils.js'
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

export const CIPHER_PREFIX = 'e1:'
export const KDF_NAME = 'scrypt' as const

export type KdfParams = {
  N: number
  r: number
  p: number
  dkLen: number
}

/** Memory-hard enough to slow offline cracking; tuned for mobile. */
export const DEFAULT_KDF: KdfParams = {
  N: 16384,
  r: 8,
  p: 1,
  dkLen: 32,
}

const IV_LEN = 12
const KEY_LEN = 32

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

export function randomBytes(n: number): Uint8Array {
  return nobleRandom(n)
}

export function generateDek(): Uint8Array {
  return nobleRandom(KEY_LEN)
}

export function generateSalt(): Uint8Array {
  return nobleRandom(16)
}

export async function deriveKek(
  passphrase: string,
  salt: Uint8Array,
  params: KdfParams = DEFAULT_KDF,
): Promise<Uint8Array> {
  return scryptAsync(utf8ToBytes(passphrase), salt, {
    N: params.N,
    r: params.r,
    p: params.p,
    dkLen: params.dkLen,
  })
}

export function wrapKey(kek: Uint8Array, dek: Uint8Array): string {
  const iv = nobleRandom(IV_LEN)
  const aes = gcm(kek, iv)
  const ct = aes.encrypt(dek)
  return `w1:${bytesToHex(iv)}:${bytesToHex(ct)}`
}

export function unwrapKey(kek: Uint8Array, wrapped: string): Uint8Array {
  const parts = wrapped.split(':')
  if (parts.length !== 3 || parts[0] !== 'w1') {
    throw new Error('Invalid wrapped key format')
  }
  const iv = hexToBytes(parts[1])
  const ct = hexToBytes(parts[2])
  const aes = gcm(kek, iv)
  return aes.decrypt(ct)
}

export function encryptBytes(dek: Uint8Array, plaintext: Uint8Array, aad: string): string {
  const iv = nobleRandom(IV_LEN)
  const aes = gcm(dek, iv, utf8ToBytes(aad))
  const ct = aes.encrypt(plaintext)
  return `${CIPHER_PREFIX}${bytesToHex(iv)}:${bytesToHex(ct)}`
}

export function decryptBytes(dek: Uint8Array, payload: string, aad: string): Uint8Array {
  if (!isCiphertext(payload)) {
    throw new Error('Not ciphertext')
  }
  const body = payload.slice(CIPHER_PREFIX.length)
  const sep = body.indexOf(':')
  if (sep < 0) throw new Error('Invalid ciphertext format')
  const iv = hexToBytes(body.slice(0, sep))
  const ct = hexToBytes(body.slice(sep + 1))
  const aes = gcm(dek, iv, utf8ToBytes(aad))
  return aes.decrypt(ct)
}

export function encryptString(dek: Uint8Array, plaintext: string, aad: string): string {
  return encryptBytes(dek, utf8ToBytes(plaintext), aad)
}

export function decryptString(dek: Uint8Array, payload: string, aad: string): string {
  if (!isCiphertext(payload)) return payload
  return bytesToUtf8(decryptBytes(dek, payload, aad))
}

export function isCiphertext(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(CIPHER_PREFIX)
}

export function generateRecoveryMnemonic(): string {
  return generateMnemonic(wordlist, 128)
}

export function isValidRecoveryMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic.trim().toLowerCase().replace(/\s+/g, ' '), wordlist)
}

/** Derive a recovery passphrase material from BIP39 mnemonic (not used as login). */
export function mnemonicToRecoverySecret(mnemonic: string): string {
  const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!validateMnemonic(normalized, wordlist)) {
    throw new Error('Invalid recovery phrase')
  }
  const seed = mnemonicToSeedSync(normalized, 'drdose-vault')
  return bytesToHex(seed.slice(0, 32))
}

export function bytesToB64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

export function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export function saltToStorage(salt: Uint8Array): string {
  return bytesToHex(salt)
}

export function saltFromStorage(hex: string): Uint8Array {
  return hexToBytes(hex)
}
