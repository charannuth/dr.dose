-- Universal tracker personalization + extended day entries.
--
-- tracker_preferences: one row per user per tracker (cycle, hrt, weight, ...).
--   `prefs` holds the user's choices (goals, visible sections, wording,
--   discreet mode, regimen, ...) as JSON. The app encrypts it client-side when
--   the vault is unlocked, so the column is plain text.
--
-- tracker_day_entries: one row per user per tracker per day for the extra
--   details each tracker logs beyond its core table (mood, pain, discharge,
--   fertility signs, injection site, labs, ...). `data` is JSON, encrypted
--   client-side like `prefs`. New trackers can live entirely in this table.

create table if not exists public.tracker_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  tracker_id text not null,
  prefs text not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tracker_id)
);

comment on table public.tracker_preferences is
  'Per-tracker personalization (goals, visible sections, wording). prefs is client-encrypted JSON.';

create table if not exists public.tracker_day_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  tracker_id text not null,
  log_date date not null,
  data text not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tracker_id, log_date)
);

create index if not exists tracker_day_entries_user_tracker_date_idx
  on public.tracker_day_entries (user_id, tracker_id, log_date desc);

comment on table public.tracker_day_entries is
  'Extended per-day tracker details. data is client-encrypted JSON.';

alter table public.tracker_preferences enable row level security;
alter table public.tracker_day_entries enable row level security;

drop policy if exists "Users manage own tracker preferences" on public.tracker_preferences;
create policy "Users manage own tracker preferences"
  on public.tracker_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own tracker day entries" on public.tracker_day_entries;
create policy "Users manage own tracker day entries"
  on public.tracker_day_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists tracker_preferences_updated_at on public.tracker_preferences;
create trigger tracker_preferences_updated_at
  before update on public.tracker_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists tracker_day_entries_updated_at on public.tracker_day_entries;
create trigger tracker_day_entries_updated_at
  before update on public.tracker_day_entries
  for each row execute function public.set_updated_at();
