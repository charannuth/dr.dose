import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MedicationCard } from '../../components/MedicationCard';
import {
  SameTimeDoseChooseModal,
  SameTimeDoseGroupBar,
} from '../../components/SameTimeDoseActions';
import { StreakSnippet } from '../../components/StreakSnippet';
import { StreakCelebration } from '../../components/StreakCelebration';
import { useStreakCelebration } from '../../hooks/useStreakCelebration';
import { DueNowBanner } from '../../components/banners/DueNowBanner';
import { MissedDosesBanner } from '../../components/banners/MissedDosesBanner';
import { RefillBanner } from '../../components/banners/RefillBanner';
import { InteractionAlert } from '../../components/banners/InteractionAlert';
import { TodayWellnessCheckIn } from '../../components/TodayWellnessCheckIn';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTourTarget, useDemoTourTargets } from '../../context/DemoTourTargetsContext';
import {
  applyCustomOrder,
  deleteMedication,
  fetchMedicationsWithStatus,
  markDoseTaken,
  markPrnDoseTaken,
  migrateMedicationToAsNeeded,
  migrateMedicationToScheduled,
  sortScheduledMedications,
  todayDoseTotals,
  undoDose,
} from '../../lib/medications';
import {
  isAsNeededMed,
  isSupplement,
  type MedicationCategory,
  type MedicationScheduleType,
} from '../../lib/medicationSchedule';
import { SwipeTabView } from '../../components/SwipeTabView';
import { PressableScale } from '../../components/PressableScale';
import { SortSheet, type SortOption } from '../../components/SortSheet';
import { TodayHero } from '../../components/TodayHero';
import { TodayDashboard } from '../../components/TodayDashboard';
import { AlertStack, type AlertItem } from '../../components/AlertStack';
import { scheduleTimeToMinutes } from '../../lib/dates';
import { errorFeedback, successFeedback, tapFeedback } from '../../lib/haptics';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { fetchStreakStats, type StreakStats } from '../../lib/streaks';
import { fetchMissedDoses, type MissedDoseItem } from '../../lib/missedDoses';
import { getRefillAlerts } from '../../lib/refills';
import { routes } from '../../lib/routes';
import {
  cancelDoseSnooze,
  rescheduleAllReminders,
  scheduleDoseSnooze,
} from '../../lib/reminders';
import { getActiveSnoozes } from '../../lib/snooze';
import { SnoozeModal } from '../../components/SnoozeModal';
import { takePendingDoseAction } from '../../lib/pendingDoseAction';
import {
  getCustomOrders,
  getMedSort,
  getReminders,
  getSameTimeDoseMode,
  setMedSort,
  type CustomOrders,
  type MedSort,
  type SameTimeDoseMode,
} from '../../lib/settings';
import {
  buildSameTimePendingGroups,
  buildScheduleTimeSections,
  sameTimePendingItemKey,
  type SameTimeDoseGroup,
} from '../../lib/sameTimeDoseGroups';
import {
  dismissMissedDosesBanner,
  isMissedDosesBannerDismissed,
} from '../../lib/bannerSettings';
import type { DoseSlotStatus, MedicationWithStatus } from '../../lib/types';
import { fonts, radii, spacing, typography } from '../../constants/theme';
import type { ColorPalette } from '../../constants/theme';
import type { PrnDoseLogPayload } from '../../lib/prnCheckIn';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type TodayTab = 'scheduled' | 'as_needed' | 'supplement';

const TAB_ORDER: TodayTab[] = ['scheduled', 'as_needed', 'supplement'];

const TAB_LABELS: Record<TodayTab, string> = {
  scheduled: 'Daily',
  as_needed: 'As needed',
  supplement: 'Supplements',
};

/** Shown on the compact sort button; reordering itself lives on its own screen. */
const SORT_LABELS: Record<MedSort, string> = {
  time: 'By time',
  name: 'A–Z',
  custom: 'Custom order',
};

/**
 * Marks one scheduled slot taken in local state so the UI can respond before the
 * write lands. doseLogId stays null until the refetch supplies the real row,
 * which is why the caller keeps the slot busy until then — Undo needs that id.
 */
