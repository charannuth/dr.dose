import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { formatDoseDisplay } from '../lib/dose';
import { formatInventoryRemaining } from '../lib/inventory';
import { formatMedicationType } from '../lib/medicationForms';
import { formatMedicationDateRange } from '../lib/medicationDates';
import { isAsNeededMed } from '../lib/medicationSchedule';
import type { DoseSlotStatus, MedicationWithStatus } from '../lib/types';
import type { PrnDoseLogPayload } from '../lib/prnCheckIn';
import type { ColorPalette } from '../constants/theme';
import { ACCENT_KEYS, fonts, radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { PrnDoseLogPanel } from './PrnDoseLogPanel';
import { useRouter } from 'expo-router';
import { routes } from '../lib/routes';

type MedicationCardProps = {
  medication: MedicationWithStatus;
  onMarkTaken: (scheduleTime: string) => void;
  onLogPrn?: (payload: PrnDoseLogPayload) => void;
  onUndo: (slot: DoseSlotStatus) => void;
  onMoveToAsNeeded?: () => void;
  onMoveToDailySchedule?: () => void;
  onDelete?: () => void;
  busySlot: string | null;
};

/** Deterministically map a medication to one of the vibrant accent keys. */
function stableAccentKey(seed: string): (typeof ACCENT_KEYS)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return ACCENT_KEYS[Math.abs(hash) % ACCENT_KEYS.length];
}

function makeMedicationCardStyles(colors: ColorPalette) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardTaken: {
      borderColor: colors.successBorder,
      backgroundColor: colors.successBg,
    },
    cardPrn: {
      borderStyle: 'dashed' as const,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.sm,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: colors.text,
    },
    typeLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
    },
    dosage: {
      fontFamily: fonts.bodyRegular,
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
    },
    dateRange: {
      fontSize: 13,
      color: colors.textMuted,
    },
    notes: {
      fontSize: 14,
      color: colors.text,
    },
    pills: {
      fontSize: 13,
      color: colors.textMuted,
    },
    pillsLow: {
      color: colors.partial,
      fontWeight: '600' as const,
    },
    badge: {
      alignSelf: 'flex-start' as const,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeSuccess: {
      backgroundColor: colors.successBg,
    },
    badgePartial: {
      backgroundColor: colors.partialBg,
    },
    badgePending: {
      backgroundColor: colors.pendingBg,
    },
    badgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      color: colors.text,
    },
    slots: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    slot: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      paddingVertical: 4,
    },
    slotTakenRow: {
      opacity: 0.9,
    },
    slotTaken: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      paddingVertical: 4,
    },
    slotTime: {
      flex: 1,
      flexShrink: 1,
      minWidth: 120,
      fontFamily: fonts.bodySemibold,
      fontSize: 15,
      color: colors.text,
    },
    emptySlots: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic' as const,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center' as const,
      marginTop: spacing.xs,
    },
    primaryButtonSmall: {
      backgroundColor: colors.accent,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minWidth: 110,
      alignItems: 'center' as const,
    },
    primaryButtonText: {
      fontFamily: fonts.bodyBold,
      color: colors.onAccent,
      fontSize: 15,
    },
    primaryButtonTextSmall: {
      fontFamily: fonts.bodyBold,
      color: colors.onAccent,
      fontSize: 14,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    actions: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 10,
      marginTop: spacing.sm,
    },
    ghostBtn: {
      paddingVertical: 6,
      paddingHorizontal: 2,
    },
    ghostText: {
      color: colors.textMuted,
      fontWeight: '800' as const,
    },
    dangerText: {
      color: colors.error,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonDisabledText: {
      opacity: 0.6,
    },
  };
}

