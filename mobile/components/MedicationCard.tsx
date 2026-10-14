import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { formatDoseDisplay } from '../lib/dose';
import { formatInventoryRemaining } from '../lib/inventory';
import { formatMedicationType } from '../lib/medicationForms';
import { formatMedicationDateRange } from '../lib/medicationDates';
import { isAsNeededMed, isSupplement } from '../lib/medicationSchedule';
import { currentMinutesSinceMidnight, scheduleTimeToMinutes } from '../lib/dates';
import type { DoseSlotStatus, MedicationWithStatus } from '../lib/types';
import type { PrnDoseLogPayload } from '../lib/prnCheckIn';
import type { ColorPalette } from '../constants/theme';
import { fonts, radii, spacing, tileBgKey, tileFgKey, withAlpha } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { PrnDoseLogPanel } from './PrnDoseLogPanel';
import { DoseSlotRow } from './medication/DoseSlotRow';
import { PressableScale } from './PressableScale';
import { ActionSheet, type SheetAction } from './ActionSheet';
import { useRouter } from 'expo-router';
import { routes } from '../lib/routes';

type MedicationCardProps = {
  medication: MedicationWithStatus;
  onMarkTaken: (scheduleTime: string) => void;
  onSnooze?: (scheduleTime: string) => void;
  /** Active snoozes for this med, keyed by schedule time ("HH:mm") -> ISO remindAt. */
  snoozeByTime?: Record<string, string>;
  onLogPrn?: (payload: PrnDoseLogPayload) => void;
  onUndo: (slot: DoseSlotStatus) => void;
  onMoveToAsNeeded?: () => void;
  onMoveToDailySchedule?: () => void;
  onDelete?: () => void;
  busySlot: string | null;
  /** When set, only show the dose slot at this schedule time (HH:mm). */
  visibleScheduleTime?: string;
};