function applyDoseTaken(
  medications: MedicationWithStatus[],
  medicationId: string,
  scheduleTime: string,
): MedicationWithStatus[] {
  return medications.map((med) => {
    if (med.id !== medicationId) return med;
    let changed = false;
    const slots = med.slots.map((slot) => {
      if (slot.time !== scheduleTime || slot.taken) return slot;
      changed = true;
      return { ...slot, taken: true };
    });
    if (!changed) return med;
    const dosesTakenToday = med.dosesTakenToday + 1;
    return {
      ...med,
      slots,
      dosesTakenToday,
      allDosesTakenToday:
        med.dosesTotalToday > 0 && dosesTakenToday >= med.dosesTotalToday,
    };
  });
}

// Each tab gets its own accent so the row reads as a colorful, scannable control.
type TabAccent = { fg: keyof ColorPalette; bg: keyof ColorPalette };
const TAB_ACCENTS: Record<TodayTab, TabAccent> = {
  scheduled: { fg: 'accentBlue', bg: 'accentBlueBg' },
  as_needed: { fg: 'accentPurple', bg: 'accentPurpleBg' },
  supplement: { fg: 'accentGreen', bg: 'accentGreenBg' },
};
// Shared by the tab row styles and the sliding indicator's offset math, which
// has to reproduce the flex layout numerically.
const TABS_PADDING = 4;
const TABS_GAP = 4;