export function MedicationCard({
  medication,
  onMarkTaken,
  onLogPrn,
  onUndo,
  onMoveToAsNeeded,
  onMoveToDailySchedule,
  onDelete,
  busySlot,
}: MedicationCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeMedicationCardStyles);

  // Stable per-medication accent so each tile gets a consistent splash of color.
  const accentColor = colors[stableAccentKey(medication.id || medication.name)];

  function Badge({
    label,
    tone,
  }: {
    label: string;
    tone: 'success' | 'pending' | 'partial';
  }) {
    const toneStyle =
      tone === 'success'
        ? styles.badgeSuccess
        : tone === 'partial'
          ? styles.badgePartial
          : styles.badgePending;

    return (
      <View style={[styles.badge, toneStyle]}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    );
  }

  const asNeeded = isAsNeededMed(medication);
  // Untaken doses first (by time), taken doses drop to the bottom of the card so
  // finished morning doses don't sit above doses still due later in the day.
  const orderedSlots = [...medication.slots].sort((a, b) => {
    if (a.taken !== b.taken) return a.taken ? 1 : -1;
    return a.time.localeCompare(b.time);
  });
  const lowSupply =
    medication.pills_remaining != null && medication.pills_remaining <= 7;
  const { dosesTakenToday, dosesTotalToday, allDosesTakenToday } = medication;
  const typeLabel = formatMedicationType(
    medication.medication_route,
    medication.medication_form,
  );
  const prnBusy = busySlot === `${medication.id}-prn`;
  const migrateToPrnBusy = busySlot === `${medication.id}-migrate-prn`;
  const migrateToDailyBusy = busySlot === `${medication.id}-migrate-daily`;
  const deleteBusy = busySlot === medication.id;

  let badge: { label: string; tone: 'success' | 'pending' | 'partial' } | null =
    null;

  if (asNeeded) {
    badge =
      dosesTakenToday > 0
        ? {
            label:
              medication.max_doses_per_day != null && medication.max_doses_per_day > 0
                ? `${dosesTakenToday}/${medication.max_doses_per_day} today`
                : `${dosesTakenToday} logged today`,
            tone: 'partial',
          }
        : { label: 'As needed', tone: 'pending' };
  } else if (dosesTotalToday > 0) {
    badge = allDosesTakenToday
      ? { label: 'All doses taken', tone: 'success' }
      : dosesTakenToday > 0
        ? { label: `${dosesTakenToday}/${dosesTotalToday} doses`, tone: 'partial' }
        : { label: 'Due today', tone: 'pending' };
  } else {
    badge = { label: 'No times set', tone: 'pending' };
  }

  return (
    <View
      style={[
        styles.card,
        !asNeeded && allDosesTakenToday && styles.cardTaken,
        asNeeded && styles.cardPrn,
        { borderLeftWidth: 4, borderLeftColor: accentColor },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: accentColor }]}>{medication.name}</Text>
          {typeLabel ? <Text style={styles.typeLabel}>{typeLabel}</Text> : null}
          <Text style={styles.dosage}>
            {formatDoseDisplay(medication)}
            {asNeeded
              ? ' · as needed (PRN)'
              : dosesTotalToday > 1
                ? ` · ${dosesTotalToday} doses per day`
                : dosesTotalToday === 1
                  ? ' · once daily'
                  : ''}
          </Text>
        </View>
        {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
      </View>

      {medication.end_date ? (
        <Text style={styles.dateRange}>{formatMedicationDateRange(medication)}</Text>
      ) : null}

      {medication.notes ? <Text style={styles.notes}>{medication.notes}</Text> : null}

      {medication.pills_remaining != null ? (
        <Text style={[styles.pills, lowSupply && styles.pillsLow]}>
          {formatInventoryRemaining(medication.pills_remaining, medication)}
          {lowSupply ? ' — refill soon' : ''}
        </Text>
      ) : null}

      {asNeeded ? (
        <>
          <PrnDoseLogPanel
            medication={medication}
            disabled={prnBusy}
            onLog={(payload) => onLogPrn?.(payload)}
          />
          {medication.slots.length > 0 ? (
            <View style={styles.slots}>
              {medication.slots.map((slot, index) => {
                const slotKey = `${medication.id}-${slot.time}`;
                const busy = busySlot === slotKey;
                return (
                  <View key={`${slot.time}-${index}`} style={styles.slotTaken}>
                    <Text style={styles.slotTime}>Taken {slot.label}</Text>
                    <Pressable
                      style={styles.secondaryButton}
                      disabled={busy}
                      onPress={() => onUndo(slot)}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {busy ? '…' : 'Undo'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptySlots}>No doses logged today yet.</Text>
          )}
        </>
      ) : orderedSlots.length > 0 ? (
        <View style={styles.slots}>
          {orderedSlots.map((slot, index) => {
            const slotKey = `${medication.id}-${slot.time}`;
            const busy = busySlot === slotKey;
            return (
              <View
                key={`${slot.time}-${index}`}
                style={[styles.slot, slot.taken && styles.slotTakenRow]}
              >
                <Text style={styles.slotTime}>{slot.label}</Text>
                {slot.taken ? (
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={busy}
                    onPress={() => onUndo(slot)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {busy ? '…' : 'Undo'}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.primaryButtonSmall}
                    disabled={busy}
                    onPress={() => onMarkTaken(slot.time)}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.onAccent} size="small" />
                    ) : (
                      <Text style={styles.primaryButtonTextSmall}>Mark taken</Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptySlots}>
          No dose times yet. Tap Edit below to add reminder times.
        </Text>
      )}

      <View style={styles.actions}>
        {!asNeeded && onMoveToAsNeeded ? (
          <Pressable
            onPress={onMoveToAsNeeded}
            disabled={migrateToPrnBusy}
            style={styles.ghostBtn}
          >
            <Text style={[styles.ghostText, migrateToPrnBusy && styles.buttonDisabledText]}>
              {migrateToPrnBusy ? '…' : 'Move to as needed'}
            </Text>
          </Pressable>
        ) : null}
        {asNeeded && onMoveToDailySchedule ? (
          <Pressable
            onPress={onMoveToDailySchedule}
            disabled={migrateToDailyBusy}
            style={styles.ghostBtn}
          >
            <Text style={[styles.ghostText, migrateToDailyBusy && styles.buttonDisabledText]}>
              {migrateToDailyBusy ? '…' : 'Move to daily schedule'}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.push(routes.medicationEdit(medication.id))}
          style={styles.ghostBtn}
        >
          <Text style={styles.ghostText}>Edit</Text>
        </Pressable>
        {onDelete ? (
          <Pressable onPress={onDelete} disabled={deleteBusy} style={styles.ghostBtn}>
            <Text style={[styles.ghostText, styles.dangerText]}>
              {deleteBusy ? '…' : 'Delete'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
