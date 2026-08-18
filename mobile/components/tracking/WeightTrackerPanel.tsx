import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { todayLocalDate } from '../../lib/dates';
import type { BodyMetricUnit } from '../../lib/bodyMetrics';
import { fetchMedicalRecord, updateBodyMetricUnits } from '../../lib/medicalRecords';
import type { MedicalRecord } from '../../lib/medicalRecords';
import { CycleDayStrip } from './CycleDayStrip';
import { HeightWeightFields } from './HeightWeightFields';
import { SelectField } from './SelectField';
import { sealRow } from '../../lib/crypto/seal';
import { supabase } from '../../lib/supabase';
import {
  computeDailyTargets,
  computeMaintenanceCalories,
  fetchWeightLog,
  fetchWeightLogs,
  fetchWeightSettings,
  type WeightGoalDirection,
  type WeightGoalRate,
  type WeightActivityLevel,
  type WeightLog,
  type WeightSettings,
  upsertWeightLog,
  updateWeightSettings,
} from '../../lib/tracking/weight';
import { kgToLbString, lbStringToKg, parsePositiveNumber } from '../../lib/bodyMetrics';
import { useTrackingStyles } from './trackingStyles';

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onDataMutated?: () => void;
};

function parseMaybeInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseMaybeNumber(value: string): number | null {
  return parsePositiveNumber(value);
}

function freqLabel(days: number): string {
  if (days === 1) return 'Every day';
  if (days === 3) return 'Every 3 days';
  if (days === 7) return 'Every 7 days';
  return `Every ${days} days`;
}

function daysBetweenAnchor(anchor: string, date: string): number {
  const [y1, m1, d1] = anchor.split('-').map(Number);
  const [y2, m2, d2] = date.split('-').map(Number);
  const t1 = new Date(y1, m1 - 1, d1, 12).getTime();
  const t2 = new Date(y2, m2 - 1, d2, 12).getTime();
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
}

