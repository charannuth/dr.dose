-- Structured medical history for doctors: allergy reactions and severity,
-- condition status, dated surgeries, family history with relatives,
-- vaccinations, care team, emergency contact and a "last reviewed" date.
--
-- Stored as one JSON document that the app encrypts client-side (like
-- tracker_preferences.prefs), so the column is plain text. The existing flat
-- columns stay: known_allergies / known_conditions remain the list of names
-- used for allergy checks, and past_surgeries / family_history keep a
-- free-text copy for the web app.

alter table public.medical_records
  add column if not exists details text not null default '{}';

comment on column public.medical_records.details is
  'Client-encrypted JSON: allergy/condition details, surgeries, family, vaccines, care team, emergency contact, reviewedAt.';
