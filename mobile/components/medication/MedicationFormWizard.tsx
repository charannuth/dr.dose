import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  formatScheduleTime,
  normalizeScheduleTimes,
  twelveHourToScheduleTime,
  type Meridiem,
} from '../../lib/dates';
import { normalizeTime12Display } from '../../lib/doseTimeInput';
import {
  buildDoseFieldsFromWizard,
  dosageStepTitle,
  parseOralCount,
  validateDosageWizard,
  type DosageWizardValues,
} from '../../lib/doseByRoute';
import {
  isMedicationRouteId,
  MEDICATION_FORMS_BY_ROUTE,
  MEDICATION_ROUTES,
  type MedicationRouteId,
} from '../../lib/medicationForms';
import { getDoseDeductionAmount, inventoryUnitLabel } from '../../lib/inventory';
import { validateMedicationDates } from '../../lib/medicationDates';
import type { MedicationScheduleType } from '../../lib/medicationSchedule';
import type { MedicationSuggestion } from '../../lib/medicationSuggestions';
import {
  canUseNotifications,
  notificationsAvailable,
  getNotificationPermission,
  notificationPermissionHint,
  openNotificationSettings,
  requestNotificationPermission,
  simulatorReminderNote,
} from '../../lib/notifications';
import { getReminders, setReminders } from '../../lib/settings';
import { rescheduleAllReminders } from '../../lib/reminders';
import type {
  Medication,
  MedicationCategory,
  MedicationInput,
  MedicationTrackingSync,
} from '../../lib/types';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { DosageStepPanel } from './DosageStepPanel';
import { IsoDateInput } from '../IsoDateInput';
import { DoseTimeInput } from './DoseTimeInput';
import { MedicationNameInput } from './MedicationNameInput';
import { MedicationSafetyPanel } from './MedicationSafetyPanel';
import {
  BASE_STEPS,
  buildDosageWizardState,
  buildFormState,
  STEP_TITLES,
  wizardStepsFor,
  type DoseTimeRow,
  type WizardStep,
} from './medicationWizardState';

/** Confirmable suggestions seeded from a scanned label. */
export type WizardPrefill = {
  name?: string;
  route?: MedicationRouteId | null;
  form?: string;
  doseMg?: string;
};

type Props = {
  initial?: Medication | null;
  existingMedicationNames?: string[];
  defaultScheduleType?: MedicationScheduleType;
  defaultCategory?: MedicationCategory;
  prefill?: WizardPrefill | null;
  userId: string;
  onSave: (input: MedicationInput) => Promise<void>;
  onCancel: () => void;
};

