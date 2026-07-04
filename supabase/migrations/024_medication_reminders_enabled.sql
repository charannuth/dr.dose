-- Per-medication reminder opt-out. Reminders were previously all-or-nothing via a
-- single global setting. This lets a user keep a scheduled item (so it still shows
-- on Today with dose times to check off) while choosing NOT to get a push for it —
-- useful for supplements they'd rather track quietly.
--
-- Defaults to true so existing scheduled medications keep notifying as before.

alter table public.medications
  add column if not exists reminders_enabled boolean not null default true;

comment on column public.medications.reminders_enabled is
  'When false, this medication/supplement is skipped by dose reminder scheduling even if global reminders are on. Its scheduled dose times still appear on Today.';
