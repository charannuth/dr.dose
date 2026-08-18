# Database migrations

Dr. Dose uses **Supabase PostgreSQL** with migrations in `supabase/migrations/`. Each file is intended to be run **once**, in numeric order, in the Supabase **SQL Editor** (or via Supabase CLI if you adopt it later).

## Audit status (repo ↔ app)

| # | File | Purpose | App dependency |
|---|------|---------|----------------|
| — | [`schema.sql`](../supabase/schema.sql) | Bootstrap: `medications`, `dose_logs`, RLS, `set_updated_at` | Required for new projects |
| 002 | `002_dose_per_schedule_time.sql` | One log per med + day + **schedule time** | Today, History, streaks |
| 003 | `003_split_dose_pills_mg.sql` | `dose_pills` / `dose_mg` (replaces `dosage`) | Medication form |
| 004 | `004_medication_dates.sql` | `start_date`, `end_date` | Active med filtering |
| 005 | `005_medication_type.sql` | `medication_route`, `medication_form` | Safety / PRN defaults |
| 006 | `006_wellness.sql` | `wellness_profiles`, `wellness_logs` | Wellness, doctor report |
| 007 | `007_avatars_storage.sql` | `avatars` storage bucket + policies | Account profile photo |
| 008 | `008_medical_records.sql` | `medical_records` | Allergies, Medical records page |
| 009 | `009_schedule_type_and_demographics.sql` | `schedule_type`, DOB/gender/height/weight on records | PRN vs scheduled, profile |
| 010 | `010_tracking.sql` | Tracking hub, cycle tables, `tracker_dose_events` | `/tracking`, cycle calendar |
| 011 | `011_dose_flexibility.sql` | PRN caps, `logged_amount`, amount hints | As-needed meds |
| 012 | `012_prn_dose_context.sql` | `prn_symptoms`, `prn_reason`, `prn_notes` on logs | PRN check-in |
| 013 | `013_prn_symptom_hints.sql` | `prn_symptom_hints` on medications | Per-med PRN chips |
| 014 | `014_cycle_tracking_enhancements.sql` | Intercourse, pre/post symptoms, late flag | Cycle tracker |
| 015 | `015_cycle_length_history.sql` | `cycle_length_days`, `expected_next_cycle_days` | Variable cycle predictions |
| 016 | `016_body_metric_units.sql` | `height_unit`, `weight_unit` on medical records | Metric / imperial preference |
| 017 | `017_weight_tracking.sql` | Weight baseline + calories + weight logs + frequency | Weight tracker calendar |
| 018 | `018_hrt_tracking.sql` | HRT day journaling (bodily + mood changes) | HRT tracker calendar |
| 019 | `019_doctor_visits.sql` | `doctor_visits` scheduling + post-visit notes | Doctor visits page (web) |

| 025 | `025_medication_tile_color.sql` | Tile accent color | Today tiles |
| 026 | `026_user_crypto.sql` | Zero-access vault metadata (`user_crypto`) | E2EE unlock |
| 027 | `027_e2ee_column_types.sql` | PHI array/numeric columns → text for ciphertext | Full E2EE column types |
| 028 | `028_rollback_027_for_live_app.sql` | Restores text[] / numeric / date / jsonb after 027 | Keeps pre-E2EE App Store clients working |
| 029 | `029_cycle_custom_symptoms.sql` | `custom_symptoms_pre` / `custom_symptoms_during` on `cycle_settings` | Persistent user-defined cycle symptom chips |

**Production (current):** Apply **026** (`user_crypto`). **Do not leave 027 applied alone** while the App Store build is still pre-E2EE — that broke `text[]` consumers (`undefined is not a function` on As needed). Live production was rolled back with **028**. The shipping E2EE client stores encrypted arrays as single-element `text[]` (`[ciphertext]`) so it works on the post-028 schema. Re-apply **027** only when promoting a matching client to the App Store (and coordinating with force-update). Apply **029** for custom period symptom labels.

