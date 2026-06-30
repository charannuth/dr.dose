import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { formatDisplayDate, formatTakenTime, todayLocalDate } from '../../lib/dates';
import { groupDaySlotsByMedication, type DayDetail, type DayDoseSlot } from '../../lib/dayDetail';
import { formatWellnessLogSummary } from '../../lib/wellness';
import { routes } from '../../lib/routes';
import type { StreakDayStatus } from '../../lib/streaks';

const STATUS_LABEL: Record<StreakDayStatus, string> = {
  perfect: 'Perfect day',
  partial: 'Partial adherence',
  missed: 'Missed doses',
  none: 'No doses scheduled',
};

function statusAccentColor(colors: ColorPalette, status: StreakDayStatus): string {
  switch (status) {
    case 'perfect':
      return colors.success;
    case 'partial':
      return colors.partial;
    case 'missed':
      return colors.error;
    default:
      return colors.textMuted;
  }
}

function makeDayDetailStyles(colors: ColorPalette) {
  return {
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    loadingRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    muted: { color: colors.textMuted, lineHeight: 20 },
    bold: { fontWeight: '800' as const, color: colors.text },
    errorBanner: {
      backgroundColor: colors.errorBg,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.errorBorder,
    },
    errorText: { color: colors.error, fontWeight: '700' as const },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
    },
    headerText: { flex: 1, gap: 4 },
    dateTitle: { fontSize: 18, fontWeight: '900' as const, color: colors.text },
    status: { fontSize: 14, fontWeight: '700' as const },
    closeBtn: { color: colors.accent, fontWeight: '800' as const, padding: spacing.xs },
    medList: { gap: spacing.md },
    medBlock: { gap: spacing.sm },
    medHead: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      alignItems: 'baseline' as const,
    },
    medName: { fontWeight: '900' as const, color: colors.text, fontSize: 16 },
    medDose: { color: colors.textMuted, fontWeight: '600' as const },
    medNotes: { color: colors.textMuted, fontStyle: 'italic' as const },
    slotRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      gap: spacing.sm,
    },
    slotTaken: { backgroundColor: colors.successBg },
    slotMissed: { backgroundColor: colors.pendingBg },
    slotLate: { backgroundColor: colors.partialBg },
    slotTime: { fontWeight: '700' as const, color: colors.text },
    slotStatus: { alignItems: 'flex-end' as const, gap: 4 },
    badge: { fontWeight: '800' as const, fontSize: 13 },
    badgeTaken: { color: colors.success },
    badgeMissed: { color: colors.textMuted },
    badgeLate: { color: colors.partialText },
    takenAt: { fontSize: 12, color: colors.textMuted },
    redeemHint: {
      color: colors.textMuted,
      fontStyle: 'italic' as const,
      lineHeight: 20,
    },
    redeemedTag: { color: colors.partialText, fontWeight: '800' as const, fontSize: 13 },
    redeemBtn: {
      backgroundColor: colors.accent,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    redeemBtnBusy: { opacity: 0.6 },
    redeemBtnText: { color: colors.onAccent, fontWeight: '800' as const, fontSize: 13 },
    undoText: { color: colors.accent, fontWeight: '800' as const, fontSize: 12 },
    wellnessSection: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sectionTitle: { fontWeight: '900' as const, color: colors.text, fontSize: 15 },
    wellnessSummary: { color: colors.text, lineHeight: 20 },
    wellnessNotes: {
      color: colors.textMuted,
      fontStyle: 'italic' as const,
      borderLeftWidth: 3,
      borderLeftColor: colors.border,
      paddingLeft: spacing.md,
      lineHeight: 20,
    },
    link: { color: colors.accent, fontWeight: '800' as const, marginTop: spacing.xs },
    actions: { gap: spacing.sm, marginTop: spacing.sm },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    primaryBtnText: { color: colors.onAccent, fontWeight: '900' as const },
    ghostBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    ghostBtnText: { color: colors.text, fontWeight: '800' as const },
  };
}

type Props = {
  detail: DayDetail | null;
  loading: boolean;
  error: string | null;
  streakStatus?: StreakDayStatus;
  showHistoryLink?: boolean;
  /** When true (the previous calendar day), missed scheduled doses can be redeemed. */
  canRedeem?: boolean;
  /** Slot key currently being redeemed/undone: `${medicationId}-${scheduleTime}`. */
  busyKey?: string | null;
  onRedeem?: (slot: DayDoseSlot) => void;
  onUndoLate?: (slot: DayDoseSlot) => void;
  onClear?: () => void;
};

