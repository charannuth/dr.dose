-- Allow PHI array/enum columns to store ciphertext strings (client-side E2EE).
-- Existing plaintext is preserved as JSON text; the app migrates to ciphertext on unlock.
-- Safe to re-run: only converts columns that are still the old types.

create or replace function public._e2ee_col_udt(p_table text, p_column text)
returns text
language sql
stable
as $$
  select c.udt_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_table
    and c.column_name = p_column;
$$;

-- Medications: text[] → text
do $$
begin
  if public._e2ee_col_udt('medications', 'prn_amount_hints') = '_text' then
    alter table public.medications alter column prn_amount_hints drop default;
    alter table public.medications
      alter column prn_amount_hints type text
      using coalesce(array_to_json(prn_amount_hints)::text, '[]');
    alter table public.medications alter column prn_amount_hints set default '[]';
  end if;

  if public._e2ee_col_udt('medications', 'prn_symptom_hints') = '_text' then
    alter table public.medications alter column prn_symptom_hints drop default;
    alter table public.medications
      alter column prn_symptom_hints type text
      using coalesce(array_to_json(prn_symptom_hints)::text, '[]');
    alter table public.medications alter column prn_symptom_hints set default '[]';
  end if;
end $$;

-- Dose logs
do $$
begin
  if public._e2ee_col_udt('dose_logs', 'prn_symptoms') = '_text' then
    alter table public.dose_logs alter column prn_symptoms drop default;
    alter table public.dose_logs
      alter column prn_symptoms type text
      using coalesce(array_to_json(prn_symptoms)::text, '[]');
    alter table public.dose_logs alter column prn_symptoms set default '[]';
  end if;
end $$;

-- Medical records
alter table public.medical_records
  drop constraint if exists medical_records_blood_type_check;

do $$
begin
  if public._e2ee_col_udt('medical_records', 'known_allergies') = '_text' then
    alter table public.medical_records alter column known_allergies drop default;
    alter table public.medical_records
      alter column known_allergies type text
      using coalesce(array_to_json(known_allergies)::text, '[]');
    alter table public.medical_records alter column known_allergies set default '[]';
  end if;

  if public._e2ee_col_udt('medical_records', 'known_conditions') = '_text' then
    alter table public.medical_records alter column known_conditions drop default;
    alter table public.medical_records
      alter column known_conditions type text
      using coalesce(array_to_json(known_conditions)::text, '[]');
    alter table public.medical_records alter column known_conditions set default '[]';
  end if;

  if public._e2ee_col_udt('medical_records', 'date_of_birth') = 'date' then
    alter table public.medical_records
      alter column date_of_birth type text using (
        case when date_of_birth is null then null else date_of_birth::text end
      );
  end if;

  if public._e2ee_col_udt('medical_records', 'height_cm') in ('numeric', 'float4', 'float8', 'int2', 'int4', 'int8') then
    alter table public.medical_records
      alter column height_cm type text using (
        case when height_cm is null then null else height_cm::text end
      );
  end if;

  if public._e2ee_col_udt('medical_records', 'weight_kg') in ('numeric', 'float4', 'float8', 'int2', 'int4', 'int8') then
    alter table public.medical_records
      alter column weight_kg type text using (
        case when weight_kg is null then null else weight_kg::text end
      );
  end if;
end $$;

-- Wellness
do $$
begin
  if public._e2ee_col_udt('wellness_logs', 'symptoms') = '_text' then
    alter table public.wellness_logs alter column symptoms drop default;
    alter table public.wellness_logs
      alter column symptoms type text
      using coalesce(array_to_json(symptoms)::text, '[]');
    alter table public.wellness_logs alter column symptoms set default '[]';
  end if;

  if public._e2ee_col_udt('wellness_profiles', 'symptom_focus') = '_text' then
    alter table public.wellness_profiles alter column symptom_focus drop default;
    alter table public.wellness_profiles
      alter column symptom_focus type text
      using coalesce(array_to_json(symptom_focus)::text, '[]');
    alter table public.wellness_profiles alter column symptom_focus set default '[]';
  end if;

  if public._e2ee_col_udt('wellness_profiles', 'substance_use') = 'jsonb' then
    alter table public.wellness_profiles alter column substance_use drop default;
    alter table public.wellness_profiles
      alter column substance_use type text
      using coalesce(substance_use::text, '{}');
    alter table public.wellness_profiles alter column substance_use set default '{}';
  end if;
end $$;

-- Cycle day logs
do $$
begin
  if public._e2ee_col_udt('cycle_day_logs', 'symptoms') = '_text' then
    alter table public.cycle_day_logs alter column symptoms drop default;
    alter table public.cycle_day_logs
      alter column symptoms type text
      using coalesce(array_to_json(symptoms)::text, '[]');
    alter table public.cycle_day_logs alter column symptoms set default '[]';
  end if;

  if public._e2ee_col_udt('cycle_day_logs', 'symptoms_pre') = '_text' then
    alter table public.cycle_day_logs alter column symptoms_pre drop default;
    alter table public.cycle_day_logs
      alter column symptoms_pre type text
      using coalesce(array_to_json(symptoms_pre)::text, '[]');
    alter table public.cycle_day_logs alter column symptoms_pre set default '[]';
  end if;

  if public._e2ee_col_udt('cycle_day_logs', 'symptoms_post') = '_text' then
    alter table public.cycle_day_logs alter column symptoms_post drop default;
    alter table public.cycle_day_logs
      alter column symptoms_post type text
      using coalesce(array_to_json(symptoms_post)::text, '[]');
    alter table public.cycle_day_logs alter column symptoms_post set default '[]';
  end if;
end $$;

-- HRT: bodily_changes / mood_changes are text[]; other_changes is already text — do not convert it
do $$
begin
  if public._e2ee_col_udt('hrt_day_logs', 'bodily_changes') = '_text' then
    alter table public.hrt_day_logs alter column bodily_changes drop default;
    alter table public.hrt_day_logs
      alter column bodily_changes type text
      using coalesce(array_to_json(bodily_changes)::text, '[]');
    alter table public.hrt_day_logs alter column bodily_changes set default '[]';
  end if;

  if public._e2ee_col_udt('hrt_day_logs', 'mood_changes') = '_text' then
    alter table public.hrt_day_logs alter column mood_changes drop default;
    alter table public.hrt_day_logs
      alter column mood_changes type text
      using coalesce(array_to_json(mood_changes)::text, '[]');
    alter table public.hrt_day_logs alter column mood_changes set default '[]';
  end if;
end $$;

-- Weight logs / settings: numeric → text
do $$
begin
  if public._e2ee_col_udt('weight_logs', 'weight_kg') in ('numeric', 'float4', 'float8', 'int2', 'int4', 'int8') then
    alter table public.weight_logs
      alter column weight_kg type text using weight_kg::text;
  end if;

  if public._e2ee_col_udt('weight_settings', 'baseline_height_cm') in ('numeric', 'float4', 'float8', 'int2', 'int4', 'int8') then
    alter table public.weight_settings
      alter column baseline_height_cm type text using (
        case when baseline_height_cm is null then null else baseline_height_cm::text end
      );
  end if;

  if public._e2ee_col_udt('weight_settings', 'baseline_weight_kg') in ('numeric', 'float4', 'float8', 'int2', 'int4', 'int8') then
    alter table public.weight_settings
      alter column baseline_weight_kg type text using (
        case when baseline_weight_kg is null then null else baseline_weight_kg::text end
      );
  end if;
end $$;

drop function if exists public._e2ee_col_udt(text, text);
