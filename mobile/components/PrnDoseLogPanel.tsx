import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import type { DoseSlotStatus, MedicationWithStatus } from '../lib/types';
import type { PrnDoseLogPayload } from '../lib/prnCheckIn';
import { prnExtraDoseGuidance } from '../lib/prnMedContext';
import { prnAmountPlaceholder, prnSymptomOptionsForMed } from '../lib/prnSymptoms';
import { formatInventoryCount } from '../lib/inventory';
import { currentMinutesSinceMidnight, formatScheduleTime, scheduleTimeToMinutes } from '../lib/dates';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing, withAlpha } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { PressableScale } from './PressableScale';

function makePrnStyles(colors: ColorPalette) {
  return {
    wrap: {
      gap: spacing.sm + 4,
      paddingTop: 2,
    },
    stats: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    stat: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12.5,
      color: colors.textMuted,
    },
    statValue: {
      fontFamily: fonts.bodySemibold,
      fontSize: 12.5,
    },
    actionRow: {
      flexDirection: 'row' as const,
      gap: spacing.sm,
    },
    logButtonWrap: {
      flex: 1,
    },
    logButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      borderRadius: radii.md,
      paddingVertical: 13,
      paddingHorizontal: spacing.md,
      minHeight: 48,
    },
    logButtonText: {
      fontFamily: fonts.bodyBold,
      color: colors.onAccent,
      fontSize: 15.5,
    },
    logButtonSub: {
      fontFamily: fonts.bodyMedium,
      color: withAlpha(colors.onAccent, 0.8),
      fontSize: 13,
    },
    detailsToggle: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: 14,
      minHeight: 48,
    },
    detailsToggleText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 14,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    details: {
      gap: spacing.sm + 2,
      borderRadius: radii.md,
      padding: 12,
    },
    fieldLabel: {
      fontFamily: fonts.bodySemibold,
      fontSize: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
      color: colors.textMuted,
    },
    amountRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm + 2,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: fonts.bodyRegular,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    amountInput: {
      flex: 1,
    },
    notesInput: {
      minHeight: 64,
      textAlignVertical: 'top' as const,
    },
    chips: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    chipText: {
      fontFamily: fonts.bodyMedium,
      color: colors.text,
      fontSize: 13,
    },
    chipAddText: {
      fontFamily: fonts.bodyMedium,
      color: colors.textMuted,
      fontSize: 13,
    },
    linkBtn: {
      alignSelf: 'flex-start' as const,
      paddingVertical: 2,
    },
    linkText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 13,
    },
    history: {
      gap: 2,
    },
    historyRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      paddingVertical: 6,
    },
    historyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    historyText: {
      flex: 1,
      flexShrink: 1,
      color: colors.textMuted,
    },
    historyTime: {
      fontFamily: fonts.bodySemibold,
      fontSize: 14,
      color: colors.text,
    },
    historySummary: {
      fontFamily: fonts.bodyRegular,
      fontSize: 13,
      color: colors.textMuted,
    },
    undoText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 13,
      color: colors.textMuted,
    },
  };
}

/** The amount to log on a one-tap press: the prescribed dose, when there is one. */
export function defaultPrnAmount(med: MedicationWithStatus): string {
  const pills = med.dose_pills?.trim();
  if (pills && pills.toLowerCase() !== 'varies') return pills;
  const mg = med.dose_mg?.trim();
  return mg || '';
}

function minutesAgoLabel(mins: number): string {
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 || h >= 4 ? `${h}h ago` : `${h}h ${m}m ago`;
}

/** Splits a PRN slot label ("2:15 PM · 2 puffs · Wheezing") into time and summary. */
function splitSlotLabel(slot: DoseSlotStatus): { time: string; summary: string } {
  const time = formatScheduleTime(slot.time);
  const prefix = `${time} · `;
  const summary = slot.label.startsWith(prefix) ? slot.label.slice(prefix.length) : '';
  return { time, summary };
}

type ChipProps = {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
};