**Existing projects:** Need **026**. Apply **027** only as part of a coordinated App Store cutover; use **028** if 027 must be undone for older binaries.

### `schema.sql` vs migrations

[`schema.sql`](../supabase/schema.sql) reflects an early **v1** baseline (medications + dose_logs with per-slot uniqueness and date range). It does **not** include wellness, medical records, tracking, or PRN columns.

- **Brand-new database:** Run `schema.sql`, then **002 through 016** in order. Later files use `if not exists` / `add column if not exists` where possible; early steps may no-op on a fresh `schema.sql`.
- **Existing production DB:** Run only migrations you have not applied yet (check the list below).

### Verify Supabase matches the repo

In the SQL Editor, run:

```sql
-- Tables the web app expects (all should return a row)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'medications', 'dose_logs', 'wellness_profiles', 'wellness_logs',
    'medical_records', 'user_trackers', 'cycle_settings', 'cycle_periods',
    'cycle_day_logs', 'tracker_dose_events',
    'weight_settings', 'weight_logs', 'hrt_day_logs'
  )
order by table_name;

-- Spot-check newest columns (016)
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'medical_records'
  and column_name in ('height_unit', 'weight_unit');
```

You should see the expected tables and both unit columns. Also confirm `medications.schedule_type` and `dose_logs.logged_amount` exist.

### Objects by area

| Area | Tables / storage |
|------|------------------|
| Core | `medications`, `dose_logs` |
| Wellness | `wellness_profiles`, `wellness_logs` |
| Profile | `medical_records`, storage `avatars` |
| Tracking | `user_trackers`, `cycle_settings`, `cycle_periods`, `cycle_day_logs`, `tracker_dose_events` |
| Weight & HRT | `weight_settings`, `weight_logs`, `hrt_day_logs` |

All user tables use **RLS** (`auth.uid() = user_id` or equivalent).

## Run order (copy-paste checklist)

1. `supabase/schema.sql`
2. `supabase/migrations/002_dose_per_schedule_time.sql`
3. `supabase/migrations/003_split_dose_pills_mg.sql`
4. `supabase/migrations/004_medication_dates.sql`
5. `supabase/migrations/005_medication_type.sql`
6. `supabase/migrations/006_wellness.sql`
7. `supabase/migrations/007_avatars_storage.sql`
8. `supabase/migrations/008_medical_records.sql`
9. `supabase/migrations/009_schedule_type_and_demographics.sql`
10. `supabase/migrations/010_tracking.sql`
11. `supabase/migrations/011_dose_flexibility.sql`
12. `supabase/migrations/012_prn_dose_context.sql`
13. `supabase/migrations/013_prn_symptom_hints.sql`
14. `supabase/migrations/014_cycle_tracking_enhancements.sql`
15. `supabase/migrations/015_cycle_length_history.sql`
16. `supabase/migrations/016_body_metric_units.sql`
17. `supabase/migrations/017_weight_tracking.sql`
18. `supabase/migrations/018_hrt_tracking.sql`

## Troubleshooting

| Error / symptom | Likely fix |
|-----------------|------------|
| `relation "wellness_logs" does not exist` | Run `006_wellness.sql` |
| `column "schedule_type" does not exist` | Run `009_schedule_type_and_demographics.sql` |
| Cycle / Tracking page errors | Run `010`–`015` |
| Unit preference not saving | Run `016_body_metric_units.sql` |
| Profile photo upload fails | Run `007_avatars_storage.sql` |
| PRN check-in errors | Run `011`–`013` |
| Weight tracker errors | Run `017_weight_tracking.sql` |
| HRT tracker errors | Run `018_hrt_tracking.sql` |

See also [SUPABASE_SETUP.md](SUPABASE_SETUP.md) and [DEPLOY.md](DEPLOY.md).