export function MedicationFormWizard({
  initial,
  existingMedicationNames = [],
  defaultScheduleType = 'scheduled',
  defaultCategory = 'medication',
  prefill,
  userId,
  onSave,
  onCancel,
}: Props) {
  const styles = useThemedStyles(makeMedicationWizardStyles);
  const { colors } = useTheme();
  const defaults = buildFormState(initial, defaultScheduleType);
  // When adding (no existing medication) seed any scanned suggestions; the user
  // still walks through each step to confirm before saving.
  const seededRoute = !initial && prefill?.route ? prefill.route : defaults.route;
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(!initial && prefill?.name ? prefill.name : defaults.name);
  const [category, setCategory] = useState<MedicationCategory>(
    initial?.category ?? defaultCategory,
  );
  const [route, setRoute] = useState<MedicationRouteId | null>(seededRoute);
  const [form, setForm] = useState(!initial && prefill?.form ? prefill.form : defaults.form);
  const [scheduleType, setScheduleType] = useState<MedicationScheduleType>(defaults.scheduleType);
  const [dosageWizard, setDosageWizard] = useState<DosageWizardValues>(() => {
    const base = buildDosageWizardState(initial, seededRoute, defaults.scheduleType);
    return !initial && prefill?.doseMg ? { ...base, doseMg: prefill.doseMg } : base;
  });
  const [doseTimes, setDoseTimes] = useState<DoseTimeRow[]>(defaults.doseTimes);
  const [notes, setNotes] = useState(defaults.notes);
  const [trackPills, setTrackPills] = useState(defaults.trackPills);
  const [pillsRemaining, setPillsRemaining] = useState(defaults.pillsRemaining);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [hasEndDate, setHasEndDate] = useState(defaults.hasEndDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [remindersOn, setRemindersOn] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'undetermined'
  >('undetermined');
  const [trackingSync, setTrackingSync] = useState<MedicationTrackingSync>(defaults.trackingSync);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void getReminders().then((r) => setRemindersOn(r.enabled));
    void notificationsAvailable().then(setNotificationsSupported);
    void getNotificationPermission().then(setPermissionStatus);
  }, []);

  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    [],
  );

  // After a single-tap selection (route, form, frequency, name suggestion) move to
  // the next step automatically. A short delay lets the selected state render first.
  function advanceAfterSelect(fromStep: WizardStep) {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      setError(null);
      setStepIndex((i) => (BASE_STEPS[i] === fromStep ? i + 1 : i));
    }, 250);
  }

  const wizardSteps = wizardStepsFor(scheduleType);
  const step = wizardSteps[stepIndex] ?? wizardSteps[0];
  const isLastStep = stepIndex === wizardSteps.length - 1;
  const isOtherRoute = route === 'other';
  const formOptions = route && !isOtherRoute ? MEDICATION_FORMS_BY_ROUTE[route] : [];

  function stepLabel(wizardStep: WizardStep): string {
    if (wizardStep === 'form' && isOtherRoute) return 'Describe how you take it';
    if (wizardStep === 'dosage') return dosageStepTitle(route, scheduleType);
    return STEP_TITLES[wizardStep];
  }

  function patchDosage(patch: Partial<DosageWizardValues>) {
    setDosageWizard((prev) => ({ ...prev, ...patch, route, form, scheduleType }));
  }

  function updateDoseTime(id: string, patch: Partial<Pick<DoseTimeRow, 'time12' | 'period'>>) {
    setDoseTimes((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addDoseTime() {
    setDoseTimes((rows) => [...rows, { id: `dt-${Date.now()}`, time12: '8:00', period: 'AM' }]);
  }

  function removeDoseTime(id: string) {
    setDoseTimes((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  }

  function applySuggestion(suggestion: MedicationSuggestion) {
    if (scheduleType === 'as_needed') {
      if (!dosageWizard.prnTypicalAmount.trim() && suggestion.dosePills) {
        patchDosage({ prnTypicalAmount: suggestion.dosePills });
      }
    } else if (route === 'oral' && !dosageWizard.oralCount.trim() && suggestion.dosePills) {
      patchDosage({ oralCount: parseOralCount(suggestion.dosePills) });
    }
    if (!dosageWizard.doseMg.trim() && suggestion.doseMg) {
      patchDosage({ doseMg: suggestion.doseMg });
    }
    advanceAfterSelect('name');
  }

  function selectScheduleType(next: MedicationScheduleType) {
    setScheduleType(next);
    setError(null);
    setDosageWizard(buildDosageWizardState(initial, route, next));
    const maxIndex = wizardStepsFor(next).length - 1;
    if (stepIndex > maxIndex) setStepIndex(maxIndex);
    advanceAfterSelect('frequency');
  }

  function selectRoute(next: MedicationRouteId) {
    setRoute(next);
    setForm('');
    setError(null);
    setDosageWizard(buildDosageWizardState(initial, next, scheduleType));
    advanceAfterSelect('route');
  }

  function selectFormType(formId: string) {
    setForm(formId);
    setError(null);
    patchDosage({ injectionStyle: formId.includes('pen') ? 'measured' : dosageWizard.injectionStyle });
    advanceAfterSelect('form');
  }

  function parseScheduleTimes(): string[] {
    const parsed = doseTimes.map((row, index) => {
      const normalized = normalizeTime12Display(row.time12);
      return twelveHourToScheduleTime(normalized, row.period);
    });
    return normalizeScheduleTimes(parsed);
  }

  function validateStep(current: WizardStep): string | null {
    switch (current) {
      case 'name':
        return name.trim() ? null : 'Enter a medication name.';
      case 'route':
        return route ? null : 'Choose how you take this medication.';
      case 'form':
        if (!form.trim()) {
          return isOtherRoute
            ? 'Describe how you take this medication.'
            : 'Choose the medication type.';
        }
        return null;
      case 'dates': {
        const end = hasEndDate && endDate.trim() ? endDate.trim() : null;
        try {
          validateMedicationDates(startDate, end);
        } catch (err) {
          return err instanceof Error ? err.message : 'Check your schedule dates.';
        }
        if (hasEndDate && !endDate.trim()) return 'Enter an end date or turn it off.';
        return null;
      }
      case 'dosage':
        return validateDosageWizard({ ...dosageWizard, route, form, scheduleType });
      case 'times':
        if (scheduleType === 'as_needed') return null;
        try {
          if (parseScheduleTimes().length === 0) return 'Add at least one dose time.';
        } catch (err) {
          return err instanceof Error ? err.message : 'Check your dose times.';
        }
        return null;
      case 'tracking':
        if (trackPills) {
          const n = parseInt(pillsRemaining, 10);
          if (Number.isNaN(n) || n < 0) {
            return 'Remaining supply must be a non-negative number.';
          }
        }
        return null;
      default:
        return null;
    }
  }

  function goNext() {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, wizardStepsFor(scheduleType).length - 1));
  }

  function goBack() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleRemindersToggle(enabled: boolean) {
    setError(null);
    if (enabled) {
      if (!notificationsSupported) {
        setError(
          'Notifications require a development build (npx expo run:ios). Expo Go may not support them.',
        );
        return;
      }
      const times = parseScheduleTimes();
      if (times.length === 0) {
        setError('Add at least one dose time before enabling reminders.');
        return;
      }
      const ok = await requestNotificationPermission();
      const status = await getNotificationPermission();
      setPermissionStatus(status);
      if (!ok) {
        setError('Allow notifications in iPhone Settings to get dose reminders.');
        setRemindersOn(false);
        await setReminders({ enabled: false });
        return;
      }
    }
    setRemindersOn(enabled);
    await setReminders({ enabled });
    if (enabled) {
      try {
        const summary = await rescheduleAllReminders(userId);
        if (summary.dose.skippedOverLimit > 0) {
          setError(
            `Reminders on for the first ${summary.dose.scheduled} dose times (iOS limit). Fewer dose times or turn reminders off on less important meds.`,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not schedule reminders');
        setRemindersOn(false);
        await setReminders({ enabled: false });
      }
    } else {
      await rescheduleAllReminders(userId);
    }
  }

  async function handleSubmit() {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    if (!isLastStep) {
      goNext();
      return;
    }

    setError(null);
    setBusy(true);

    try {
      if (!route) throw new Error('Choose how you take this medication.');

      const schedule_times = scheduleType === 'as_needed' ? [] : parseScheduleTimes();
      const end_date = hasEndDate && endDate.trim() ? endDate.trim() : null;
      validateMedicationDates(startDate, end_date);

      let pills: number | null = null;
      if (trackPills) {
        const n = parseInt(pillsRemaining, 10);
        if (Number.isNaN(n) || n < 0) {
          throw new Error('Remaining supply must be a non-negative number');
        }
        pills = n;
      }

      if (scheduleType === 'scheduled' && remindersOn) {
        const granted = await canUseNotifications();
        if (!granted) {
          const ok = await requestNotificationPermission();
          if (!ok) {
            throw new Error(
              'Dose reminders are on but notifications are not allowed. Enable them in Settings or turn reminders off.',
            );
          }
        }
        await setReminders({ enabled: true });
      }

      if (scheduleType === 'scheduled') {
        const { enabled: remindersEnabled } = await getReminders();
        if (remindersEnabled) {
          await rescheduleAllReminders(userId);
        }
      }

      const built = buildDoseFieldsFromWizard({
        ...dosageWizard,
        route,
        form,
        scheduleType,
      });

      await onSave({
        name: name.trim(),
        medication_route: route,
        medication_form: form.trim(),
        dose_pills: built.dose_pills,
        dose_mg: built.dose_mg,
        max_doses_per_day: built.max_doses_per_day,
        prn_amount_hints: built.prn_amount_hints,
        prn_symptom_hints: built.prn_symptom_hints,
        schedule_type: scheduleType,
        category,
        schedule_times,
        tracking_sync: trackingSync,
        notes,
        pills_remaining: pills,
        start_date: startDate,
        end_date,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  function renderStepPanel(current: WizardStep) {
    switch (current) {
      case 'name':
        return (
          <View style={styles.panel}>
            <Text style={styles.fieldLabel}>This is a…</Text>
            <View style={styles.categoryRow}>
              {(
                [
                  { id: 'medication', label: 'Medication' },
                  { id: 'supplement', label: 'Supplement' },
                ] as const
              ).map((option) => {
                const active = category === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => setCategory(option.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        active && styles.categoryChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {category === 'supplement'
                ? 'Vitamins, minerals, or herbals — pick a suggestion or enter your own.'
                : 'Type a medication name — pick a suggestion or enter your own.'}
            </Text>
            <Text style={styles.fieldLabel}>Name *</Text>
            <MedicationNameInput
              value={name}
              onChange={setName}
              onSelectSuggestion={applySuggestion}
            />
          </View>
        );
      case 'route':
        return (
          <View style={styles.panel}>
            <Text style={styles.hint}>Pick the category that best matches how you use it.</Text>
            {MEDICATION_ROUTES.map((option) => (
              <Pressable
                key={option.id}
                style={[styles.typeCard, route === option.id && styles.typeCardActive]}
                onPress={() => selectRoute(option.id)}
              >
                <Text style={styles.typeCardLabel}>{option.label}</Text>
                <Text style={styles.typeCardDesc}>{option.description}</Text>
              </Pressable>
            ))}
          </View>
        );
      case 'form':
        return (
          <View style={styles.panel}>
            {isOtherRoute ? (
              <>
                <Text style={styles.hint}>Describe how this medication is taken.</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={form}
                  onChangeText={setForm}
                  placeholder="e.g. One puff from inhaler twice daily"
                  multiline
                />
              </>
            ) : (
              <>
                <Text style={styles.hint}>Select one type, then tap Next.</Text>
                <View style={styles.chipRow}>
                  {formOptions.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[styles.chip, form === option.id && styles.chipActive]}
                      onPress={() => selectFormType(option.id)}
                    >
                      <Text style={[styles.chipText, form === option.id && styles.chipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        );
      case 'dates':
        return (
          <View style={styles.panel}>
            <Text style={styles.fieldLabel}>Start date * (YYYY-MM-DD)</Text>
            <IsoDateInput style={styles.input} value={startDate} onChangeText={setStartDate} />
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Set an end date</Text>
              <Switch value={hasEndDate} onValueChange={setHasEndDate} />
            </View>
            {hasEndDate ? (
              <>
                <Text style={styles.fieldLabel}>End date (YYYY-MM-DD)</Text>
                <IsoDateInput style={styles.input} value={endDate} onChangeText={setEndDate} />
              </>
            ) : null}
            <Text style={styles.hint}>
              Doses appear on Today only between these dates. Leave end date empty for ongoing meds.
            </Text>
          </View>
        );
      case 'frequency':
        return (
          <View style={styles.panel}>
            <Pressable
              style={[styles.typeCard, scheduleType === 'scheduled' && styles.typeCardActive]}
              onPress={() => selectScheduleType('scheduled')}
            >
              <Text style={styles.typeCardLabel}>Daily schedule</Text>
              <Text style={styles.typeCardDesc}>Fixed times each day</Text>
            </Pressable>
            <Pressable
              style={[styles.typeCard, scheduleType === 'as_needed' && styles.typeCardActive]}
              onPress={() => selectScheduleType('as_needed')}
            >
              <Text style={styles.typeCardLabel}>As needed (PRN)</Text>
              <Text style={styles.typeCardDesc}>Log when taken</Text>
            </Pressable>
          </View>
        );
      case 'dosage':
        return (
          <DosageStepPanel
            route={route}
            scheduleType={scheduleType}
            values={{ ...dosageWizard, route, form, scheduleType }}
            onChange={patchDosage}
          />
        );
      case 'times':
        return (
          <View style={styles.panel}>
            {doseTimes.map((row, index) => (
              <View key={row.id}>
                <DoseTimeInput
                  label={`Dose ${index + 1}`}
                  time12={row.time12}
                  period={row.period}
                  onChange={(next) => updateDoseTime(row.id, next)}
                />
                {doseTimes.length > 1 ? (
                  <Pressable onPress={() => removeDoseTime(row.id)}>
                    <Text style={styles.link}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable style={styles.secondaryBtn} onPress={addDoseTime}>
              <Text style={styles.secondaryText}>+ Add dose time</Text>
            </Pressable>
          </View>
        );
      case 'notes':
        return (
          <View style={styles.panel}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Take with food, etc."
            />
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Sync to HRT tracking</Text>
              <Switch
                value={trackingSync === 'hrt'}
                onValueChange={(v) => setTrackingSync(v ? 'hrt' : 'none')}
              />
            </View>
          </View>
        );
      case 'tracking': {
        const built = buildDoseFieldsFromWizard({ ...dosageWizard, route, form, scheduleType });
        const invMed = {
          dose_pills: built.dose_pills,
          medication_form: form,
          medication_route: route,
        };
        const unitPlural = inventoryUnitLabel(invMed);
        const perDose = getDoseDeductionAmount(built.dose_pills);
        return (
          <View style={styles.panel}>
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Track supply remaining</Text>
              <Switch value={trackPills} onValueChange={setTrackPills} />
            </View>
            {trackPills ? (
              <>
                <Text style={styles.fieldLabel}>{unitPlural} remaining</Text>
                <TextInput
                  style={styles.input}
                  value={pillsRemaining}
                  onChangeText={setPillsRemaining}
                  keyboardType="number-pad"
                />
              </>
            ) : null}
            <Text style={styles.hint}>
              {trackPills
                ? `Each dose subtracts ${perDose} from your total.`
                : 'Enable to get refill reminders.'}
            </Text>
          </View>
        );
      }
      case 'notifications': {
        const times = parseScheduleTimes();
        const simNote = simulatorReminderNote();
        return (
          <View style={styles.panel}>
            <Text style={styles.hint}>
              Get a lock-screen alert at each dose time on your medication tile — even when Dr.
              Dose is closed. Applies to all scheduled medications while enabled.
            </Text>
            {simNote ? <Text style={styles.hint}>{simNote}</Text> : null}
            {times.length > 0 ? (
              <View style={styles.reminderTimesBox}>
                <Text style={styles.fieldLabel}>Reminders for this medication</Text>
                {times.map((t) => (
                  <Text key={t} style={styles.reminderTimeRow}>
                    • {formatScheduleTime(t)} daily
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.hint}>
                Go back to “Dose times” and add at least one time before turning reminders on.
              </Text>
            )}
            <Text style={styles.hint}>{notificationPermissionHint(permissionStatus)}</Text>
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Enable dose reminders</Text>
              <Switch
                value={remindersOn}
                disabled={!notificationsSupported || times.length === 0}
                onValueChange={(v) => void handleRemindersToggle(v)}
              />
            </View>
            {permissionStatus === 'denied' ? (
              <Pressable onPress={openNotificationSettings}>
                <Text style={styles.link}>Open iPhone Settings</Text>
              </Pressable>
            ) : null}
          </View>
        );
      }
      case 'safety':
        return (
          <MedicationSafetyPanel
            drugName={name}
            existingMedicationNames={existingMedicationNames.filter(
              (n) =>
                n.toLowerCase() !== name.trim().toLowerCase() &&
                n.toLowerCase() !== (initial?.name.trim().toLowerCase() ?? ''),
            )}
          />
        );
      default:
        return null;
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{initial ? 'Edit medication' : 'Add medication'}</Text>
        <Text style={styles.stepMeta}>
          Step {stepIndex + 1} of {wizardSteps.length} — {stepLabel(step)}
        </Text>
        <View style={styles.dots}>
          {wizardSteps.map((s, i) => (
            <View
              key={s}
              style={[styles.dot, i <= stepIndex && styles.dotFilled, i === stepIndex && styles.dotCurrent]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.panelTitle}>{stepLabel(step)}</Text>
        {renderStepPanel(step)}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <View style={styles.nav}>
          {stepIndex > 0 ? (
            <Pressable style={styles.secondaryBtn} onPress={goBack}>
              <Text style={styles.secondaryText}>Back</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void handleSubmit()}
          >
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.primaryText}>{isLastStep ? 'Save' : 'Next'}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeMedicationWizardStyles(colors: ColorPalette) {
  return {
  wrap: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '900' as const, color: colors.text },
  stepMeta: { color: colors.textMuted, fontWeight: '600' as const },
  dots: { flexDirection: 'row' as const, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotFilled: { backgroundColor: colors.accent },
  dotCurrent: { width: 12 },
  scroll: { flex: 1, padding: spacing.md },
  panelTitle: { fontSize: 18, fontWeight: '900' as const, color: colors.text, marginBottom: spacing.md },
  panel: { gap: spacing.sm, paddingBottom: spacing.lg },
  hint: { color: colors.textMuted, lineHeight: 20 },
  fieldLabel: { fontWeight: '700' as const, color: colors.text, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' as const },
  typeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
    marginBottom: spacing.sm,
  },
  typeCardActive: { borderColor: colors.accent, backgroundColor: colors.typeCardActiveBg },
  typeCardLabel: { fontWeight: '800' as const, color: colors.text },
  typeCardDesc: { color: colors.textMuted, fontSize: 13 },
  chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontWeight: '700' as const, color: colors.textMuted },
  chipTextActive: { color: colors.onAccent },
  categoryRow: { flexDirection: 'row' as const, gap: 8, marginTop: spacing.xs },
  categoryChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
  },
  categoryChipActive: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  categoryChipText: { fontWeight: '800' as const, color: colors.textMuted, fontFamily: fonts.bodySemibold },
  categoryChipTextActive: { color: colors.onAccent },
  switchRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: spacing.md,
  },
  reminderTimesBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  reminderTimeRow: { fontSize: 15, color: colors.text, fontWeight: '600' as const },
  link: { color: colors.accent, fontWeight: '800' as const, marginBottom: spacing.sm },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    rowGap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancel: { color: colors.textMuted, fontWeight: '700' as const },
  nav: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    alignItems: 'center' as const,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minWidth: 100,
    alignItems: 'center' as const,
  },
  primaryText: { color: colors.onAccent, fontWeight: '900' as const },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  secondaryText: { fontWeight: '800' as const, color: colors.text },
  disabled: { opacity: 0.6 },
  error: { color: colors.error, fontWeight: '700' as const, marginTop: spacing.md },
  };
}
