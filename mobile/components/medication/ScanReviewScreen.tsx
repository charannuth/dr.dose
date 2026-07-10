import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { MEDICATION_ROUTES, type MedicationRouteId } from '../../lib/medicationForms';
import type { MedicationScheduleType } from '../../lib/medicationSchedule';
import type { LabelScanPrefill } from '../../lib/labelScanPrefill';
import { isLabelAiAvailable } from '../../lib/labelScanAI';
import type { PrescriptionPrefill } from '../../lib/prescriptionScan';
import { prefillToWizard } from '../../lib/prescriptionScan';

type Props = {
  scan: PrescriptionPrefill;
  onConfirm: (prefill: LabelScanPrefill) => void;
  onRescan: () => void;
  onCancel: () => void;
};

function FieldBadge({ ai }: { ai?: boolean }) {
  const { colors } = useTheme();
  if (!ai) return null;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radii.sm,
        backgroundColor: colors.accentPurpleBg,
      }}
    >
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.accentPurple }}>
        AI
      </Text>
    </View>
  );
}

export function ScanReviewScreen({ scan, onConfirm, onRescan, onCancel }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const aiFields = useMemo(() => new Set(scan.aiFields ?? []), [scan.aiFields]);

  const [name, setName] = useState(scan.name ?? '');
  const [brandName, setBrandName] = useState(scan.brandName ?? '');
  const [doseMg, setDoseMg] = useState(scan.doseMg ?? '');
  const [route, setRoute] = useState<MedicationRouteId | null>(scan.route ?? null);
  const [form, setForm] = useState(scan.form ?? '');
  const [directions, setDirections] = useState(scan.directions ?? '');
  const [notes, setNotes] = useState(scan.notes ?? '');
  const [scheduleType, setScheduleType] = useState<MedicationScheduleType>(
    scan.scheduleType ?? 'scheduled',
  );
  const [quantity, setQuantity] = useState(
    scan.quantity != null ? String(scan.quantity) : '',
  );
  const [showRaw, setShowRaw] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const canContinue = confirmed && name.trim().length > 0;

  function handleContinue() {
    const edited: PrescriptionPrefill = {
      rawText: scan.rawText,
      name: name.trim(),
      brandName: brandName.trim() || undefined,
      doseMg: doseMg.trim() || undefined,
      route: route ?? undefined,
      form: form.trim() || undefined,
      directions: directions.trim() || undefined,
      notes: notes.trim() || undefined,
      scheduleType,
      quantity: quantity.trim() ? Number(quantity) : undefined,
      scheduleTimes: scan.scheduleTimes,
      aiEnhanced: scan.aiEnhanced,
    };
    onConfirm(prefillToWizard(edited));
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Review scanned label</Text>
        <Text style={styles.subtitle}>
          We read your pharmacy label and filled in what we could. Please check every field —
          tap to edit anything that looks wrong before continuing.
        </Text>

        {scan.aiEnhanced ? (
          <View style={styles.aiBanner}>
            <Text style={styles.aiBannerText}>
              AI helped interpret this label
              {isLabelAiAvailable() ? ' (text only — your photo stayed on your device)' : ''}.
            </Text>
          </View>
        ) : isLabelAiAvailable() ? (
          <View style={styles.localBanner}>
            <Text style={styles.localBannerText}>
              Read on your device. AI is enabled but could not add more detail from this label —
              please review every field below.
            </Text>
          </View>
        ) : (
          <View style={styles.localBanner}>
            <Text style={styles.localBannerText}>
              Parsed on your device. Optional AI can improve accuracy when a free Gemini API key
              is configured.
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Medication name *</Text>
            <FieldBadge ai={aiFields.has('name')} />
          </View>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Albuterol sulfate"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Brand (optional)</Text>
            <FieldBadge ai={aiFields.has('brandName')} />
          </View>
          <TextInput
            style={styles.input}
            value={brandName}
            onChangeText={setBrandName}
            placeholder="Brand name if shown"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Strength / dose</Text>
            <FieldBadge ai={aiFields.has('doseMg')} />
          </View>
          <TextInput
            style={styles.input}
            value={doseMg}
            onChangeText={setDoseMg}
            placeholder="e.g. 90 mcg, 0.1%"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>How you take it</Text>
            <FieldBadge ai={aiFields.has('route')} />
          </View>
          <View style={styles.chipRow}>
            {MEDICATION_ROUTES.map((option) => {
              const active = route === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setRoute(option.id)}
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
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Form</Text>
            <FieldBadge ai={aiFields.has('form')} />
          </View>
          <TextInput
            style={styles.input}
            value={form}
            onChangeText={setForm}
            placeholder="e.g. tablet, inhaler, ointment"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Directions</Text>
            <FieldBadge ai={aiFields.has('directions')} />
          </View>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={directions}
            onChangeText={setDirections}
            placeholder="Take 1 tablet by mouth twice daily…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Schedule</Text>
            <FieldBadge ai={aiFields.has('scheduleType')} />
          </View>
          <View style={styles.chipRow}>
            {(
              [
                { id: 'scheduled', label: 'Scheduled' },
                { id: 'as_needed', label: 'As needed' },
              ] as const
            ).map((option) => {
              const active = scheduleType === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setScheduleType(option.id)}
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
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Quantity (optional)</Text>
            <FieldBadge ai={aiFields.has('quantity')} />
          </View>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 30"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Notes from pharmacy</Text>
            <FieldBadge ai={aiFields.has('notes')} />
          </View>
          <Text style={styles.fieldHint}>
            How to use, storage, priming — not vaccine or store promos.
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Shake well before use. Rinse mouth after each dose."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        <Pressable
          style={styles.rawToggle}
          onPress={() => setShowRaw((v) => !v)}
          accessibilityRole="button"
        >
          <Text style={styles.rawToggleText}>
            {showRaw ? 'Hide' : 'Show'} raw text we read from the label
          </Text>
        </Pressable>
        {showRaw ? <Text style={styles.rawText}>{scan.rawText}</Text> : null}

        <View style={styles.confirmRow}>
          <Switch value={confirmed} onValueChange={setConfirmed} />
          <Text style={styles.confirmText}>
            I have reviewed every field above and confirm these details look correct.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onCancel} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <View style={styles.footerActions}>
          <Pressable style={styles.secondaryBtn} onPress={onRescan} accessibilityRole="button">
            <Text style={styles.secondaryText}>Rescan</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
            disabled={!canContinue}
            onPress={handleContinue}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return {
    wrap: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
    title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
    subtitle: {
      fontFamily: fonts.bodyRegular,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    aiBanner: {
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.accentPurpleBg,
      borderWidth: 1,
      borderColor: colors.accentPurple,
    },
    aiBannerText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.accentPurple,
      lineHeight: 18,
    },
    localBanner: {
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.accentBlueBg,
      borderWidth: 1,
      borderColor: colors.accentBlue,
    },
    localBannerText: {
      fontFamily: fonts.bodyRegular,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    field: { gap: spacing.xs },
    fieldHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    label: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
    fieldHint: {
      fontFamily: fonts.bodyRegular,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
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
    textarea: { minHeight: 80, textAlignVertical: 'top' as const },
    chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentPurpleBg,
    },
    chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
    chipTextActive: { color: colors.accent },
    rawToggle: { paddingVertical: spacing.sm },
    rawToggleText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.accent },
    rawText: {
      fontFamily: fonts.bodyRegular,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    confirmRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    confirmText: {
      flex: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    footerActions: { flexDirection: 'row' as const, gap: spacing.sm },
    cancel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textMuted },
    secondaryBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
    primaryBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radii.md,
      backgroundColor: colors.accent,
    },
    primaryBtnDisabled: { opacity: 0.45 },
    primaryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.onAccent },
  };
}
