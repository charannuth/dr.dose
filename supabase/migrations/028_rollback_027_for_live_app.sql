-- EMERGENCY rollback for App Store builds that predate E2EE client code.
-- Restores text[] / numeric / jsonb / date types that migration 027 changed to text.
-- Safe to run when no vault-encrypted (e1:...) values exist yet.
-- Run in Supabase SQL Editor as postgres.

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

create or replace function public._text_json_to_text_array(val text)
returns text[]
language plpgsql
immutable
as $$
begin
  if val is null or btrim(val) = '' or btrim(val) = '[]' then
    return '{}'::text[];
  end if;
  -- If somehow ciphertext landed here, keep as a single opaque element
  if left(btrim(val), 3) = 'e1:' then
    return array[btrim(val)]::text[];
  end if;
  begin
    return coalesce(
      (select array_agg(x) from jsonb_array_elements_text(val::jsonb) as t(x)),
      '{}'::text[]
    );
  exception when others then
    return array[btrim(val)]::text[];
  end;
end;
$$;

do $$
begin
  -- medications
  if public._e2ee_col_udt('medications', 'prn_amount_hints') = 'text' then
    alter table public.medications alter column prn_amount_hints drop default;
    alter table public.medications
      alter column prn_amount_hints type text[]
      using public._text_json_to_text_array(prn_amount_hints);
    alter table public.medications alter column prn_amount_hints set default '{}';
  end if;

  if public._e2ee_col_udt('medications', 'prn_symptom_hints') = 'text' then
    alter table public.medications alter column prn_symptom_hints drop default;
    alter table public.medications
      alter column prn_symptom_hints type text[]
      using public._text_json_to_text_array(prn_symptom_hints);
    alter table public.medications alter column prn_symptom_hints set default '{}';
  end if;

  -- dose_logs
  if public._e2ee_col_udt('dose_logs', 'prn_symptoms') = 'text' then
    alter table public.dose_logs alter column prn_symptoms drop default;
    alter table public.dose_logs
      alter column prn_symptoms type text[]
      using public._text_json_to_text_array(prn_symptoms);
    alter table public.dose_logs alter column prn_symptoms set default '{}';
  end if;

  -- medical_records
  if public._e2ee_col_udt('medical_records', 'known_allergies') = 'text' then
    alter table public.medical_records alter column known_allergies drop default;
    alter table public.medical_records
      alter column known_allergies type text[]
      using public._text_json_to_text_array(known_allergies);
    alter table public.medical_records alter column known_allergies set default '{}';
  end if;

  if public._e2ee_col_udt('medical_records', 'known_conditions') = 'text' then
    alter table public.medical_records alter column known_conditions drop default;
    alter table public.medical_records
      alter column known_conditions type text[]
      using public._text_json_to_text_array(known_conditions);
    alter table public.medical_records alter column known_conditions set default '{}';
  end if;

  if public._e2ee_col_udt('medical_records', 'date_of_birth') = 'text' then
    alter table public.medical_records
      alter column date_of_birth type date
      using (
        case
          when date_of_birth is null or btrim(date_of_birth) = '' then null
          when left(btrim(date_of_birth), 3) = 'e1:' then null
          else date_of_birth::date
        end
      );
  end if;

  if public._e2ee_col_udt('medical_records', 'height_cm') = 'text' then
    alter table public.medical_records
      alter column height_cm type numeric(5, 1)
      using (
        case
          when height_cm is null or btrim(height_cm) = '' then null
          when left(btrim(height_cm), 3) = 'e1:' then null
          else height_cm::numeric
        end
      );
  end if;

  if public._e2ee_col_udt('medical_records', 'weight_kg') = 'text' then
    alter table public.medical_records
      alter column weight_kg type numeric(6, 2)
      using (
        case
          when weight_kg is null or btrim(weight_kg) = '' then null
          when left(btrim(weight_kg), 3) = 'e1:' then null
          else weight_kg::numeric
        end
      );
  end if;

  -- wellness
  if public._e2ee_col_udt('wellness_logs', 'symptoms') = 'text' then
    alter table public.wellness_logs alter column symptoms drop default;
    alter table public.wellness_logs
      alter column symptoms type text[]
      using public._text_json_to_text_array(symptoms);
    alter table public.wellness_logs alter column symptoms set default '{}';
  end if;

  if public._e2ee_col_udt('wellness_profiles', 'symptom_focus') = 'text' then
    alter table public.wellness_profiles alter column symptom_focus drop default;
    alter table public.wellness_profiles
      alter column symptom_focus type text[]
      using public._text_json_to_text_array(symptom_focus);
    alter table public.wellness_profiles alter column symptom_focus set default '{}';
  end if;

  if public._e2ee_col_udt('wellness_profiles', 'substance_use') = 'text' then
    alter table public.wellness_profiles alter column substance_use drop default;
    alter table public.wellness_profiles
      alter column substance_use type jsonb
      using (
        case
          when substance_use is null or btrim(substance_use) = '' then '{}'::jsonb
          when left(btrim(substance_use), 3) = 'e1:' then '{}'::jsonb
          else substance_use::jsonb
        end
      );
    alter table public.wellness_profiles alter column substance_use set default '{}'::jsonb;
  end if;

  -- cycle
  if public._e2ee_col_udt('cycle_day_logs', 'symptoms') = 'text' then
    alter table public.cycle_day_logs alter column symptoms drop default;
    alter table public.cycle_day_logs
      alter column symptoms type text[]
      using public._text_json_to_text_array(symptoms);
    alter table public.cycle_day_logs alter column symptoms set default '{}';
  end if;

  if public._e2ee_col_udt('cycle_day_logs', 'symptoms_pre') = 'text' then
    alter table public.cycle_day_logs alter column symptoms_pre drop default;
    alter table public.cycle_day_logs
      alter column symptoms_pre type text[]
      using public._text_json_to_text_array(symptoms_pre);
    alter table public.cycle_day_logs alter column symptoms_pre set default '{}';
  end if;

  if public._e2ee_col_udt('cycle_day_logs', 'symptoms_post') = 'text' then
    alter table public.cycle_day_logs alter column symptoms_post drop default;
    alter table public.cycle_day_logs
      alter column symptoms_post type text[]
      using public._text_json_to_text_array(symptoms_post);
    alter table public.cycle_day_logs alter column symptoms_post set default '{}';
  end if;

  -- HRT
  if public._e2ee_col_udt('hrt_day_logs', 'bodily_changes') = 'text' then
    alter table public.hrt_day_logs alter column bodily_changes drop default;
    alter table public.hrt_day_logs
      alter column bodily_changes type text[]
      using public._text_json_to_text_array(bodily_changes);
    alter table public.hrt_day_logs alter column bodily_changes set default '{}';
  end if;

  if public._e2ee_col_udt('hrt_day_logs', 'mood_changes') = 'text' then
    alter table public.hrt_day_logs alter column mood_changes drop default;
    alter table public.hrt_day_logs
      alter column mood_changes type text[]
      using public._text_json_to_text_array(mood_changes);
    alter table public.hrt_day_logs alter column mood_changes set default '{}';
  end if;

  -- weight
  if public._e2ee_col_udt('weight_logs', 'weight_kg') = 'text' then
    alter table public.weight_logs
      alter column weight_kg type numeric(6, 2)
      using (
        case
          when weight_kg is null or btrim(weight_kg) = '' then null
          when left(btrim(weight_kg), 3) = 'e1:' then null
          else weight_kg::numeric
        end
      );
  end if;

  if public._e2ee_col_udt('weight_settings', 'baseline_height_cm') = 'text' then
    alter table public.weight_settings
      alter column baseline_height_cm type numeric(5, 1)
      using (
        case
          when baseline_height_cm is null or btrim(baseline_height_cm) = '' then null
          when left(btrim(baseline_height_cm), 3) = 'e1:' then null
          else baseline_height_cm::numeric
        end
      );
  end if;

  if public._e2ee_col_udt('weight_settings', 'baseline_weight_kg') = 'text' then
    alter table public.weight_settings
      alter column baseline_weight_kg type numeric(6, 2)
      using (
        case
          when baseline_weight_kg is null or btrim(baseline_weight_kg) = '' then null
          when left(btrim(baseline_weight_kg), 3) = 'e1:' then null
          else baseline_weight_kg::numeric
        end
      );
  end if;
end $$;

drop function if exists public._text_json_to_text_array(text);
drop function if exists public._e2ee_col_udt(text, text);
