import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  Switch,
} from 'react-native';
import type { AppetiteLevel, WellnessLogInput } from '../lib/wellness';
import { buildSymptomChipOptions } from '../lib/wellness';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { CollapsibleSection } from './forms/CollapsibleSection';
import { useThemedStyles } from '../hooks/useThemedStyles';

function makeDailyFormStyles(colors: ColorPalette) {
  return {
    wrap: { gap: spacing.sm },
    wrapCompact: { gap: spacing.sm + 2 },
    panel: {
      backgroundColor: colors.inputBg,
      borderRadius: radii.lg,
      padding: spacing.md - 2,
      gap: spacing.sm + 4,
    },
    panelHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    panelIcon: { fontSize: 16 },
    panelTitle: { ...typography.heading, fontSize: 15, color: colors.text },
    legend: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text },
    hint: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textMuted, lineHeight: 17 },
    fieldRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.sm,
    },
    field: { gap: 8 },
    label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontFamily: fonts.bodyRegular,
      fontSize: 15,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    hoursInput: { width: 96, textAlign: 'center' as const },
    durationRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    durationInput: { width: 72, textAlign: 'center' as const },
    durationUnit: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted, marginRight: spacing.xs },
    notes: { minHeight: 84, textAlignVertical: 'top' as const },
    segments: {
      flexDirection: 'row' as const,
      backgroundColor: colors.surface,
      borderRadius: 999,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 8,
      borderRadius: 999,
    },
    segmentActive: { backgroundColor: colors.accent },
    segmentText: { fontFamily: fonts.bodySemibold, fontSize: 13.5, color: colors.textMuted },
    segmentTextActive: { color: colors.onAccent },
    scaleEnds: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 6,
    },
    scaleEnd: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textMuted },
    chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.surface,
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
    chipText: { fontFamily: fonts.bodyMedium, color: colors.text, fontSize: 13 },
    chipTextActive: { color: colors.onAccent },
    switchLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
    customRow: { flexDirection: 'row' as const, gap: 8, alignItems: 'center' as const },
    customInput: { flex: 1 },
    addBtn: {
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.accentPurpleBg,
    },
    addBtnText: { fontFamily: fonts.bodySemibold, color: colors.accent, fontSize: 14 },
    actions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    saveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center' as const,
    },
    saveBtnText: { fontFamily: fonts.bodyBold, color: colors.onAccent, fontSize: 15.5 },
    cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: 13 },
    cancelText: { fontFamily: fonts.bodySemibold, color: colors.textMuted, fontSize: 15 },
    disabled: { opacity: 0.5 },
  };
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeDailyFormStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Equal-width pill segments; tapping the selected one clears it. */
function Segments<T extends string | number>({
  options,
  value,
  onChange,
  busy,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (next: T | null) => void;
  busy: boolean;
  label: string;
}) {
  const s = useThemedStyles(makeDailyFormStyles);
  return (
    <View style={s.segments}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={String(opt.value)}
            style={[s.segment, active && s.segmentActive]}
            disabled={busy}
            onPress={() => onChange(active ? null : opt.value)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${opt.label}`}
            accessibilityState={{ selected: active }}
          >
            <Text style={[s.segmentText, active && s.segmentTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type Props = {
  value: WellnessLogInput;
  onChange: (next: WellnessLogInput) => void;
  onSubmit: () => void;
  busy?: boolean;
  submitLabel?: string;
  compact?: boolean;
  trackedSymptoms?: string[];
  hideSubmit?: boolean;
  /** Shows a Cancel button beside Save when set. */
  onCancel?: () => void;
};

export function WellnessDailyForm({
  value,
  onChange,
  onSubmit,
  busy = false,
  submitLabel = 'Save check-in',
  compact = false,
  trackedSymptoms = [],
  hideSubmit = false,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDailyFormStyles);
  const [customSymptom, setCustomSymptom] = useState('');

  function patch(partial: Partial<WellnessLogInput>) {
    onChange({ ...value, ...partial });
  }

  const symptomOptions = useMemo(
    () => buildSymptomChipOptions(value.symptoms, trackedSymptoms),
    [value.symptoms, trackedSymptoms],
  );

  function toggleSymptom(symptom: string) {
    const set = new Set(value.symptoms);
    if (set.has(symptom)) set.delete(symptom);
    else set.add(symptom);
    patch({ symptoms: [...set] });
  }

  function addCustomSymptom() {
    const trimmed = customSymptom.trim();
    if (!trimmed) return;
    if (!value.symptoms.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      patch({ symptoms: [...value.symptoms, trimmed] });
    }
    setCustomSymptom('');
  }

  function setNullableNumber(key: keyof WellnessLogInput, raw: string) {
    const cleaned = raw.trim();
    if (!cleaned) {
      patch({ [key]: null } as any);
      return;
    }
    const n = Number(cleaned);
    patch({ [key]: Number.isFinite(n) ? (n as any) : null } as any);
  }

  const appetiteOptions: { value: AppetiteLevel; label: string }[] = [
    { value: 'same', label: 'Same as usual' },
    { value: 'better', label: 'Better' },
    { value: 'worse', label: 'Worse' },
  ];

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <DailySection enabled={hideSubmit} icon="😴" title="Sleep & energy" summary="How rested are you feeling?" initiallyOpen>
        <View style={styles.fieldRow}>
          <Text style={styles.legend}>Hours slept</Text>
          <NumericEntry value={value.sleep_hours} onChange={(sleep_hours) => patch({ sleep_hours })} busy={busy} label="Sleep hours" />
        </View>
        <RatingScale label="Sleep quality" value={value.sleep_quality} onChange={(sleep_quality) => patch({ sleep_quality })} busy={busy} />
        <RatingScale label="Energy" value={value.energy_level} onChange={(energy_level) => patch({ energy_level })} busy={busy} />
      </DailySection>

      <DailySection enabled={hideSubmit} icon="🍎" title="Food & movement" summary="Appetite and exercise">
        <View style={styles.field}>
          <Text style={styles.legend}>Appetite</Text>
          <Segments
            label="Appetite"
            options={appetiteOptions}
            value={value.appetite}
            onChange={(appetite) => patch({ appetite })}
            busy={busy}
          />
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.switchLabel}>Exercised today</Text>
          <Switch
            value={value.exercised}
            onValueChange={(v) =>
              patch({ exercised: v, exercise_minutes: v ? value.exercise_minutes : null })
            }
            trackColor={{ true: colors.accent, false: colors.border }}
            disabled={busy}
          />
        </View>
        {value.exercised ? (
          <ExerciseDuration
            minutes={value.exercise_minutes}
            onChange={(exercise_minutes) => patch({ exercise_minutes })}
            busy={busy}
          />
        ) : null}
      </DailySection>

      <DailySection enabled={hideSubmit} icon="🩺" title="Symptoms & changes" summary={value.symptoms.length ? `${value.symptoms.length} selected` : 'Choose or add symptoms'}>
        <Text style={styles.hint}>Tap any that apply today, including ones from your tracking list.</Text>
        <View style={styles.chips}>
          {symptomOptions.map((sym) => (
            <Chip key={sym} label={sym} active={value.symptoms.includes(sym)} onPress={() => toggleSymptom(sym)} />
          ))}
        </View>
        <View style={styles.customRow}>
          <TextInput
            style={[styles.input, styles.customInput]}
            value={customSymptom}
            onChangeText={setCustomSymptom}
            editable={!busy}
            placeholder="Add your own"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addCustomSymptom}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.addBtn, (!customSymptom.trim() || busy) && styles.disabled]}
            disabled={!customSymptom.trim() || busy}
            onPress={addCustomSymptom}
            accessibilityRole="button"
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>
      </DailySection>

      <DailySection enabled={hideSubmit} icon="📝" title="Notes for your clinician" summary="Anything else to remember">
        <TextInput
          style={[styles.input, styles.notes]}
          multiline
          editable={!busy}
          placeholder="Anything else to mention at your next visit"
          placeholderTextColor={colors.textMuted}
          value={value.notes}
          onChangeText={(t) => patch({ notes: t })}
        />
      </DailySection>

      {!hideSubmit ? (
        <View style={styles.actions}>
          {onCancel ? (
            <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={busy} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onSubmit}
            disabled={busy}
            style={[styles.saveBtn, busy && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>{busy ? 'Saving…' : submitLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function DailySection({ enabled, icon, title, summary, initiallyOpen = false, children }: { enabled: boolean; icon: string; title: string; summary: string; initiallyOpen?: boolean; children: ReactNode }) {
  const s = useThemedStyles(makeDailyFormStyles);
  if (!enabled) {
    // Inline (Today) form: each group sits in its own soft panel.
    return (
      <View style={s.panel}>
        <View style={s.panelHeader}>
          <Text style={s.panelIcon}>{icon}</Text>
          <Text style={s.panelTitle}>{title}</Text>
        </View>
        {children}
      </View>
    );
  }
  return <CollapsibleSection title={title} summary={summary} initiallyOpen={initiallyOpen}><View style={{ gap: 12 }}>{children}</View></CollapsibleSection>;
}

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));

function RatingScale({ label, value, onChange, busy }: { label: string; value: number | null; onChange: (value: number | null) => void; busy: boolean }) {
  const s = useThemedStyles(makeDailyFormStyles);
  return (
    <View style={s.field}>
      <Text style={s.legend}>{label}</Text>
      <Segments label={label} options={RATING_OPTIONS} value={value} onChange={onChange} busy={busy} />
      <View style={s.scaleEnds}>
        <Text style={s.scaleEnd}>Low</Text>
        <Text style={s.scaleEnd}>High</Text>
      </View>
    </View>
  );
}
function NumericEntry({ value, onChange, busy, label }: { value: number | null; onChange: (value: number | null) => void; busy: boolean; label: string }) {
  const s = useThemedStyles(makeDailyFormStyles);
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => { if (value === null) setText(''); else if (Number.isFinite(value)) setText(String(value)); }, [value]);
  return <TextInput style={[s.input, s.hoursInput]} accessibilityLabel={label} value={text} keyboardType="decimal-pad" editable={!busy} placeholder="7.5" placeholderTextColor={s.hint.color} onChangeText={(raw) => { setText(raw); onChange(raw.trim() ? Number(raw.replace(',', '.')) : null); }} />;
}

type DurationUnit = 'min' | 'hr';

const DURATION_UNITS: { value: DurationUnit; label: string }[] = [
  { value: 'min', label: 'Minutes' },
  { value: 'hr', label: 'Hours + min' },
];

/** Digits only; empty stays empty so the field can be cleared. */
function parseWhole(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}

/**
 * Exercise time, stored as total minutes. "Hours + min" splits the same value
 * into two boxes so 1 hr 30 min doesn't have to be typed as 90.
 */
function ExerciseDuration({
  minutes,
  onChange,
  busy,
}: {
  minutes: number | null;
  onChange: (minutes: number | null) => void;
  busy: boolean;
}) {
  const { colors } = useTheme();
  const s = useThemedStyles(makeDailyFormStyles);
  const [unit, setUnit] = useState<DurationUnit>(minutes != null && minutes >= 60 ? 'hr' : 'min');
  // Hours + min keeps its own text so a half-typed pair isn't rewritten under the cursor.
  const [hrText, setHrText] = useState(minutes != null && minutes >= 60 ? String(Math.floor(minutes / 60)) : '');
  const [minText, setMinText] = useState(
    minutes == null ? '' : String(minutes >= 60 ? minutes % 60 : minutes),
  );

  function commitParts(nextHr: string, nextMin: string) {
    setHrText(nextHr);
    setMinText(nextMin);
    const h = parseWhole(nextHr);
    const m = parseWhole(nextMin);
    onChange(h == null && m == null ? null : (h ?? 0) * 60 + (m ?? 0));
  }

  function switchUnit(next: DurationUnit) {
    setUnit(next);
    // Re-split the saved total so both modes always show the same amount.
    if (next === 'hr' && minutes != null) {
      setHrText(minutes >= 60 ? String(Math.floor(minutes / 60)) : '');
      setMinText(String(minutes >= 60 ? minutes % 60 : minutes));
    }
  }

  return (
    <View style={s.field}>
      <Text style={s.legend}>How long?</Text>
      <Segments
        label="Exercise time unit"
        options={DURATION_UNITS}
        value={unit}
        onChange={(next) => next && switchUnit(next)}
        busy={busy}
      />
      {unit === 'min' ? (
        <View style={s.durationRow}>
          <TextInput
            style={[s.input, s.durationInput]}
            keyboardType="number-pad"
            placeholder="45"
            placeholderTextColor={colors.textMuted}
            editable={!busy}
            value={minutes == null ? '' : String(minutes)}
            onChangeText={(t) => onChange(parseWhole(t))}
            accessibilityLabel="Exercise minutes"
          />
          <Text style={s.durationUnit}>min</Text>
        </View>
      ) : (
        <View style={s.durationRow}>
          <TextInput
            style={[s.input, s.durationInput]}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={colors.textMuted}
            editable={!busy}
            value={hrText}
            onChangeText={(t) => commitParts(t.replace(/[^0-9]/g, ''), minText)}
            accessibilityLabel="Exercise hours"
          />
          <Text style={s.durationUnit}>hr</Text>
          <TextInput
            style={[s.input, s.durationInput]}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={colors.textMuted}
            editable={!busy}
            value={minText}
            onChangeText={(t) => commitParts(hrText, t.replace(/[^0-9]/g, ''))}
            accessibilityLabel="Exercise minutes"
          />
          <Text style={s.durationUnit}>min</Text>
        </View>
      )}
    </View>
  );
}
