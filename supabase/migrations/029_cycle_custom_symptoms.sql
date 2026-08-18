-- Persist user-defined pre / during period symptom labels across cycles.

alter table public.cycle_settings
  add column if not exists custom_symptoms_pre text[] not null default '{}',
  add column if not exists custom_symptoms_during text[] not null default '{}';

comment on column public.cycle_settings.custom_symptoms_pre is
  'User-added pre-menstrual symptom labels (shown with defaults until removed).';
comment on column public.cycle_settings.custom_symptoms_during is
  'User-added during-period symptom labels (shown with defaults until removed).';
