// Supabase Edge Function: vault-escrow
//
// Keeps a server-held copy of each user's vault key (DEK), encrypted with a secret
// that only exists in Edge Function secrets. This replaces the 12-word backup:
// after a password reset the app asks this function for the key and re-locks it
// with the new password.
//
// Setup (once):
//   supabase secrets set VAULT_ESCROW_KEY="$(openssl rand -base64 32)"
//   supabase functions deploy vault-escrow
// Back up VAULT_ESCROW_KEY somewhere safe. If it is lost, escrowed keys cannot be
// decrypted and users fall back to the old account backup words (if they have them).

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) throw new Error('bad hex')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function userKey(userId: string): Promise<CryptoKey> {
  const secret = Deno.env.get('VAULT_ESCROW_KEY')
  if (!secret) throw new Error('VAULT_ESCROW_KEY is not set')
  const master = base64ToBytes(secret)
  if (master.length < 32) throw new Error('VAULT_ESCROW_KEY must be at least 32 bytes')
  const base = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('dr-dose-vault-escrow-v1'),
      info: new TextEncoder().encode(userId),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data, error: authError } = await supabase.auth.getUser()
    const user = data?.user
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const key = await userKey(user.id)

    if (body.action === 'store') {
      if (typeof body.dek !== 'string' || body.dek.length !== 64) {
        return json({ error: 'Invalid key' }, 400)
      }
      const dek = hexToBytes(body.dek)
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const ct = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dek),
      )
      const stored = `${bytesToHex(iv)}:${bytesToHex(ct)}`
      const { error } = await supabase
        .from('user_crypto')
        .update({ wrapped_dek_server: stored })
        .eq('user_id', user.id)
      if (error) return json({ error: 'Could not save' }, 500)
      return json({ ok: true })
    }

    if (body.action === 'fetch') {
      const { data: row, error } = await supabase
        .from('user_crypto')
        .select('wrapped_dek_server')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) return json({ error: 'Could not load' }, 500)
      const stored = row?.wrapped_dek_server as string | null | undefined
      if (!stored) return json({ dek: null })
      const [ivHex, ctHex] = stored.split(':')
      const dek = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: hexToBytes(ivHex) },
          key,
          hexToBytes(ctHex),
        ),
      )
      return json({ dek: bytesToHex(dek) })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('[vault-escrow]', e)
    return json({ error: 'Server error' }, 500)
  }
})
