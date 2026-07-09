-- Per-medication tile color on the Today screen (palette key, e.g. routeOral).
alter table public.medications
  add column if not exists tile_color text;

comment on column public.medications.tile_color is
  'Optional palette key for Today tile accent (e.g. routeOral, accentPurple). Null = derive from medication_route.';
