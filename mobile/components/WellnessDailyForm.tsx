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
import { radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { CollapsibleSection } from './forms/CollapsibleSection';
import { useThemedStyles } from '../hooks/useThemedStyles';

function makeDailyFormStyles(colors: ColorPalette) {
  return {
    wrap: { gap: spacing.sm },
    wrapCompact: { gap: spacing.sm },
    legend: { marginTop: spacing.sm, fontSize: 13, fontWeight: '900' as const, color: colors.text },
    hint: { color: colors.textMuted, lineHeight: 18 },
    row: { flexDirection: 'row' as const, gap: spacing.sm },
    field: { flex: 1, gap: 6 },
    label: { fontSize: 12, fontWeight: '800' as const, color: colors.textMuted },
    input: {
      borderWidth: 0,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    notes: { minHeight: 90, textAlignVertical: 'top' as const },
    chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      minHeight: 44,
      justifyContent: 'center' as const,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.typeCardActiveBg },
    chipText: { color: colors.text, fontWeight: '700' as const, fontSize: 12 },
    chipTextActive: { color: colors.accentDark },
    switchRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    switchLabel: { color: colors.text, fontWeight: '700' as const },
    customRow: { flexDirection: 'row' as const, gap: 8, alignItems: 'center' as const },
    customInput: { flex: 1 },
    addBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      backgroundColor: colors.surface,
    },
    addBtnText: { fontWeight: '900' as const, color: colors.text },
    saveBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    saveBtnText: { color: colors.onAccent, fontWeight: '900' as const, fontSize: 16 },
    disabled: { opacity: 0.6 },
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

type Props = {
  value: WellnessLogInput;
  onChange: (next: WellnessLogInput) => void;
  onSubmit: () => void;
  busy?: boolean;
  submitLabel?: string;
  compact?: boolean;
  trackedSymptoms?: string[];
  hideSubmit?: boolean;
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
      <DailySection enabled={hideSubmit} title="Sleep & energy" summary="How rested are you feeling?" initiallyOpen>
      <Text style={styles.legend}>Sleep last night</Text>
      <Text style={styles.label}>Hours</Text>
      <NumericEntry value={value.sleep_hours} onChange={(sleep_hours) => patch({ sleep_hours })} busy={busy} label="Sleep hours" />
      <RatingScale label="Sleep quality" value={value.sleep_quality} onChange={(sleep_quality) => patch({ sleep_quality })} busy={busy} />
      <RatingScale label="Energy" value={value.energy_level} onChange={(energy_level) => patch({ energy_level })} busy={busy} />

      </DailySection>
      <DailySection enabled={hideSubmit} title="Food & movement" summary="Appetite and exercise">
      <Text style={styles.legend}>Appetite</Text>
      <View style={styles.chips}>
        {appetiteOptions.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={value.appetite === opt.value}
            onPress={() =>
              patch({ appetite: value.appetite === opt.value ? null : opt.value })
            }
          />
        ))}
      </View>

      <Text style={styles.legend}>Exercise</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Exercised today</Text>
        <Switch
          value={value.exercised}
          onValueChange={(v) =>
            patch({ exercised: v, exercise_minutes: v ? value.exercise_minutes : null })
          }
          disabled={busy}
        />
      </View>
      {value.exercised ? (
        <>
          <Text style={styles.label}>Minutes</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="e.g. 30"
            placeholderTextColor={colors.textMuted}
            editable={!busy}
            value={value.exercise_minutes == null ? '' : String(value.exercise_minutes)}
            onChangeText={(t) => setNullableNumber('exercise_minutes', t)}
          />
        </>
      ) : null}

      </DailySection>
      <DailySection enabled={hideSubmit} title="Symptoms & changes" summary={value.symptoms.length ? `${value.symptoms.length} selected` : 'Choose or add symptoms'}>
      <Text style={styles.legend}>Symptoms or changes today</Text>
      <Text style={styles.hint}>
        Select any that apply today, including symptoms from your tracking list.
      </Text>
      <View style={styles.chips}>
        {symptomOptions.map((s) => (
          <Chip key={s} label={s} active={value.symptoms.includes(s)} onPress={() => toggleSymptom(s)} />
        ))}
      </View>
      <View style={styles.customRow}>
        <TextInput
          style={[styles.input, styles.customInput]}
          value={customSymptom}
          onChangeText={setCustomSymptom}
          editable={!busy}
          placeholder="e.g. Chest tightness today"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={addCustomSymptom}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addBtn, (!customSymptom.trim() || busy) && styles.disabled]}
          disabled={!customSymptom.trim() || busy}
          onPress={addCustomSymptom}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      </DailySection>
      <DailySection enabled={hideSubmit} title="Clinician notes" summary="Anything else to remember">
      <Text style={styles.legend}>Notes for your clinician</Text>
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
      {!hideSubmit ? <Pressable
        onPress={onSubmit}
        disabled={busy}
        style={[styles.saveBtn, busy && styles.disabled]}
      >
        <Text style={styles.saveBtnText}>{busy ? 'Saving…' : submitLabel}</Text>
      </Pressable> : null}
    </View>
  );
}

function DailySection({ enabled, title, summary, initiallyOpen = false, children }: { enabled: boolean; title: string; summary: string; initiallyOpen?: boolean; children: ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <CollapsibleSection title={title} summary={summary} initiallyOpen={initiallyOpen}><View style={{ gap: 12 }}>{children}</View></CollapsibleSection>;
}

function RatingScale({ label, value, onChange, busy }: { label: string; value: number | null; onChange: (value: number | null) => void; busy: boolean }) {
  const s = useThemedStyles(makeDailyFormStyles);
  return <View style={{ gap: 8 }}><Text style={s.legend}>{label} · 1 low, 5 high</Text><View style={s.chips}>
    {[1, 2, 3, 4, 5].map((rating) => <Pressable key={rating} style={[s.chip, { minWidth: 44, alignItems: 'center' }, value === rating && s.chipActive]} disabled={busy} onPress={() => onChange(value === rating ? null : rating)} accessibilityRole="button" accessibilityLabel={`${label}: ${rating} of 5`} accessibilityState={{ selected: value === rating }}><Text style={[s.chipText, value === rating && s.chipTextActive]}>{rating}</Text></Pressable>)}
  </View></View>;
}
function NumericEntry({ value, onChange, busy, label }: { value: number | null; onChange: (value: number | null) => void; busy: boolean; label: string }) {
  const s = useThemedStyles(makeDailyFormStyles);
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => { if (value === null) setText(''); else if (Number.isFinite(value)) setText(String(value)); }, [value]);
  return <TextInput style={s.input} accessibilityLabel={label} value={text} keyboardType="decimal-pad" editable={!busy} placeholder="e.g. 7.5" placeholderTextColor={s.hint.color} onChangeText={(raw) => { setText(raw); onChange(raw.trim() ? Number(raw.replace(',', '.')) : null); }} />;
}
