-- Server-side recovery for the health-data vault, so users never have to save a
-- 12-word backup. The DEK is encrypted by the `vault-escrow` Edge Function with a
-- secret that lives only in Edge Function secrets (VAULT_ESCROW_KEY), never in the
-- database. Idempotent: safe to re-run.

alter table public.user_crypto
  add column if not exists wrapped_dek_server text;

comment on column public.user_crypto.wrapped_dek_server is
  'DEK encrypted by the vault-escrow Edge Function (AES-GCM, key derived from VAULT_ESCROW_KEY + user id). Lets a password reset recover data without the 12-word backup.';