function Chip({ label, active, accent, onPress }: ChipProps) {
  const styles = useThemedStyles(makePrnStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { borderColor: accent, backgroundColor: withAlpha(accent, 0.18) },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, active && { color: accent }]}>
        {active ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

type Props = {
  medication: MedicationWithStatus;
  /** Tile accent color, so the panel matches the card it sits in. */
  accent: string;
  disabled?: boolean;
  busySlot?: string | null;
  onLog: (payload: PrnDoseLogPayload) => Promise<void> | void;
  onUndo?: (slot: DoseSlotStatus) => void;
};

export function PrnDoseLogPanel({
  medication,
  accent,
  disabled = false,
  busySlot = null,
  onLog,
  onUndo,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makePrnStyles);
  const reducedMotion = useReducedMotion();
  const symptomPresets = useMemo(() => prnSymptomOptionsForMed(medication), [medication]);
  const guidance = useMemo(
    () => prnExtraDoseGuidance(medication, medication.dosesTakenToday),
    [medication],
  );
  const defaultAmount = defaultPrnAmount(medication);

  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState(defaultAmount);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSymptom, setCustomSymptom] = useState('');
  const [justLogged, setJustLogged] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!justLogged) return;
    const t = setTimeout(() => setJustLogged(false), 2200);
    return () => clearTimeout(t);
  }, [justLogged]);

  const max = medication.max_doses_per_day;
  const hasMax = max != null && max > 0;
  const atMax = hasMax && medication.dosesTakenToday >= max;
  const busy = disabled || saving;

  const slots = useMemo(
    () => [...medication.slots].sort((a, b) => b.time.localeCompare(a.time)),
    [medication.slots],
  );
  const last = slots[0];
  const lastAgo = (() => {
    if (!last) return null;
    const mins = currentMinutesSinceMidnight() - scheduleTimeToMinutes(last.time);
    return Number.isFinite(mins) && mins >= 0 ? minutesAgoLabel(mins) : null;
  })();

  // Custom symptoms the person typed show up as chips next to the presets.
  const chipOptions = useMemo(() => {
    const extra = symptoms.filter(
      (s) => !symptomPresets.some((p) => p.toLowerCase() === s.toLowerCase()),
    );
    return [...symptomPresets, ...extra];
  }, [symptomPresets, symptoms]);

  function toggleSymptom(symptom: string) {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    );
  }

  function addCustomSymptom() {
    const value = customSymptom.trim();
    if (value && !symptoms.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSymptoms((prev) => [...prev, value]);
    }
    setCustomSymptom('');
    setCustomOpen(false);
  }

  function reset() {
    setAmount(defaultAmount);
    setSymptoms([]);
    setReason('');
    setNotes('');
    setShowNotes(false);
    setCustomOpen(false);
    setCustomSymptom('');
    setExpanded(false);
  }

  const logAmount = (expanded ? amount : defaultAmount).trim();
  const canLog = !busy && !atMax && Boolean(logAmount);

  async function handleLog() {
    if (!logAmount && !expanded) {
      // No prescribed amount to fall back on, so ask for one.
      setExpanded(true);
      return;
    }
    if (!canLog) return;
    setSaving(true);
    try {
      await onLog({
        amount: logAmount,
        symptoms: expanded ? symptoms : [],
        reason: expanded ? reason.trim() : '',
        notes: expanded ? notes.trim() : '',
      });
      reset();
      setJustLogged(true);
    } catch {
      // The screen shows the error; keep what was typed so it can be retried.
    } finally {
      setSaving(false);
    }
  }

  const fade = reducedMotion ? undefined : FadeIn.duration(180);
  const fadeOut = reducedMotion ? undefined : FadeOut.duration(120);

  let buttonLabel: string;
  if (atMax) buttonLabel = 'Max doses reached';
  else if (justLogged) buttonLabel = '✓ Logged';
  else if (logAmount) buttonLabel = `Log ${logAmount}`;
  else buttonLabel = 'Log a dose';

  return (
    <View style={styles.wrap} accessibilityLabel={`Log ${medication.name}`}>
      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: withAlpha(accent, 0.12) }]}>
          {last ? (
            <>
              <Text style={styles.statLabel}>Last</Text>
              <Text style={[styles.statValue, { color: accent }]}>
                {formatScheduleTime(last.time)}
              </Text>
              {lastAgo ? <Text style={styles.statLabel}>· {lastAgo}</Text> : null}
            </>
          ) : (
            <Text style={styles.statLabel}>No doses yet today</Text>
          )}
        </View>
        {hasMax ? (
          <View
            style={[
              styles.stat,
              {
                backgroundColor: atMax ? colors.partialBg : withAlpha(accent, 0.12),
              },
            ]}
          >
            <Text style={[styles.statValue, { color: atMax ? colors.partialText : accent }]}>
              {medication.dosesTakenToday}/{max}
            </Text>
            <Text style={styles.statLabel}>today</Text>
          </View>
        ) : null}
        {medication.pills_remaining != null ? (
          <View style={[styles.stat, { backgroundColor: withAlpha(accent, 0.12) }]}>
            <Text
              style={[
                styles.statValue,
                {
                  color: medication.pills_remaining <= 7 ? colors.partial : accent,
                },
              ]}
            >
              {formatInventoryCount(medication.pills_remaining, medication)}
            </Text>
            <Text style={styles.statLabel}>
              {medication.pills_remaining <= 7 ? 'left · refill soon' : 'left'}
            </Text>
          </View>
        ) : null}
      </View>

      {expanded ? (
        <Animated.View
          entering={fade}
          exiting={fadeOut}
          style={[styles.details, { backgroundColor: withAlpha(accent, 0.08) }]}
        >
          <Text style={styles.fieldLabel}>Amount</Text>
          <TextInput
            style={[styles.input, styles.amountInput]}
            value={amount}
            editable={!busy}
            placeholder={prnAmountPlaceholder(medication)}
            placeholderTextColor={colors.textMuted}
            onChangeText={setAmount}
            returnKeyType="done"
          />

          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>How are you feeling?</Text>
          <View style={styles.chips}>
            {chipOptions.map((s) => (
              <Chip
                key={s}
                label={s}
                accent={accent}
                active={symptoms.includes(s)}
                onPress={() => toggleSymptom(s)}
              />
            ))}
            {!customOpen ? (
              <Pressable
                onPress={() => setCustomOpen(true)}
                style={[styles.chip, { borderStyle: 'dashed' }]}
                accessibilityRole="button"
                accessibilityLabel="Add a symptom not listed"
              >
                <Text style={styles.chipAddText}>+ Other</Text>
              </Pressable>
            ) : null}
          </View>
          {customOpen ? (
            <TextInput
              style={styles.input}
              value={customSymptom}
              autoFocus
              editable={!busy}
              placeholder="Type a symptom, then return"
              placeholderTextColor={colors.textMuted}
              onChangeText={setCustomSymptom}
              onSubmitEditing={addCustomSymptom}
              onBlur={addCustomSymptom}
              returnKeyType="done"
            />
          ) : null}

          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Why now?</Text>
          <TextInput
            style={styles.input}
            value={reason}
            editable={!busy}
            placeholder={guidance?.reasonPlaceholder ?? 'e.g. wheezing after stairs'}
            placeholderTextColor={colors.textMuted}
            onChangeText={setReason}
          />

          {showNotes ? (
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              editable={!busy}
              placeholder={guidance?.notesPlaceholder ?? 'Side effects, what helped before…'}
              placeholderTextColor={colors.textMuted}
              onChangeText={setNotes}
              multiline
            />
          ) : (
            <Pressable
              style={styles.linkBtn}
              onPress={() => setShowNotes(true)}
              accessibilityRole="button"
            >
              <Text style={[styles.linkText, { color: accent }]}>+ Add a note</Text>
            </Pressable>
          )}
        </Animated.View>
      ) : null}

      <View style={styles.actionRow}>
        <View style={styles.logButtonWrap}>
        <PressableScale
          style={[
            styles.logButton,
            { backgroundColor: justLogged ? colors.success : accent },
            (busy || atMax || (expanded && !logAmount)) && !justLogged && styles.buttonDisabled,
          ]}
          disabled={busy || atMax || (expanded && !logAmount)}
          onPress={handleLog}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <Text style={styles.logButtonText}>{buttonLabel}</Text>
              {expanded && !atMax && !justLogged && symptoms.length > 0 ? (
                <Text style={styles.logButtonSub}>
                  · {symptoms.length} symptom{symptoms.length === 1 ? '' : 's'}
                </Text>
              ) : null}
            </>
          )}
        </PressableScale>
        </View>
        <PressableScale
          style={[
            styles.detailsToggle,
            {
              borderColor: expanded ? accent : withAlpha(accent, 0.45),
              backgroundColor: expanded ? withAlpha(accent, 0.16) : 'transparent',
            },
          ]}
          onPress={() => (expanded ? reset() : setExpanded(true))}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Cancel details' : 'Add details to this dose'}
        >
          <Text style={[styles.detailsToggleText, { color: accent }]}>
            {expanded ? 'Cancel' : '+ Details'}
          </Text>
        </PressableScale>
      </View>

      {slots.length > 0 ? (
        <View style={styles.history}>
          {slots.map((slot, index) => {
            const { time, summary } = splitSlotLabel(slot);
            const slotBusy = busySlot === `${medication.id}-${slot.time}`;
            return (
              <View key={`${slot.time}-${index}`} style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: accent }]} />
                <Text style={styles.historyText} numberOfLines={1}>
                  <Text style={styles.historyTime}>{time}</Text>
                  {summary ? <Text style={styles.historySummary}>{`  ${summary}`}</Text> : null}
                </Text>
                {onUndo ? (
                  <Pressable
                    hitSlop={8}
                    disabled={slotBusy}
                    onPress={() => onUndo(slot)}
                    accessibilityRole="button"
                    accessibilityLabel={`Undo dose at ${time}`}
                  >
                    <Text style={styles.undoText}>{slotBusy ? '…' : 'Undo'}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
