-- Per-user encryption vault metadata. The DEK never leaves the device unwrapped.
-- wrapped_dek / wrapped_dek_recovery are ciphertext only (AES-GCM under scrypt-derived KEKs).
-- Idempotent: safe to re-run if a previous attempt partially applied.

create table if not exists public.user_crypto (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kdf text not null default 'scrypt',
  kdf_params jsonb not null default '{"N":16384,"r":8,"p":1,"dkLen":32}'::jsonb,
  salt text not null,
  wrapped_dek text not null,
  recovery_salt text not null,
  wrapped_dek_recovery text not null,
  migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_crypto is
  'Zero-access vault: wrapped data-encryption keys only. Passphrases never stored.';

alter table public.user_crypto enable row level security;

drop policy if exists "Users can view own crypto" on public.user_crypto;
create policy "Users can view own crypto"
  on public.user_crypto for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own crypto" on public.user_crypto;
create policy "Users can insert own crypto"
  on public.user_crypto for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own crypto" on public.user_crypto;
create policy "Users can update own crypto"
  on public.user_crypto for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own crypto" on public.user_crypto;
create policy "Users can delete own crypto"
  on public.user_crypto for delete
  using (auth.uid() = user_id);

drop trigger if exists user_crypto_set_updated_at on public.user_crypto;
create trigger user_crypto_set_updated_at
  before update on public.user_crypto
  for each row execute function public.set_updated_at();
