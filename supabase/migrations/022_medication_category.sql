-- Medication category: distinguishes regular medications from supplements so the
-- Today screen can surface supplements (vitamins, minerals, herbals, etc.) in
-- their own tab. A supplement can still be either scheduled or as-needed.

alter table public.medications
  add column if not exists category text not null default 'medication'
  check (category in ('medication', 'supplement'));

comment on column public.medications.category is
  'medication = prescription/OTC drug; supplement = vitamin/mineral/herbal. Shown in separate Today tabs.';
