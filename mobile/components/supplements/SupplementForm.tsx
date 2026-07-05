import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { createMedication, updateMedication } from '../../lib/medications';
import { rescheduleAllReminders } from '../../lib/reminders';
import {
  formatScheduleTime,
  normalizeScheduleTimes,
  todayLocalDate,
} from '../../lib/dates';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../../lib/notifications';
import { setReminders } from '../../lib/settings';
import type { Medication, MedicationInput } from '../../lib/types';
import { TimeWheelModal } from '../TimeWheelModal';
import { SupplementPicker } from './SupplementPicker';
import {
  SUPPLEMENT_FREQUENCIES,
  SUPPLEMENT_UNIT_OPTIONS,
  findSupplementByName,
  parseCommonDoseAmount,
  resolveSupplementDisclaimer,
  searchSupplements,
  supplementFrequency,
  type SupplementEntry,
  type SupplementFrequencyId,
  type SupplementUnit,
} from '../../lib/supplements';

type DoseTimeRow = { id: string; time: string };

function rowsFromTimes(times: string[]): DoseTimeRow[] {
  return times.map((time, index) => ({ id: `dt-${index}-${Date.now()}`, time }));
}

function parseDose(med: Medication): { amount: string; unit: SupplementUnit } {
  const raw = (med.dose_mg || med.dose_pills || '').trim();
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return { amount: '', unit: 'mg' };
  const amount = match[1];
  const unitStr = match[2].trim();
  const known = SUPPLEMENT_UNIT_OPTIONS.find(
    (u) => u.toLowerCase() === unitStr.toLowerCase(),
  );
  return { amount, unit: known ?? (unitStr ? (unitStr as SupplementUnit) : 'mg') };
}

function frequencyFromMed(med: Medication): SupplementFrequencyId {
  if (med.schedule_type === 'as_needed') return 'as_needed';
  const count = med.schedule_times?.length ?? 0;
  if (count >= 3) return 'three_daily';
  if (count === 2) return 'twice_daily';
  return 'once_daily';
}