function makeMedicationCardStyles(colors: ColorPalette) {
  return {
    card: {
      backgroundColor: colors.medicationSurface,
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
      fontFamily: fonts.bodySemibold,
      fontSize: 18,
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
    progressPill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    progressDots: {
      flexDirection: 'row' as const,
      gap: 3,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
    },
    progressText: {
      fontFamily: fonts.bodyBold,
      fontSize: 12.5,
    },
    progressDoneText: {
      fontFamily: fonts.bodyBold,
      fontSize: 12.5,
      color: colors.onAccent,
    },
    cheer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    cheerEmoji: {
      fontSize: 16,
    },
    cheerText: {
      flex: 1,
      fontFamily: fonts.bodySemibold,
      fontSize: 14,
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
    doseRows: {
      gap: 2,
      marginTop: spacing.xs,
      // Rows carry their own padding for the tap flash; pull them back to the card edge.
      marginHorizontal: -6,
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
    primaryButtonText: {
      fontFamily: fonts.bodyBold,
      color: colors.onAccent,
      fontSize: 15,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.medicationSurface,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    overflowBtn: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignSelf: 'flex-start' as const,
    },
    overflowGlyph: {
      fontSize: 20,
      lineHeight: 22,
      fontWeight: '900' as const,
      color: colors.textMuted,
    },
  };
}

const TAKEN_NOTES = [
  'Taken. Nice one!',
  'Done and dusted',
  'Logged. You got this',
  'Checked off!',
  'Right on time',
  'Another one down',
];

const ALL_DONE_CHEERS = [
  'All done for today. Nailed it!',
  'Every dose taken. Look at you go!',
  "That's a wrap for today",
  'Full set today. Keep it rolling!',
  'All checked off. High five!',
];

/**
 * Picks a phrase that stays put for a given key on a given day, so a card does
 * not reshuffle its cheer every time the list re-renders.
 */
function pickCheer(list: readonly string[], key: string): string {
  const seed = `${key}-${new Date().toDateString()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return list[Math.abs(hash) % list.length];
}

function formatSnoozeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MedicationCard({
  medication,
  onMarkTaken,
  onSnooze,
  snoozeByTime,
  onLogPrn,
  onUndo,
  onMoveToAsNeeded,
  onMoveToDailySchedule,
  onDelete,
  busySlot,
  visibleScheduleTime,
}: MedicationCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeMedicationCardStyles);
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const slotSource = visibleScheduleTime
    ? medication.slots.filter((s) => s.time === visibleScheduleTime)
    : medication.slots;
  if (visibleScheduleTime && slotSource.length === 0) {
    return null;
  }

  // Tile accent: user-picked color or route default. Background uses the soft tint.
  const accentColor = colors[tileFgKey(medication.tile_color, medication.medication_route)];
  const tileBackground = colors[tileBgKey(medication.tile_color, medication.medication_route)];
  const nowMins = currentMinutesSinceMidnight();

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
  const supplementPrn = asNeeded && isSupplement(medication);
  // Untaken doses first (by time), taken doses drop to the bottom of the card so
  // finished morning doses don't sit above doses still due later in the day.
  const orderedSlots = [...slotSource].sort((a, b) => {
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
  // Eased rather than sprung so rows glide into place without overshooting.
  const cardLayout = LinearTransition.duration(240).easing(Easing.out(Easing.cubic));

  const prnBusy = busySlot === `${medication.id}-prn`;
  const migrateToPrnBusy = busySlot === `${medication.id}-migrate-prn`;
  const migrateToDailyBusy = busySlot === `${medication.id}-migrate-daily`;
  const deleteBusy = busySlot === medication.id;

  const menuActions: SheetAction[] = [
    {
      key: 'edit',
      label: 'Edit',
      onPress: () => {
        setMenuOpen(false);
        router.push(
          medication.category === 'supplement'
            ? routes.supplementEdit(medication.id)
            : routes.medicationEdit(medication.id),
        );
      },
    },
  ];
  if (!asNeeded && onMoveToAsNeeded) {
    menuActions.push({
      key: 'to-prn',
      label: 'Move to as needed',
      disabled: migrateToPrnBusy,
      onPress: () => {
        setMenuOpen(false);
        onMoveToAsNeeded();
      },
    });
  }
  if (asNeeded && onMoveToDailySchedule) {
    menuActions.push({
      key: 'to-daily',
      label: 'Move to daily schedule',
      disabled: migrateToDailyBusy,
      onPress: () => {
        setMenuOpen(false);
        onMoveToDailySchedule();
      },
    });
  }
  if (onDelete) {
    menuActions.push({
      key: 'delete',
      label: 'Delete',
      destructive: true,
      disabled: deleteBusy,
      onPress: () => {
        setMenuOpen(false);
        onDelete();
      },
    });
  }

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

  const showProgress = !asNeeded && dosesTotalToday > 0;
  const allDone = showProgress && allDosesTakenToday;

  return (
    <Animated.View layout={cardLayout}>
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: tileBackground, borderColor: accentColor },
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
        {showProgress ? (
          <View
            style={[
              styles.progressPill,
              allDone
                ? { backgroundColor: accentColor }
                : { backgroundColor: withAlpha(accentColor, 0.14) },
            ]}
            accessibilityLabel={`${dosesTakenToday} of ${dosesTotalToday} doses taken`}
          >
            {allDone ? (
              <Text style={styles.progressDoneText}>✓ Done</Text>
            ) : (
              <>
                <View style={styles.progressDots}>
                  {Array.from({ length: Math.min(dosesTotalToday, 6) }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.progressDot,
                        { borderColor: accentColor },
                        i < dosesTakenToday && { backgroundColor: accentColor },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.progressText, { color: accentColor }]}>
                  {dosesTakenToday}/{dosesTotalToday}
                </Text>
              </>
            )}
          </View>
        ) : badge ? (
          <Badge label={badge.label} tone={badge.tone} />
        ) : null}
        <PressableScale
          style={styles.overflowBtn}
          scaleTo={0.85}
          hitSlop={8}
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${medication.name}`}
        >
          <Text style={styles.overflowGlyph}>⋯</Text>
        </PressableScale>
      </View>

      {allDone && !visibleScheduleTime ? (
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(260)}
          style={[styles.cheer, { backgroundColor: withAlpha(accentColor, 0.16) }]}
        >
          <Text style={styles.cheerEmoji}>🎉</Text>
          <Text style={[styles.cheerText, { color: accentColor }]}>
            {pickCheer(ALL_DONE_CHEERS, medication.id)}
          </Text>
        </Animated.View>
      ) : null}

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
        supplementPrn ? (
          <>
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
            <PressableScale
              style={styles.primaryButton}
              disabled={prnBusy}
              onPress={() =>
                onLogPrn?.({
                  amount: formatDoseDisplay(medication) || '1 dose',
                  symptoms: [],
                  reason: '',
                  notes: '',
                })
              }
            >
              {prnBusy ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Log</Text>
              )}
            </PressableScale>
          </>
        ) : (
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
        )
      ) : orderedSlots.length > 0 ? (
        <View style={styles.doseRows}>
          {orderedSlots.map((slot) => {
            const slotKey = `${medication.id}-${slot.time}`;
            const busy = busySlot === slotKey;
            const slotMins = scheduleTimeToMinutes(slot.time);
            const due = Number.isFinite(slotMins) && slotMins <= nowMins;
            const snoozedUntil = !slot.taken ? snoozeByTime?.[slot.time] : undefined;
            const canSnooze =
              !slot.taken && (due || snoozedUntil != null) && onSnooze != null;
            return (
              // Keyed on time alone so the row keeps its identity when taken
              // doses re-sort to the bottom, letting the layout animation track it.
              <Animated.View key={slot.time} layout={cardLayout}>
                <DoseSlotRow
                  label={slot.label}
                  taken={slot.taken}
                  busy={busy}
                  accent={accentColor}
                  takenNote={pickCheer(TAKEN_NOTES, `${medication.id}-${slot.time}`)}
                  snoozeLabel={
                    snoozedUntil ? `Snoozed until ${formatSnoozeTime(snoozedUntil)}` : undefined
                  }
                  onTake={() => onMarkTaken(slot.time)}
                  onSnooze={canSnooze ? () => onSnooze?.(slot.time) : undefined}
                  onUndo={() => onUndo(slot)}
                />
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptySlots}>
          No dose times yet. Tap Edit below to add reminder times.
        </Text>
      )}

      <ActionSheet
        visible={menuOpen}
        title={medication.name}
        actions={menuActions}
        onClose={() => setMenuOpen(false)}
      />
    </Animated.View>
    </Animated.View>
  );
}