export function WeightTrackerPanel({ selectedDate, onSelectDate, onDataMutated }: Props) {
  const trackingStyles = useTrackingStyles();
  const { colors } = useTheme();
  const { user } = useAuth();
  const today = todayLocalDate();

  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [settings, setSettings] = useState<WeightSettings | null>(null);
  const [weightLogsInMonth, setWeightLogsInMonth] = useState<WeightLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<WeightLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heightUnit, setHeightUnit] = useState<BodyMetricUnit>('metric');
  const [weightUnit, setWeightUnit] = useState<BodyMetricUnit>('metric');
  const isFutureDay = selectedDate > today;

  const [breakfastDraft, setBreakfastDraft] = useState('');
  const [lunchDraft, setLunchDraft] = useState('');
  const [dinnerDraft, setDinnerDraft] = useState('');
  const [didWorkoutDraft, setDidWorkoutDraft] = useState(false);
  const [workoutCaloriesDraft, setWorkoutCaloriesDraft] = useState('');
  const [weightKgDraft, setWeightKgDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [dayLogExpanded, setDayLogExpanded] = useState(true);

  const [settingsDraft, setSettingsDraft] = useState<{
    baseline_height_cm: string;
    baseline_weight_kg: string;
    goal_direction: WeightGoalDirection;
    goal_rate: WeightGoalRate;
    activity_level: WeightActivityLevel;
    log_frequency_days: number;
    sync_weight_to_medical_records: boolean;
  } | null>(null);
  const [weightPlanExpanded, setWeightPlanExpanded] = useState(true);
  const [weightPlanSaved, setWeightPlanSaved] = useState(false);

  const monthBounds = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    return { start, end };
  }, [selectedDate]);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [medical, s, logsMonth, sel] = await Promise.all([
        fetchMedicalRecord(user.id),
        fetchWeightSettings(user.id),
        fetchWeightLogs(user.id, monthBounds.start, monthBounds.end),
        fetchWeightLog(user.id, selectedDate),
      ]);
      setMedicalRecord(medical);
      setSettings(s);
      setWeightLogsInMonth(logsMonth);
      setSelectedLog(sel);
      setHeightUnit((medical?.height_unit ?? 'metric') as BodyMetricUnit);
      setWeightUnit((medical?.weight_unit ?? 'metric') as BodyMetricUnit);
      setBreakfastDraft(String(sel?.breakfast_calories ?? ''));
      setLunchDraft(String(sel?.lunch_calories ?? ''));
      setDinnerDraft(String(sel?.dinner_calories ?? ''));
      setDidWorkoutDraft(Boolean(sel?.did_workout));
      setWorkoutCaloriesDraft(String(sel?.workout_calories_burned ?? ''));
      setWeightKgDraft(sel?.weight_kg != null ? String(sel.weight_kg) : '');
      setNotesDraft(sel?.notes ?? '');
      setSettingsDraft({
        baseline_height_cm: s.baseline_height_cm != null ? String(s.baseline_height_cm) : '',
        baseline_weight_kg: s.baseline_weight_kg != null ? String(s.baseline_weight_kg) : '',
        goal_direction: s.goal_direction,
        goal_rate: s.goal_rate,
        activity_level: s.activity_level,
        log_frequency_days: s.log_frequency_days,
        sync_weight_to_medical_records: s.sync_weight_to_medical_records,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weight tracker');
    } finally {
      setLoading(false);
    }
  }, [user, monthBounds.start, monthBounds.end, selectedDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setDayLogExpanded(selectedLog == null);
  }, [selectedDate, selectedLog]);

  const allowedWeightForSelectedDate = useMemo(() => {
    if (!settings) return true;
    if (selectedDate > today) return false;
    const anchor = settings.log_frequency_anchor_date;
    const freq = settings.log_frequency_days;
    if (!anchor || !freq || freq <= 0) return true;
    if (selectedDate < anchor) return true;
    return daysBetweenAnchor(anchor, selectedDate) % freq === 0;
  }, [settings, selectedDate, today]);

  const dayHasLog = useCallback(
    (date: string) =>
      weightLogsInMonth.some((l) => {
        if (l.log_date !== date) return false;
        return Boolean(
          l.weight_kg != null ||
            l.breakfast_calories != null ||
            l.lunch_calories != null ||
            l.dinner_calories != null ||
            l.did_workout ||
            l.workout_calories_burned != null ||
            (l.notes?.trim() ?? ''),
        );
      }),
    [weightLogsInMonth],
  );

  const maintenance = useMemo(() => {
    if (!settingsDraft || !medicalRecord) return null;
    const dob = medicalRecord.date_of_birth;
    let ageYears: number | null = null;
    if (dob) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
      if (match) {
        const y = Number(match[1]);
        const m = Number(match[2]);
        const d = Number(match[3]);
        const todayDt = new Date();
        ageYears = todayDt.getFullYear() - y;
        const monthDiff = todayDt.getMonth() + 1 - m;
        const dayDiff = todayDt.getDate() - d;
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ageYears--;
        if (ageYears < 0) ageYears = null;
      }
    }
    const heightCm = parseMaybeNumber(settingsDraft.baseline_height_cm);
    const weightKg = parseMaybeNumber(settingsDraft.baseline_weight_kg);
    if (ageYears == null || heightCm == null || weightKg == null) return null;
    return computeMaintenanceCalories({
      ageYears,
      heightCm,
      weightKg,
      gender: medicalRecord.gender,
      activityLevel: settingsDraft.activity_level,
    });
  }, [medicalRecord, settingsDraft]);

  const targets = useMemo(() => {
    if (maintenance == null || !settingsDraft) return null;
    return computeDailyTargets({
      maintenanceCalories: maintenance,
      goal_direction: settingsDraft.goal_direction,
      goal_rate: settingsDraft.goal_rate,
    });
  }, [maintenance, settingsDraft]);

  const saveSettings = useCallback(async () => {
    if (!user || !settingsDraft) return;
    setBusy(true);
    setError(null);
    try {
      const s = await updateWeightSettings(user.id, {
        baseline_height_cm: parsePositiveNumber(settingsDraft.baseline_height_cm),
        baseline_weight_kg: parsePositiveNumber(settingsDraft.baseline_weight_kg),
        goal_direction: settingsDraft.goal_direction,
        goal_rate: settingsDraft.goal_rate,
        activity_level: settingsDraft.activity_level,
        log_frequency_days: settingsDraft.log_frequency_days,
        sync_weight_to_medical_records: settingsDraft.sync_weight_to_medical_records,
      });
      setSettings(s);
      setWeightPlanSaved(true);
      setWeightPlanExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save weight plan');
    } finally {
      setBusy(false);
    }
  }, [user, settingsDraft]);

  const saveDayLog = useCallback(async () => {
    if (!user || !settings || isFutureDay) return;
    setBusy(true);
    setError(null);
    try {
      const weight_kg =
        allowedWeightForSelectedDate && weightKgDraft.trim() !== ''
          ? parsePositiveNumber(weightKgDraft)
          : selectedLog?.weight_kg ?? null;
      await upsertWeightLog(user.id, selectedDate, {
        breakfast_calories: parseMaybeInt(breakfastDraft),
        lunch_calories: parseMaybeInt(lunchDraft),
        dinner_calories: parseMaybeInt(dinnerDraft),
        did_workout: didWorkoutDraft,
        workout_calories_burned: didWorkoutDraft
          ? parseMaybeInt(workoutCaloriesDraft)
          : null,
        weight_kg,
        notes: notesDraft,
      });
      if (settings.sync_weight_to_medical_records && weight_kg != null) {
        if (!supabase) throw new Error('Supabase is not configured');
        const sealed = sealRow('medical_records', {
          user_id: user.id,
          weight_kg: String(weight_kg),
        });
        const { error: syncErr } = await supabase
          .from('medical_records')
          .upsert(sealed, { onConflict: 'user_id' });
        if (syncErr) throw syncErr;
      }
      await reload();
      onDataMutated?.();
      setDayLogExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save weight log');
    } finally {
      setBusy(false);
    }
  }, [
    user,
    settings,
    isFutureDay,
    allowedWeightForSelectedDate,
    weightKgDraft,
    breakfastDraft,
    lunchDraft,
    dinnerDraft,
    didWorkoutDraft,
    workoutCaloriesDraft,
    notesDraft,
    selectedLog?.weight_kg,
    selectedDate,
    reload,
    onDataMutated,
  ]);

  if (!user) return null;

  const caloriesIn =
    (parseMaybeInt(breakfastDraft) ?? 0) +
    (parseMaybeInt(lunchDraft) ?? 0) +
    (parseMaybeInt(dinnerDraft) ?? 0);
  const caloriesBurned = didWorkoutDraft ? parseMaybeInt(workoutCaloriesDraft) ?? 0 : 0;
  const weightDisplay =
    weightKgDraft.trim() === ''
      ? null
      : weightUnit === 'metric'
        ? `${weightKgDraft} kg`
        : `${kgToLbString(weightKgDraft)} lb`;

  if (loading || !settings || !settingsDraft) {
    return <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />;
  }

  return (
    <View>
      <Text style={trackingStyles.hint}>
        Weight + nutrition logging with calorie targets based on your baseline, goal, and activity.
      </Text>
      {error ? <Text style={trackingStyles.errorBanner}>{error}</Text> : null}

      <View style={trackingStyles.moduleHeader}>
        <Text style={trackingStyles.sectionTitle}>Weight plan</Text>
        {!weightPlanExpanded ? (
          <Pressable onPress={() => setWeightPlanExpanded(true)}>
            <Text style={trackingStyles.ghostBtnText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {weightPlanExpanded ? (
        <>
          <HeightWeightFields
            height_cm={settingsDraft.baseline_height_cm}
            weight_kg={settingsDraft.baseline_weight_kg}
            height_unit={heightUnit}
            weight_unit={weightUnit}
            onHeightChange={(v) =>
              setSettingsDraft((d) => (d ? { ...d, baseline_height_cm: v } : d))
            }
            onWeightChange={(v) =>
              setSettingsDraft((d) => (d ? { ...d, baseline_weight_kg: v } : d))
            }
            onHeightUnitChange={(unit) => {
              setHeightUnit(unit);
              void updateBodyMetricUnits(user.id, { height_unit: unit }).then(setMedicalRecord);
            }}
            onWeightUnitChange={(unit) => {
              setWeightUnit(unit);
              void updateBodyMetricUnits(user.id, { weight_unit: unit }).then(setMedicalRecord);
            }}
          />
          <SelectField
            label="Goal"
            value={settingsDraft.goal_direction}
            options={[
              { value: 'lose', label: 'Lose weight' },
              { value: 'gain', label: 'Gain weight' },
            ]}
            onChange={(v) =>
              setSettingsDraft((d) =>
                d ? { ...d, goal_direction: v as WeightGoalDirection } : d,
              )
            }
          />
          <SelectField
            label="Pace"
            value={settingsDraft.goal_rate}
            options={[
              { value: 'mild', label: 'Mild (≤ 0.5 lb/week)' },
              { value: 'regular', label: 'Regular (≤ 1 lb/week)' },
              { value: 'extreme', label: 'Extreme (≤ 2 lb/week)' },
            ]}
            onChange={(v) =>
              setSettingsDraft((d) => (d ? { ...d, goal_rate: v as WeightGoalRate } : d))
            }
          />
          <SelectField
            label="Activity level"
            value={settingsDraft.activity_level}
            options={[
              { value: 'sedentary', label: 'Sedentary' },
              { value: 'light', label: 'Light' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'active', label: 'Active' },
            ]}
            onChange={(v) =>
              setSettingsDraft((d) =>
                d ? { ...d, activity_level: v as WeightActivityLevel } : d,
              )
            }
          />
          <SelectField
            label="Weight log frequency"
            value={String(settingsDraft.log_frequency_days)}
            options={[
              { value: '1', label: 'Every day' },
              { value: '3', label: 'Every 3 days' },
              { value: '7', label: 'Every 7 days' },
            ]}
            onChange={(v) =>
              setSettingsDraft((d) =>
                d ? { ...d, log_frequency_days: Number(v) } : d,
              )
            }
          />
          <View style={[trackingStyles.row, { alignItems: 'center', marginBottom: 12 }]}>
            <Switch
              value={settingsDraft.sync_weight_to_medical_records}
              onValueChange={(sync_weight_to_medical_records) =>
                setSettingsDraft((d) => (d ? { ...d, sync_weight_to_medical_records } : d))
              }
            />
            <Text style={[trackingStyles.hint, { flex: 1, marginBottom: 0 }]}>
              Auto-update medical records weight when you log weight
            </Text>
          </View>
        </>
      ) : weightPlanSaved ? (
        <Text style={trackingStyles.hint}>Weight plan saved.</Text>
      ) : null}

      <Text style={trackingStyles.label}>Calorie targets</Text>
      {targets && maintenance != null ? (
        <View style={trackingStyles.row}>
          <View style={[trackingStyles.card, { flex: 1 }]}>
            <Text style={trackingStyles.cardLabel}>Maintenance</Text>
            <Text style={trackingStyles.cardValue}>{maintenance}</Text>
            <Text style={trackingStyles.hint}>kcal/day</Text>
          </View>
          <View style={[trackingStyles.card, { flex: 1 }]}>
            <Text style={trackingStyles.cardLabel}>Target ({targets.label})</Text>
            <Text style={trackingStyles.cardValue}>{targets.targetCalories}</Text>
            <Text style={trackingStyles.hint}>kcal/day</Text>
          </View>
        </View>
      ) : (
        <Text style={trackingStyles.hint}>
          Set date of birth in medical records, then baseline height and weight for targets.
        </Text>
      )}
      {!weightPlanSaved || weightPlanExpanded ? (
        <Pressable
          style={[trackingStyles.primaryBtn, busy && trackingStyles.disabled]}
          disabled={busy}
          onPress={() => void saveSettings()}
        >
          <Text style={trackingStyles.primaryBtnText}>
            {busy ? 'Saving…' : 'Save weight plan'}
          </Text>
        </Pressable>
      ) : null}

      <CycleDayStrip
        selectedDate={selectedDate}
        today={today}
        onSelectDate={onSelectDate}
        dayHasLog={dayHasLog}
      />

      {isFutureDay ? (
        <Text style={trackingStyles.hint}>This day is in the future — logging unlocks on the date.</Text>
      ) : null}

      {!dayLogExpanded ? (
        <View style={trackingStyles.card}>
          <View style={trackingStyles.moduleHeader}>
            <Text style={{ fontWeight: '700' }}>Saved for {selectedDate}</Text>
            <Pressable onPress={() => setDayLogExpanded(true)}>
              <Text style={trackingStyles.ghostBtnText}>Edit</Text>
            </Pressable>
          </View>
          <Text style={trackingStyles.hint}>
            Calories: {caloriesIn} in
            {didWorkoutDraft ? ` · ${caloriesBurned} burned` : ''}
          </Text>
          {weightDisplay ? (
            <Text style={trackingStyles.hint}>Weight: {weightDisplay}</Text>
          ) : null}
        </View>
      ) : (
        <>
          <Text style={trackingStyles.label}>Breakfast (kcal)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={breakfastDraft}
            onChangeText={setBreakfastDraft}
            editable={!isFutureDay}
          />
          <Text style={trackingStyles.label}>Lunch (kcal)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={lunchDraft}
            onChangeText={setLunchDraft}
            editable={!isFutureDay}
          />
          <Text style={trackingStyles.label}>Dinner (kcal)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={dinnerDraft}
            onChangeText={setDinnerDraft}
            editable={!isFutureDay}
          />
          <View style={[trackingStyles.row, { alignItems: 'center' }]}>
            <Switch value={didWorkoutDraft} onValueChange={setDidWorkoutDraft} />
            <Text style={trackingStyles.label}>Workout / cardio</Text>
          </View>
          <Text style={trackingStyles.label}>Calories burned</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={workoutCaloriesDraft}
            onChangeText={setWorkoutCaloriesDraft}
            editable={!isFutureDay && didWorkoutDraft}
          />
          <Text style={trackingStyles.label}>Weight</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="decimal-pad"
            value={weightUnit === 'metric' ? weightKgDraft : kgToLbString(weightKgDraft)}
            onChangeText={(v) => {
              if (weightUnit === 'metric') setWeightKgDraft(v);
              else setWeightKgDraft(lbStringToKg(v));
            }}
            editable={!isFutureDay && allowedWeightForSelectedDate}
          />
          <Text style={trackingStyles.hint}>
            {allowedWeightForSelectedDate
              ? 'Logged on schedule.'
              : `Weight logs are ${freqLabel(settings.log_frequency_days)}. This date is locked.`}
          </Text>
          <Text style={trackingStyles.label}>Notes</Text>
          <TextInput
            style={[trackingStyles.input, trackingStyles.textarea]}
            multiline
            value={notesDraft}
            onChangeText={setNotesDraft}
            editable={!isFutureDay}
          />
          <Pressable
            style={[trackingStyles.primaryBtn, (busy || isFutureDay) && trackingStyles.disabled]}
            disabled={busy || isFutureDay}
            onPress={() => void saveDayLog()}
          >
            <Text style={trackingStyles.primaryBtnText}>Save day</Text>
          </Pressable>
          <Pressable style={trackingStyles.ghostBtn} disabled={busy} onPress={() => {
            setBreakfastDraft(String(selectedLog?.breakfast_calories ?? ''));
            setLunchDraft(String(selectedLog?.lunch_calories ?? ''));
            setDinnerDraft(String(selectedLog?.dinner_calories ?? ''));
            setDidWorkoutDraft(Boolean(selectedLog?.did_workout));
            setWorkoutCaloriesDraft(String(selectedLog?.workout_calories_burned ?? ''));
            setWeightKgDraft(
              selectedLog?.weight_kg != null ? String(selectedLog.weight_kg) : '',
            );
            setNotesDraft(selectedLog?.notes ?? '');
          }}>
            <Text style={trackingStyles.ghostBtnText}>Discard edits</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