export function SupplementForm({
  initial,
  userId,
  onDone,
}: {
  initial?: Medication | null;
  userId: string;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const initialDose = initial ? parseDose(initial) : null;

  const [name, setName] = useState(initial?.name ?? '');
  const [selected, setSelected] = useState<SupplementEntry | null>(
    initial ? findSupplementByName(initial.name) ?? null : null,
  );
  const [amount, setAmount] = useState(initialDose?.amount ?? '');
  const [unit, setUnit] = useState<SupplementUnit>(initialDose?.unit ?? 'mg');
  const [frequency, setFrequency] = useState<SupplementFrequencyId>(
    initial ? frequencyFromMed(initial) : 'once_daily',
  );
  const [doseTimes, setDoseTimes] = useState<DoseTimeRow[]>(() => {
    if (initial && initial.schedule_type !== 'as_needed' && initial.schedule_times?.length) {
      return rowsFromTimes(initial.schedule_times);
    }
    return rowsFromTimes(supplementFrequency('once_daily').times);
  });
  const [remindersEnabled, setRemindersEnabled] = useState(
    initial ? initial.reminders_enabled !== false : false,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isScheduled = frequency !== 'as_needed';
  const suggestions = name.trim() && !selected ? searchSupplements(name, 6) : [];
  const disclaimer = resolveSupplementDisclaimer(selected ?? undefined);

  function applyEntry(entry: SupplementEntry) {
    setSelected(entry);
    setName(entry.name);
    setUnit(entry.defaultUnit);
    const parsed = parseCommonDoseAmount(entry.commonDose);
    if (parsed) setAmount(parsed);
    setError(null);
  }

  function onChangeName(next: string) {
    setName(next);
    if (selected && next.trim().toLowerCase() !== selected.name.toLowerCase()) {
      setSelected(null);
    }
  }

  function selectFrequency(id: SupplementFrequencyId) {
    setFrequency(id);
    setError(null);
    const freq = supplementFrequency(id);
    if (freq.scheduleType === 'scheduled') {
      setDoseTimes(rowsFromTimes(freq.times));
    } else {
      setRemindersEnabled(false);
    }
  }

  function updateDoseTime(id: string, time: string) {
    setDoseTimes((rows) => rows.map((row) => (row.id === id ? { ...row, time } : row)));
  }

  function addDoseTime() {
    const id = `dt-${Date.now()}`;
    setDoseTimes((rows) => [...rows, { id, time: '08:00' }]);
    setEditingTimeId(id);
  }

  function removeDoseTime(id: string) {
    setDoseTimes((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  }

  async function handleReminderToggle(value: boolean) {
    setReminderNote(null);
    if (!value) {
      setRemindersEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    const status = await getNotificationPermission();
    if (!granted) {
      setReminderNote(
        status === 'denied'
          ? 'Notifications are off in iPhone Settings. Turn them on there to get reminders.'
          : 'Allow notifications to get reminders.',
      );
      setRemindersEnabled(false);
      return;
    }
    setRemindersEnabled(true);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a supplement name.');
      return;
    }
    if (!amount.trim()) {
      setError('Enter how much you take.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let scheduleTimes: string[] = [];
      if (isScheduled) {
        scheduleTimes = normalizeScheduleTimes(doseTimes.map((row) => row.time));
        if (scheduleTimes.length === 0) {
          setError('Add at least one time, or choose "As needed".');
          setBusy(false);
          return;
        }
      }

      // Turning reminders on for this item flips the global switch on too, so the
      // scheduler actually runs; per-item reminders_enabled then gates this one.
      if (isScheduled && remindersEnabled) {
        await setReminders({ enabled: true });
      }

      const entry = selected ?? findSupplementByName(trimmed);
      const input: MedicationInput = {
        name: trimmed,
        medication_route: 'oral',
        medication_form: unit,
        dose_pills: '',
        dose_mg: `${amount.trim()} ${unit}`.trim(),
        max_doses_per_day: null,
        prn_amount_hints: [],
        prn_symptom_hints: [],
        schedule_type: isScheduled ? 'scheduled' : 'as_needed',
        category: 'supplement',
        schedule_times: scheduleTimes,
        tracking_sync: 'none',
        reminders_enabled: isScheduled ? remindersEnabled : true,
        notes: initial ? initial.notes ?? '' : entry?.warning ?? '',
        pills_remaining: null,
        start_date: initial?.start_date ?? todayLocalDate(),
        end_date: initial?.end_date ?? null,
      };

      if (initial) {
        await updateMedication(initial.id, input);
      } else {
        await createMedication(userId, input);
      }
      try {
        await rescheduleAllReminders(userId);
      } catch {
        // Saving succeeded; ignore reminder scheduling errors.
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the supplement.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{initial ? 'Edit supplement' : 'Add supplement'}</Text>
        <Text style={styles.subtitle}>
          Type any supplement or browse common ones. It doesn't need to be in our list.
        </Text>

        <Text style={styles.label}>Supplement *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onChangeName}
          placeholder="e.g. Creatine, Vitamin D3, Whey protein"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
        />
        {suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((entry) => (
              <Pressable
                key={entry.name}
                style={styles.suggestionRow}
                onPress={() => applyEntry(entry)}
                accessibilityRole="button"
              >
                <Text style={styles.suggestionName}>{entry.name}</Text>
                {entry.commonDose ? (
                  <Text style={styles.suggestionDose}>{entry.commonDose}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable
          style={styles.browseBtn}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
        >
          <Text style={styles.browseText}>Browse common supplements</Text>
        </Pressable>

        {disclaimer.show ? (
          <View
            style={[
              styles.disclaimer,
              {
                borderColor: disclaimer.tier === 'advanced' ? colors.accentRed : colors.accentAmber,
                backgroundColor:
                  disclaimer.tier === 'advanced' ? colors.accentRedBg : colors.accentAmberBg,
              },
            ]}
          >
            {disclaimer.badge ? (
              <Text
                style={[
                  styles.disclaimerBadge,
                  { color: disclaimer.tier === 'advanced' ? colors.accentRed : colors.accentAmber },
                ]}
              >
                {disclaimer.badge}
              </Text>
            ) : null}
            {disclaimer.warning ? <Text style={styles.disclaimerText}>{disclaimer.warning}</Text> : null}
            {disclaimer.usageNotes ? (
              <Text style={styles.disclaimerNotes}>{disclaimer.usageNotes}</Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.label}>How much per dose *</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, styles.amountInput]}
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Pressable style={styles.unitBtn} onPress={() => setUnitOpen(true)} accessibilityRole="button">
            <Text style={styles.unitText}>{unit}</Text>
            <Text style={styles.unitCaret}>▾</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>How often</Text>
        <View style={styles.chipRow}>
          {SUPPLEMENT_FREQUENCIES.map((option) => {
            const active = frequency === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => selectFrequency(option.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {isScheduled ? (
          <>
            <Text style={styles.label}>At what times?</Text>
            {doseTimes.map((row, index) => (
              <View key={row.id} style={styles.timeRow}>
                <Pressable
                  style={styles.timeChip}
                  onPress={() => setEditingTimeId(row.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Time ${index + 1}, ${formatScheduleTime(row.time)}`}
                >
                  <Text style={styles.timeChipLabel}>{`Time ${index + 1}`}</Text>
                  <Text style={styles.timeChipValue}>{formatScheduleTime(row.time)}</Text>
                </Pressable>
                {doseTimes.length > 1 ? (
                  <Pressable
                    style={styles.timeRemove}
                    onPress={() => removeDoseTime(row.id)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.removeLink}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable style={styles.addTimeBtn} onPress={addDoseTime} accessibilityRole="button">
              <Text style={styles.addTimeText}>+ Add another time</Text>
            </Pressable>

            <View style={styles.reminderRow}>
              <View style={styles.reminderTextWrap}>
                <Text style={styles.reminderLabel}>Remind me at these times</Text>
                <Text style={styles.reminderHint}>
                  Get a notification at each time. Leave off to track it quietly without alerts.
                </Text>
              </View>
              <Switch value={remindersEnabled} onValueChange={(v) => void handleReminderToggle(v)} />
            </View>
            {reminderNote ? <Text style={styles.reminderNote}>{reminderNote}</Text> : null}
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onDone} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void handleSave()}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryText}>{initial ? 'Save changes' : 'Save supplement'}</Text>
          )}
        </Pressable>
      </View>

      <SupplementPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(entry) => {
          applyEntry(entry);
          setPickerOpen(false);
        }}
      />

      <TimeWheelModal
        visible={editingTimeId !== null}
        value={doseTimes.find((r) => r.id === editingTimeId)?.time ?? '08:00'}
        onCancel={() => setEditingTimeId(null)}
        onDone={(next) => {
          if (editingTimeId) updateDoseTime(editingTimeId, next);
          setEditingTimeId(null);
        }}
      />

      <Modal visible={unitOpen} transparent animationType="fade" onRequestClose={() => setUnitOpen(false)}>
        <Pressable style={styles.unitBackdrop} onPress={() => setUnitOpen(false)}>
          <Pressable style={styles.unitSheet} onPress={() => {}}>
            <Text style={styles.unitSheetTitle}>Choose a unit</Text>
            <ScrollView>
              {SUPPLEMENT_UNIT_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.unitOption, option === unit && styles.unitOptionActive]}
                  onPress={() => {
                    setUnit(option);
                    setUnitOpen(false);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={[styles.unitOptionText, option === unit && styles.unitOptionTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl },
    title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
    subtitle: {
      fontFamily: fonts.bodyRegular,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    label: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text, marginTop: spacing.md },
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
    suggestions: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      overflow: 'hidden' as const,
    },
    suggestionRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionName: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
    suggestionDose: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
    browseBtn: {
      alignItems: 'center' as const,
      paddingVertical: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accentGreen,
      backgroundColor: colors.accentGreenBg,
      marginTop: spacing.xs,
    },
    browseText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.accentGreen },
    disclaimer: {
      borderWidth: 1,
      borderLeftWidth: 5,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 6,
      marginTop: spacing.sm,
    },
    disclaimerBadge: { fontFamily: fonts.heading, fontSize: 13 },
    disclaimerText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.text, lineHeight: 19 },
    disclaimerNotes: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    amountRow: { flexDirection: 'row' as const, gap: spacing.sm, alignItems: 'stretch' as const },
    amountInput: { flex: 1 },
    unitBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      minWidth: 110,
      justifyContent: 'space-between' as const,
    },
    unitText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
    unitCaret: { fontSize: 12, color: colors.textMuted },
    chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
    chipText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.textMuted },
    chipTextActive: { color: colors.onAccent },
    timeRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    timeChip: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      backgroundColor: colors.surface,
    },
    timeChipLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
    timeChipValue: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
    timeRemove: { paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
    removeLink: { fontFamily: fonts.bodySemibold, color: colors.accent },
    addTimeBtn: {
      backgroundColor: colors.buttonSecondaryBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center' as const,
      marginTop: spacing.xs,
    },
    addTimeText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
    reminderRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.md,
      marginTop: spacing.md,
    },
    reminderTextWrap: { flex: 1, gap: 2 },
    reminderLabel: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
    reminderHint: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
    reminderNote: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accentAmber, marginTop: spacing.xs },
    error: { color: colors.error, fontFamily: fonts.bodySemibold, fontSize: 14, marginTop: spacing.md },
    footer: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancel: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.textMuted },
    primaryBtn: {
      backgroundColor: colors.accentGreen,
      borderRadius: radii.md,
      paddingVertical: 12,
      paddingHorizontal: spacing.lg,
      minWidth: 150,
      alignItems: 'center' as const,
    },
    primaryText: { fontFamily: fonts.heading, fontSize: 15, color: colors.onAccent },
    disabled: { opacity: 0.6 },
    unitBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center' as const,
      padding: spacing.lg,
    },
    unitSheet: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      maxHeight: '70%' as const,
    },
    unitSheetTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, marginBottom: spacing.sm },
    unitOption: { paddingVertical: 12, paddingHorizontal: spacing.md, borderRadius: radii.md },
    unitOptionActive: { backgroundColor: colors.accentGreenBg },
    unitOptionText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
    unitOptionTextActive: { color: colors.accentGreen, fontFamily: fonts.bodySemibold },
  };
}
