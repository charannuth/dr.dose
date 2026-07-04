import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../../../constants/theme';
import { fonts, radii, spacing } from '../../../constants/theme';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeProvider';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { createMedication } from '../../../lib/medications';
import { rescheduleAllReminders } from '../../../lib/reminders';
import { todayLocalDate } from '../../../lib/dates';
import type { MedicationInput } from '../../../lib/types';
import { SupplementPicker } from '../../../components/supplements/SupplementPicker';
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
} from '../../../lib/supplements';

export default function AddSupplementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<SupplementEntry | null>(null);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<SupplementUnit>('mg');
  const [frequency, setFrequency] = useState<SupplementFrequencyId>('once_daily');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    // Typing away from a chosen entry turns it back into a free-text supplement.
    if (selected && next.trim().toLowerCase() !== selected.name.toLowerCase()) {
      setSelected(null);
    }
  }

  async function handleSave() {
    if (!user) return;
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
      const freq = supplementFrequency(frequency);
      // If the name matches a catalog entry (typed exactly), carry its safety data.
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
        schedule_type: freq.scheduleType,
        category: 'supplement',
        schedule_times: freq.times,
        tracking_sync: 'none',
        notes: entry?.warning ? entry.warning : '',
        pills_remaining: null,
        start_date: todayLocalDate(),
        end_date: null,
      };
      await createMedication(user.id, input);
      try {
        await rescheduleAllReminders(user.id);
      } catch {
        // Saving the supplement succeeded; ignore reminder scheduling errors.
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the supplement.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add supplement</Text>
        <Text style={styles.subtitle}>
          Type any supplement or browse common ones. It doesn't need to be in our list.
        </Text>

        {/* Name + suggestions */}
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

        {/* Safety disclaimer */}
        {disclaimer.show ? (
          <View
            style={[
              styles.disclaimer,
              {
                borderColor:
                  disclaimer.tier === 'advanced' ? colors.accentRed : colors.accentAmber,
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

        {/* Amount + unit */}
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
          <Pressable
            style={styles.unitBtn}
            onPress={() => setUnitOpen(true)}
            accessibilityRole="button"
          >
            <Text style={styles.unitText}>{unit}</Text>
            <Text style={styles.unitCaret}>▾</Text>
          </Pressable>
        </View>

        {/* Frequency */}
        <Text style={styles.label}>How often</Text>
        <View style={styles.chipRow}>
          {SUPPLEMENT_FREQUENCIES.map((option) => {
            const active = frequency === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFrequency(option.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
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
            <Text style={styles.primaryText}>Save supplement</Text>
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

      {/* Unit dropdown */}
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
    unitSheetTitle: {
      fontFamily: fonts.heading,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    unitOption: {
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
    },
    unitOptionActive: { backgroundColor: colors.accentGreenBg },
    unitOptionText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
    unitOptionTextActive: { color: colors.accentGreen, fontFamily: fonts.bodySemibold },
  };
}