function makeTodayStyles(colors: ColorPalette) {
  return {
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scroll: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.bg,
      gap: spacing.sm,
    },
    loadingText: {
      color: colors.textMuted,
    },
    tabs: {
      flexDirection: 'row' as const,
      backgroundColor: colors.border,
      borderRadius: radii.lg,
      padding: TABS_PADDING,
      gap: TABS_GAP,
    },
    tabIndicator: {
      position: 'absolute' as const,
      top: TABS_PADDING,
      bottom: TABS_PADDING,
      left: TABS_PADDING,
      borderRadius: radii.md,
    },
    tab: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 5,
      paddingVertical: 9,
      paddingHorizontal: 4,
      borderRadius: radii.md,
    },
    tabText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 12.5,
      letterSpacing: 0.1,
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.text,
    },
    tabCount: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.pendingBg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 5,
    },
    tabCountText: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      color: colors.text,
    },
    tabCountTextActive: {
      color: colors.onAccent,
    },
    errorBanner: {
      backgroundColor: colors.errorBg,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.errorBorder,
    },
    errorBannerText: {
      color: colors.error,
    },
    emptyState: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    emptyTitle: {
      ...typography.title,
      fontSize: 18,
      color: colors.text,
    },
    emptyBody: {
      ...typography.body,
      color: colors.textMuted,
      lineHeight: 22,
    },
    emptyBtn: {
      marginTop: spacing.sm,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center' as const,
    },
    emptyBtnText: {
      fontFamily: fonts.bodyBold,
      color: colors.onAccent,
      fontSize: 16,
    },
    list: {
      gap: spacing.md,
    },
    sortBar: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-end' as const,
    },
    sortButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortButtonText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 13,
      color: colors.textMuted,
    },
    takeAllRow: {
      gap: spacing.sm,
    },
    takeAllChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
    },
    timeSection: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    timeSectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.sm,
      paddingHorizontal: 2,
    },
    timeSectionTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    takeAllTitle: {
      fontFamily: fonts.bodySemibold,
      fontSize: 15,
      color: colors.text,
    },
    takeAllMeta: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
  };
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeTodayStyles);
  const { user } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const tabsOffset = useRef(0);
  const tabsRef = useDemoTourTarget('today-tabs');
  const prnTabRef = useDemoTourTarget('today-tab-prn');
  const { registerScrollToTarget, unregisterScrollToTarget } = useDemoTourTargets();
  const [medications, setMedications] = useState<MedicationWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [todayTab, setTodayTab] = useState<TodayTab>('scheduled');
  const [medSort, setMedSortState] = useState<MedSort>('time');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [customOrders, setCustomOrders] = useState<CustomOrders>({
    scheduled: [],
    as_needed: [],
    supplement: [],
  });
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null);
  const [missedDoses, setMissedDoses] = useState<MissedDoseItem[]>([]);
  const [missedBannerDismissed, setMissedBannerDismissed] = useState(false);
  const { celebrationStreak, dismissCelebration, previewCelebration } = useStreakCelebration(
    user?.id,
    streakStats,
  );
  const [snoozeTarget, setSnoozeTarget] = useState<{
    med: MedicationWithStatus;
    time: string;
    currentRemindAt: string | null;
  } | null>(null);
  // medicationId -> { scheduleTime -> ISO remindAt } for doses snoozed today.
  const [snoozeMap, setSnoozeMap] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [sameTimeMode, setSameTimeMode] = useState<SameTimeDoseMode>('choose');
  const [chooseGroup, setChooseGroup] = useState<SameTimeDoseGroup | null>(null);
  const [chooseSelected, setChooseSelected] = useState<Set<string>>(() => new Set());

  const BATCH_DOSE_BUSY = 'batch-dose';

  const refreshSnoozes = useCallback(async () => {
    try {
      const records = await getActiveSnoozes();
      const now = Date.now();
      const map: Record<string, Record<string, string>> = {};
      for (const rec of records) {
        // Only show a snooze that hasn't fired yet; once it fires the normal
        // follow-up chain resumes and the "Snooze" action returns.
        if (new Date(rec.remindAt).getTime() <= now) continue;
        (map[rec.medicationId] ??= {})[rec.scheduleTime] = rec.remindAt;
      }
      setSnoozeMap(map);
    } catch {
      // best-effort; status just won't show
    }
  }, []);

  useEffect(() => {
    isMissedDosesBannerDismissed().then(setMissedBannerDismissed).catch(() => {});
    getMedSort().then(setMedSortState).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      getSameTimeDoseMode().then(setSameTimeMode).catch(() => {});
    }, []),
  );

  async function handleSnoozeConfirm(remindAt: Date) {
    const target = snoozeTarget;
    setSnoozeTarget(null);
    if (!target) return;
    const result = await scheduleDoseSnooze({
      med: { id: target.med.id, name: target.med.name },
      scheduleTime: target.time,
      remindAt,
    });
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    // Reflect the saved snooze immediately so the card shows "Snoozed until …".
    await refreshSnoozes();
    // Rebuild same-time group alerts without this snoozed slot in the nag chain.
    await syncRemindersAfterSupplyChange();
  }

  async function handleSnoozeRemove() {
    const target = snoozeTarget;
    setSnoozeTarget(null);
    if (!target) return;
    await cancelDoseSnooze({ id: target.med.id }, target.time);
    await refreshSnoozes();
    await syncRemindersAfterSupplyChange();
  }

  async function changeMedSort(next: MedSort) {
    setMedSortState(next);
    try {
      await setMedSort(next);
    } catch {
      // preference is best-effort; UI already reflects the choice
    }
  }

  useEffect(() => {
    registerScrollToTarget('today-tabs', () => {
      scrollRef.current?.scrollTo({ y: tabsOffset.current, animated: true });
    });
    registerScrollToTarget('today-tab-prn', () => {
      scrollRef.current?.scrollTo({ y: tabsOffset.current, animated: true });
    });
    registerScrollToTarget('wellness-checkin', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => {
      unregisterScrollToTarget('today-tabs');
      unregisterScrollToTarget('today-tab-prn');
      unregisterScrollToTarget('wellness-checkin');
    };
  }, [registerScrollToTarget, unregisterScrollToTarget]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setError(null);
    const [meds, streak, missed] = await Promise.all([
      fetchMedicationsWithStatus(user.id),
      fetchStreakStats(user.id).catch(() => null),
      fetchMissedDoses(user.id).catch(() => []),
    ]);
    setMedications(meds);
    setStreakStats(streak);
    setMissedDoses(missed);
    setDashboardRefreshKey((key) => key + 1);
  }, [user]);

  // Refetch whenever Today is shown (e.g. after closing add/edit medication modal).
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      getCustomOrders(user.id)
        .then((orders) => {
          if (active) setCustomOrders(orders);
        })
        .catch(() => {});
      void refreshSnoozes();
      loadAll()
        .catch((err: unknown) => {
          if (active) {
            setError(err instanceof Error ? err.message : 'Failed to load medications');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [user, loadAll, refreshSnoozes]),
  );

  // Lock-screen Mark taken / Snooze 10 min queue work here after vault unlock.
  // Grouped same-time alerts may include several medicationIds.
  useEffect(() => {
    if (!user || loading) return;
    let cancelled = false;
    void (async () => {
      const pending = await takePendingDoseAction();
      if (!pending || cancelled) return;
      try {
        const ids =
          pending.medicationIds?.length > 0
            ? pending.medicationIds
            : [pending.medicationId];

        if (pending.type === 'mark_taken') {
          for (const medicationId of ids) {
            try {
              await cancelDoseSnooze({ id: medicationId }, pending.scheduleTime);
              await markDoseTaken(user.id, medicationId, pending.scheduleTime);
            } catch (err) {
              // Already taken / inactive — continue others in the group.
              const message = err instanceof Error ? err.message : '';
              if (!/already marked as taken/i.test(message)) {
                throw err;
              }
            }
          }
          await loadAll();
          await syncRemindersAfterSupplyChange();
          return;
        }
        if (pending.type === 'snooze') {
          const remindAt = new Date(Date.now() + pending.minutes * 60_000);
          for (const medicationId of ids) {
            const med = medications.find((m) => m.id === medicationId);
            const result = await scheduleDoseSnooze({
              med: {
                id: medicationId,
                name: med?.name ?? 'Medication',
              },
              scheduleTime: pending.scheduleTime,
              remindAt,
            });
            if (!result.ok) {
              setError(result.reason);
              return;
            }
          }
          await refreshSnoozes();
          await syncRemindersAfterSupplyChange();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not apply notification action',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // medications intentionally omitted — use snapshot at unlock; re-run on focus via loading flip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }

  async function syncRemindersAfterSupplyChange() {
    if (!user) return;
    const { enabled } = await getReminders();
    if (!enabled) return;
    try {
      await rescheduleAllReminders(user.id);
    } catch {
      // ignore — bootstrap will retry on next foreground
    }
  }

  async function handleMarkTaken(med: MedicationWithStatus, scheduleTime: string) {
    if (!user) return;
    const key = `${med.id}-${scheduleTime}`;
    // Snapshot for rollback: the write can still fail after we've already shown
    // the dose as taken.
    const previous = medications;

    // Flip the slot locally first so the card reacts to the tap immediately
    // rather than after two network round trips. loadAll() below reconciles
    // this with the server and fills in the doseLogId that Undo needs.
    setMedications((current) => applyDoseTaken(current, med.id, scheduleTime));
    successFeedback();
    setBusySlot(key);
    setError(null);
    try {
      await cancelDoseSnooze({ id: med.id }, scheduleTime);
      await markDoseTaken(user.id, med.id, scheduleTime);
      await loadAll();
      await syncRemindersAfterSupplyChange();
    } catch (err) {
      setMedications(previous);
      errorFeedback();
      setError(err instanceof Error ? err.message : 'Could not log dose');
    } finally {
      setBusySlot(null);
    }
  }

  async function handleMarkManyDoses(
    items: { med: MedicationWithStatus; time: string }[],
    options?: { confirmTitle?: string; confirmMessage?: string },
  ) {
    if (!user || items.length === 0) return;
    if (options?.confirmTitle) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(options.confirmTitle!, options.confirmMessage ?? '', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Mark taken', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
    }

    setBusySlot(BATCH_DOSE_BUSY);
    setError(null);
    try {
      const failures: string[] = [];
      for (const { med, time } of items) {
        try {
          await cancelDoseSnooze({ id: med.id }, time);
          await markDoseTaken(user.id, med.id, time);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not log dose';
          if (/already marked as taken/i.test(message)) continue;
          failures.push(`${med.name}: ${message}`);
        }
      }
      await loadAll();
      await syncRemindersAfterSupplyChange();
      if (failures.length > 0) {
        setError(failures.join(' '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log doses');
      await loadAll();
    } finally {
      setBusySlot(null);
    }
  }

  async function handleTakeAllAtTime(
    items: { med: MedicationWithStatus; time: string }[],
    label: string,
  ) {
    await handleMarkManyDoses(items, {
      confirmTitle: `Take all at ${label}?`,
      confirmMessage: `Mark ${items.length} doses as taken.`,
    });
  }

  function openChooseGroup(group: SameTimeDoseGroup) {
    setChooseGroup(group);
    setChooseSelected(
      new Set(
        group.pending.map((item) => sameTimePendingItemKey(item.med.id, item.time)),
      ),
    );
  }

  async function confirmChooseGroup() {
    if (!chooseGroup) return;
    const items = chooseGroup.pending.filter((item) =>
      chooseSelected.has(sameTimePendingItemKey(item.med.id, item.time)),
    );
    await handleMarkManyDoses(items);
    setChooseGroup(null);
  }

  async function handleUndo(med: MedicationWithStatus, slot: DoseSlotStatus) {
    if (!slot.doseLogId) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Undo this dose?',
        `Remove the “taken” mark for ${med.name}${slot.label ? ` (${slot.label})` : ''}? You can log it again later.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Undo', style: 'destructive', onPress: () => resolve(true) },
        ],
      );
    });
    if (!confirmed) return;

    const key = `${med.id}-${slot.time}`;
    setBusySlot(key);
    setError(null);
    try {
      await undoDose(slot.doseLogId, med.id);
      await loadAll();
      await syncRemindersAfterSupplyChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not undo dose');
    } finally {
      setBusySlot(null);
    }
  }

  async function handleLogPrn(med: MedicationWithStatus, payload: PrnDoseLogPayload) {
    if (!user) return;
    const key = `${med.id}-prn`;
    setBusySlot(key);
    setError(null);
    try {
      await markPrnDoseTaken(user.id, med.id, payload);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log dose');
    } finally {
      setBusySlot(null);
    }
  }

  async function handleMoveToAsNeeded(med: MedicationWithStatus) {
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Move to as needed?',
        `Move ${med.name} to as needed (PRN)? Fixed dose times will be removed. Doses you already logged today stay on this medication.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Move', style: 'destructive', onPress: () => resolve(true) },
        ],
      );
    });
    if (!ok) return;
    setBusySlot(`${med.id}-migrate-prn`);
    setError(null);
    try {
      await migrateMedicationToAsNeeded(med.id);
      await loadAll();
      setTodayTab('as_needed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move medication');
    } finally {
      setBusySlot(null);
    }
  }

  async function handleMoveToDailySchedule(med: MedicationWithStatus) {
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Move to daily schedule?',
        `Move ${med.name} to a daily schedule? A default morning dose time (8:00 AM) will be added. Edit the medication to change or add times.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Move', style: 'default', onPress: () => resolve(true) },
        ],
      );
    });
    if (!ok) return;
    setBusySlot(`${med.id}-migrate-daily`);
    setError(null);
    try {
      await migrateMedicationToScheduled(med.id);
      await loadAll();
      setTodayTab('scheduled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move medication');
    } finally {
      setBusySlot(null);
    }
  }

  async function handleDelete(med: MedicationWithStatus) {
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert('Delete medication?', `Delete ${med.name}? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!ok) return;
    setBusySlot(med.id);
    setError(null);
    try {
      await deleteMedication(med.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    } finally {
      setBusySlot(null);
    }
  }

  const { taken: dosesTaken, total: dosesTotal } = todayDoseTotals(
    medications.filter((m) => !isSupplement(m)),
  );
  const scheduledMeds = useMemo(() => {
    const list = medications.filter((m) => !isSupplement(m) && !isAsNeededMed(m));
    return medSort === 'custom'
      ? applyCustomOrder(list, customOrders.scheduled)
      : sortScheduledMedications(list, medSort);
  }, [medications, medSort, customOrders.scheduled]);
  const prnMeds = useMemo(() => {
    const list = medications.filter((m) => !isSupplement(m) && isAsNeededMed(m));
    if (medSort === 'custom') return applyCustomOrder(list, customOrders.as_needed);
    // As-needed has no dose times, so only A-Z is meaningful; leave otherwise.
    if (medSort === 'name') return sortScheduledMedications(list, 'name');
    return list;
  }, [medications, medSort, customOrders.as_needed]);
  const supplementMeds = useMemo(() => {
    const list = medications.filter((m) => isSupplement(m));
    return medSort === 'custom'
      ? applyCustomOrder(list, customOrders.supplement)
      : sortScheduledMedications(list, medSort);
  }, [medications, medSort, customOrders.supplement]);
  const medsByTab: Record<TodayTab, MedicationWithStatus[]> = {
    scheduled: scheduledMeds,
    as_needed: prnMeds,
    supplement: supplementMeds,
  };
  const tabCounts: Record<TodayTab, number> = {
    scheduled: scheduledMeds.length,
    as_needed: prnMeds.length,
    supplement: supplementMeds.length,
  };
  const visibleMeds = medsByTab[todayTab];
  const activeTabIndex = TAB_ORDER.indexOf(todayTab);

  // The selected-tab pill is one shared element that slides between slots rather
  // than a background that blinks on and off each tab. Width comes from measuring
  // the row because the three slots are flex-sized.
  const [tabsWidth, setTabsWidth] = useState(0);
  const tabPosition = useSharedValue(activeTabIndex);
  useEffect(() => {
    tabPosition.value = withSpring(activeTabIndex, {
      damping: 20,
      stiffness: 220,
      mass: 0.6,
    });
  }, [activeTabIndex, tabPosition]);

  const tabSlotWidth =
    tabsWidth > 0
      ? (tabsWidth - TABS_PADDING * 2 - TABS_GAP * (TAB_ORDER.length - 1)) /
        TAB_ORDER.length
      : 0;

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    width: tabSlotWidth,
    transform: [{ translateX: tabPosition.value * (tabSlotWidth + TABS_GAP) }],
    backgroundColor: interpolateColor(
      tabPosition.value,
      [0, 1, 2],
      [
        colors[TAB_ACCENTS.scheduled.bg],
        colors[TAB_ACCENTS.as_needed.bg],
        colors[TAB_ACCENTS.supplement.bg],
      ],
    ),
  }));
  const prnLoggedToday = prnMeds.reduce((sum, m) => sum + m.dosesTakenToday, 0);
  const supplementsLogged = supplementMeds.reduce((sum, m) => sum + m.dosesTakenToday, 0);
  const showSortRow = visibleMeds.length > 1;
  // As-needed meds have no dose times, so sorting by time would be meaningless.
  const sortOptions: SortOption[] = [
    ...(todayTab !== 'as_needed'
      ? [
          {
            value: 'time' as const,
            label: 'By time',
            hint: 'Earliest dose first, taken ones last',
          },
        ]
      : []),
    { value: 'name', label: 'A–Z', hint: 'Alphabetical by medication name' },
    { value: 'custom', label: 'Custom order', hint: 'The order you arranged by hand' },
  ];
  const refillAlerts = getRefillAlerts(medications);

  const takeAllGroups = useMemo(
    () => (todayTab === 'as_needed' ? [] : buildSameTimePendingGroups(visibleMeds)),
    [todayTab, visibleMeds],
  );

  const scheduleTimeSections = useMemo(
    () => (todayTab === 'as_needed' ? [] : buildScheduleTimeSections(visibleMeds)),
    [todayTab, visibleMeds],
  );

  const batchDoseBusy = busySlot === BATCH_DOSE_BUSY;

  function openAddMedication(
    scheduleType: MedicationScheduleType = 'scheduled',
    category: MedicationCategory = 'medication',
  ) {
    if (category === 'supplement') {
      router.push(routes.supplementNew);
      return;
    }
    router.push({
      pathname: routes.medicationNew,
      params: { scheduleType, category },
    });
  }

  // Ordered by urgency: a dose due right now outranks a refill you have days to
  // handle. AlertStack shows the first and hides the rest behind a toggle.
  const alertItems: AlertItem[] = [];
  if (missedDoses.some((item) => item.periodLabel === 'Today')) {
    alertItems.push({ key: 'due-now', node: <DueNowBanner items={missedDoses} /> });
  }
  if (!missedBannerDismissed && missedDoses.length > 0) {
    alertItems.push({
      key: 'missed',
      node: (
        <MissedDosesBanner
          items={missedDoses}
          onDismiss={() => {
            void (async () => {
              await dismissMissedDosesBanner();
              setMissedBannerDismissed(true);
            })();
          }}
        />
      ),
    });
  }
  if (refillAlerts.length > 0) {
    alertItems.push({
      key: 'refill',
      node: <RefillBanner alerts={refillAlerts} onPress={() => router.push(routes.account)} />,
    });
  }

  let summaryText: string;
  if (todayTab === 'scheduled') {
    summaryText =
      dosesTotal === 0
        ? scheduledMeds.length === 0
          ? 'No daily medications yet'
          : 'No dose times scheduled today'
        : `${dosesTaken} of ${dosesTotal} dose${dosesTotal === 1 ? '' : 's'} taken`;
  } else if (todayTab === 'as_needed') {
    summaryText =
      prnMeds.length === 0
        ? 'No as-needed medications yet'
        : prnLoggedToday === 0
          ? 'Log a dose when you take one'
          : `${prnLoggedToday} dose${prnLoggedToday === 1 ? '' : 's'} logged today`;
  } else {
    summaryText =
      supplementMeds.length === 0
        ? 'No supplements yet'
        : supplementsLogged === 0
          ? 'Track your vitamins & supplements'
          : `${supplementsLogged} supplement dose${supplementsLogged === 1 ? '' : 's'} logged today`;
  }

  // The hero answers "what do I do next", so the headline is the soonest dose
  // still outstanding rather than a restatement of the count below it.
  const nextDose = (() => {
    let best: { name: string; label: string; minutes: number } | null = null;
    for (const med of scheduledMeds) {
      for (const slot of med.slots) {
        if (slot.taken) continue;
        const minutes = scheduleTimeToMinutes(slot.time);
        if (!Number.isFinite(minutes)) continue;
        if (!best || minutes < best.minutes) {
          best = { name: med.name, label: slot.label, minutes };
        }
      }
    }
    return best;
  })();

  let heroHeadline: string;
  if (todayTab === 'scheduled') {
    heroHeadline =
      dosesTotal > 0 && dosesTaken >= dosesTotal
        ? 'All doses taken'
        : nextDose
          ? `Next: ${nextDose.name} at ${nextDose.label}`
          : 'Today';
  } else if (todayTab === 'as_needed') {
    heroHeadline = 'As needed';
  } else {
    heroHeadline = 'Supplements';
  }

  const renderMedCard = (
    med: MedicationWithStatus,
    visibleScheduleTime?: string,
  ) => (
    <MedicationCard
      key={med.id}
      medication={med}
      busySlot={busySlot}
      snoozeByTime={snoozeMap[med.id]}
      visibleScheduleTime={visibleScheduleTime}
      onMarkTaken={(time) => handleMarkTaken(med, time)}
      onSnooze={(time) =>
        setSnoozeTarget({
          med,
          time,
          currentRemindAt: snoozeMap[med.id]?.[time] ?? null,
        })
      }
      onLogPrn={(payload) => handleLogPrn(med, payload)}
      onUndo={(slot) => handleUndo(med, slot)}
      onMoveToAsNeeded={() => handleMoveToAsNeeded(med)}
      onMoveToDailySchedule={() => handleMoveToDailySchedule(med)}
      onDelete={() => handleDelete(med)}
    />
  );

  function renderSameTimeBar(group: SameTimeDoseGroup) {
    if (sameTimeMode === 'individual' || group.pending.length < 2) return null;
    return (
      <SameTimeDoseGroupBar
        group={group}
        mode={sameTimeMode}
        disabled={busySlot != null}
        busy={batchDoseBusy}
        onTakeAll={() => void handleTakeAllAtTime(group.pending, group.label)}
        onChoose={() => openChooseGroup(group)}
      />
    );
  }

  function renderDoseList() {
    const useTimeSections =
      todayTab !== 'as_needed' && medSort === 'time' && scheduleTimeSections.length > 0;

    if (useTimeSections) {
      return scheduleTimeSections.map((section) => (
        <View key={section.time} style={styles.timeSection}>
          <View style={styles.timeSectionHeader}>
            <Text style={styles.timeSectionTitle}>{section.label}</Text>
            {renderSameTimeBar({
              time: section.time,
              label: section.label,
              pending: section.pending,
            })}
          </View>
          {section.meds.map((med) => renderMedCard(med, section.time))}
        </View>
      ));
    }

    return (
      <>
        {sameTimeMode !== 'individual' && takeAllGroups.length > 0 ? (
          <View style={styles.takeAllRow}>
            {takeAllGroups.map((group) => (
              <View key={group.time} style={styles.takeAllChip}>
                <View>
                  <Text style={styles.takeAllTitle}>{group.label}</Text>
                  <Text style={styles.takeAllMeta}>
                    {group.pending.length} doses ready
                  </Text>
                </View>
                {renderSameTimeBar(group)}
              </View>
            ))}
          </View>
        ) : null}
        {visibleMeds.map((med) => renderMedCard(med))}
      </>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading medications…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      {celebrationStreak != null ? (
        <StreakCelebration streakDays={celebrationStreak} onDismiss={dismissCelebration} />
      ) : null}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <TodayHero
          taken={todayTab === 'scheduled' ? dosesTaken : 0}
          total={todayTab === 'scheduled' ? dosesTotal : 0}
          headline={heroHeadline}
          detail={summaryText}
          accent={colors[TAB_ACCENTS[todayTab].fg]}
          footer={
            todayTab === 'scheduled' ? (
              <StreakSnippet stats={streakStats} onPreviewCelebration={previewCelebration} />
            ) : null
          }
        />

        <AlertStack items={alertItems} />
        {/* Interaction warnings stay outside the collapse: they are safety
            information the user should never have to tap to reveal. */}
        <InteractionAlert medicationNames={medications.map((m) => m.name)} />

        <TodayDashboard
          key={user?.id}
          stats={streakStats}
          medications={medications}
          refreshKey={dashboardRefreshKey}
          onMedicationTab={(tab) => {
            setTodayTab(tab);
            scrollRef.current?.scrollTo({ y: tabsOffset.current, animated: true });
          }}
        />

        <Text style={{ ...typography.heading, color: colors.text }}>Your medications</Text>
        <View
          ref={tabsRef}
          collapsable={false}
          style={styles.tabs}
          onLayout={(e) => {
            setTabsWidth(e.nativeEvent.layout.width);
            tabsOffset.current = e.nativeEvent.layout.y;
          }}
        >
          {tabSlotWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.tabIndicator, tabIndicatorStyle]}
            />
          ) : null}
          {TAB_ORDER.map((tab) => {
            const active = todayTab === tab;
            const accent = TAB_ACCENTS[tab];
            const count = tabCounts[tab];
            const pressable = (
              <Pressable
                style={styles.tab}
                onPress={() => setTodayTab(tab)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.tabText, active && { color: colors[accent.fg] }]}
                  numberOfLines={1}
                >
                  {TAB_LABELS[tab]}
                </Text>
                {count > 0 ? (
                  <View
                    style={[styles.tabCount, active && { backgroundColor: colors[accent.fg] }]}
                  >
                    <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
            if (tab === 'as_needed') {
              return (
                <View key={tab} ref={prnTabRef} collapsable={false} style={{ flex: 1 }}>
                  {pressable}
                </View>
              );
            }
            return (
              <View key={tab} style={{ flex: 1 }}>
                {pressable}
              </View>
            );
          })}
        </View>

        {showSortRow ? (
          <View style={styles.sortBar}>
            <PressableScale
              style={styles.sortButton}
              scaleTo={0.95}
              onPress={() => {
                tapFeedback();
                setSortSheetOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Sort medications, currently ${SORT_LABELS[medSort]}`}
            >
              <Text style={styles.sortButtonText}>⇅ {SORT_LABELS[medSort]}</Text>
            </PressableScale>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {medications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No medications yet.</Text>
            <Text style={styles.emptyBody}>
              Tap + above to add your first medication.
            </Text>
          </View>
        ) : (
          <SwipeTabView
            index={activeTabIndex}
            count={TAB_ORDER.length}
            onIndexChange={(i) => setTodayTab(TAB_ORDER[i])}
          >
            {visibleMeds.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyBody}>
                  {todayTab === 'scheduled'
                    ? 'No daily medications yet. Add one with fixed reminder times.'
                    : todayTab === 'as_needed'
                      ? 'No as-needed medications yet. Add PRN meds like pain relievers or rescue inhalers.'
                      : 'No supplements yet. Add vitamins, minerals, or herbal supplements to track them here.'}
                </Text>
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() =>
                    openAddMedication(
                      todayTab === 'as_needed' ? 'as_needed' : 'scheduled',
                      todayTab === 'supplement' ? 'supplement' : 'medication',
                    )
                  }
                >
                  <Text style={styles.emptyBtnText}>
                    {todayTab === 'scheduled'
                      ? 'Add daily medication'
                      : todayTab === 'as_needed'
                        ? 'Add as-needed medication'
                        : 'Add supplement'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.list}>{renderDoseList()}</View>
            )}
          </SwipeTabView>
        )}

        <TodayWellnessCheckIn onSaved={() => setDashboardRefreshKey((key) => key + 1)} />
      </ScrollView>

      <SortSheet
        visible={sortSheetOpen}
        value={medSort}
        options={sortOptions}
        onSelect={(next) => {
          setSortSheetOpen(false);
          void changeMedSort(next);
        }}
        onReorder={
          visibleMeds.length > 1
            ? () => {
                setSortSheetOpen(false);
                router.push({ pathname: routes.reorder, params: { tab: todayTab } });
              }
            : undefined
        }
        onClose={() => setSortSheetOpen(false)}
      />

      <SameTimeDoseChooseModal
        visible={chooseGroup != null}
        group={chooseGroup}
        selectedKeys={chooseSelected}
        busy={batchDoseBusy}
        onToggle={(key) => {
          setChooseSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
        }}
        onSelectAll={() => {
          if (!chooseGroup) return;
          setChooseSelected(
            new Set(
              chooseGroup.pending.map((item) =>
                sameTimePendingItemKey(item.med.id, item.time),
              ),
            ),
          );
        }}
        onClearAll={() => setChooseSelected(new Set())}
        onConfirm={() => void confirmChooseGroup()}
        onClose={() => setChooseGroup(null)}
      />

      <SnoozeModal
        visible={snoozeTarget != null}
        medName={snoozeTarget?.med.name ?? ''}
        currentRemindAt={snoozeTarget?.currentRemindAt ?? null}
        onCancel={() => setSnoozeTarget(null)}
        onConfirm={handleSnoozeConfirm}
        onRemove={handleSnoozeRemove}
      />
    </SafeAreaView>
  );
}