export function DayAdherenceDetail({
  detail,
  loading,
  error,
  streakStatus,
  showHistoryLink = true,
  canRedeem = false,
  busyKey = null,
  onRedeem,
  onUndoLate,
  onClear,
}: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDayDetailStyles);
  const panelRef = useRef<View>(null);
  const isToday = detail?.date === todayLocalDate();
  const dayRedeemed = detail?.slots.some((s) => s.loggedLate) ?? false;

  useEffect(() => {
    // scroll handled by parent ScrollView when detail loads
  }, [detail?.date]);

  if (!detail && !loading && !error) return null;

  const groups = detail ? groupDaySlotsByMedication(detail.slots) : [];
  const takenCount = detail?.slots.filter((s) => s.taken).length ?? 0;
  const totalCount = detail?.slots.length ?? 0;

  return (
    <View ref={panelRef} style={styles.panel}>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Loading day…</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {detail && !loading ? (
        <>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.dateTitle}>{formatDisplayDate(detail.date)}</Text>
              {streakStatus ? (
                <Text style={[styles.status, { color: statusAccentColor(colors, streakStatus) }]}>
                  {STATUS_LABEL[streakStatus]}
                  {detail.hasScheduledMeds
                    ? ` · ${takenCount} of ${totalCount} dose${totalCount === 1 ? '' : 's'} logged`
                    : ''}
                </Text>
              ) : null}
              {dayRedeemed ? (
                <Text style={styles.redeemedTag}>Streak redeemed · some doses marked late</Text>
              ) : null}
            </View>
            {onClear ? (
              <Pressable onPress={onClear} accessibilityRole="button">
                <Text style={styles.closeBtn}>Close</Text>
              </Pressable>
            ) : null}
          </View>

          {canRedeem && detail.hasScheduledMeds && takenCount < totalCount ? (
            <Text style={styles.redeemHint}>
              Took a dose yesterday but forgot to mark it? Tap “Mark taken (late)” to redeem your
              streak. It stays flagged as caught up late.
            </Text>
          ) : null}

          {detail.hasScheduledMeds ? (
            <View style={styles.medList}>
              {groups.map((group) => (
                <View key={group.medicationId} style={styles.medBlock}>
                  <View style={styles.medHead}>
                    <Text style={styles.medName}>{group.medicationName}</Text>
                    {group.doseLabel ? (
                      <Text style={styles.medDose}>{group.doseLabel}</Text>
                    ) : null}
                  </View>
                  {group.medicationNotes ? (
                    <Text style={styles.medNotes}>{group.medicationNotes}</Text>
                  ) : null}
                  {group.slots.map((slot) => {
                    const slotKey = `${slot.medicationId}-${slot.scheduleTime}`;
                    const busy = busyKey === slotKey;
                    const late = slot.loggedLate;
                    const canRedeemSlot =
                      canRedeem && !slot.isAsNeeded && !slot.taken;
                    const canUndoSlot =
                      canRedeem && !slot.isAsNeeded && slot.taken && late;
                    return (
                      <View
                        key={slotKey}
                        style={[
                          styles.slotRow,
                          slot.taken
                            ? late
                              ? styles.slotLate
                              : styles.slotTaken
                            : styles.slotMissed,
                        ]}
                      >
                        <Text style={styles.slotTime}>{slot.scheduleLabel}</Text>
                        <View style={styles.slotStatus}>
                          {slot.taken ? (
                            <>
                              <Text
                                style={[styles.badge, late ? styles.badgeLate : styles.badgeTaken]}
                              >
                                {late ? 'Marked late' : 'Taken'}
                              </Text>
                              {slot.takenAt ? (
                                <Text style={styles.takenAt}>
                                  {formatTakenTime(slot.takenAt)}
                                  {late ? ' · caught up later' : ''}
                                </Text>
                              ) : null}
                              {canUndoSlot && onUndoLate ? (
                                <Pressable
                                  onPress={() => onUndoLate(slot)}
                                  disabled={busy}
                                  accessibilityRole="button"
                                >
                                  <Text style={styles.undoText}>{busy ? '…' : 'Undo'}</Text>
                                </Pressable>
                              ) : null}
                            </>
                          ) : canRedeemSlot && onRedeem ? (
                            <Pressable
                              style={[styles.redeemBtn, busy && styles.redeemBtnBusy]}
                              onPress={() => onRedeem(slot)}
                              disabled={busy}
                              accessibilityRole="button"
                            >
                              <Text style={styles.redeemBtnText}>
                                {busy ? 'Saving…' : 'Mark taken (late)'}
                              </Text>
                            </Pressable>
                          ) : (
                            <Text style={[styles.badge, styles.badgeMissed]}>Not logged</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>No medications were scheduled for this day.</Text>
          )}

          <View style={styles.wellnessSection}>
            <Text style={styles.sectionTitle}>Daily check-in</Text>
            {detail.wellnessFilled && detail.wellnessLog ? (
              <>
                <Text style={styles.wellnessSummary}>
                  {formatWellnessLogSummary(detail.wellnessLog)}
                </Text>
                {detail.wellnessLog.notes.trim() ? (
                  <Text style={styles.wellnessNotes}>{detail.wellnessLog.notes.trim()}</Text>
                ) : null}
                {detail.wellnessLog.symptoms.length > 0 ? (
                  <Text style={styles.muted}>
                    <Text style={styles.bold}>Symptoms:</Text>{' '}
                    {detail.wellnessLog.symptoms.join(', ')}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.muted}>No wellness check-in for this day.</Text>
            )}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: routes.wellness,
                  params: { wellnessDate: detail.date },
                })
              }
            >
              <Text style={styles.link}>
                {detail.wellnessFilled
                  ? 'View or edit on Wellness'
                  : 'Add check-in on Wellness'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            {isToday && detail.hasScheduledMeds && takenCount < totalCount ? (
              <Pressable style={styles.primaryBtn} onPress={() => router.push(routes.today)}>
                <Text style={styles.primaryBtnText}>Log doses on Today</Text>
              </Pressable>
            ) : null}
            {showHistoryLink ? (
              <Pressable
                style={styles.ghostBtn}
                onPress={() =>
                  router.push({
                    pathname: routes.history,
                    params: { historyDate: detail.date },
                  })
                }
              >
                <Text style={styles.ghostBtnText}>Open in History</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}
