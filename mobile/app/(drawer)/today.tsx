import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MedicationCard } from '../../components/MedicationCard';
import { StreakSnippet } from '../../components/StreakSnippet';
import { StreakCelebration } from '../../components/StreakCelebration';
import { useStreakCelebration } from '../../hooks/useStreakCelebration';
import { useAppUpdateCheck } from '../../hooks/useAppUpdateCheck';
import { DueNowBanner } from '../../components/banners/DueNowBanner';
import { MissedDosesBanner } from '../../components/banners/MissedDosesBanner';
import { RefillBanner } from '../../components/banners/RefillBanner';
import { InteractionAlert } from '../../components/banners/InteractionAlert';
import { UpdateBanner } from '../../components/banners/UpdateBanner';
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
import { fetchStreakStats, type StreakStats } from '../../lib/streaks';
import { fetchMissedDoses, type MissedDoseItem } from '../../lib/missedDoses';
import { getRefillAlerts } from '../../lib/refills';
import { routes } from '../../lib/routes';
import { rescheduleAllReminders, scheduleDoseSnooze } from '../../lib/reminders';
import { SnoozeModal } from '../../components/SnoozeModal';
import {
  getCustomOrders,
  getMedSort,
  getReminders,
  setMedSort,
  type CustomOrders,
  type MedSort,
} from '../../lib/settings';
import {
  dismissMissedDosesBanner,
  isMissedDosesBannerDismissed,
} from '../../lib/bannerSettings';
import type { DoseSlotStatus, MedicationWithStatus } from '../../lib/types';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing, typography } from '../../constants/theme';
import type { PrnDoseLogPayload } from '../../lib/prnCheckIn';
import { Alert } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type TodayTab = 'scheduled' | 'as_needed' | 'supplement';

const TAB_ORDER: TodayTab[] = ['scheduled', 'as_needed', 'supplement'];

const TAB_LABELS: Record<TodayTab, string> = {
  scheduled: 'Daily',
  as_needed: 'As needed',
  supplement: 'Supplements',
};

// Each tab gets its own accent so the row reads as a colorful, scannable control.
type TabAccent = { fg: keyof ColorPalette; bg: keyof ColorPalette };
const TAB_ACCENTS: Record<TodayTab, TabAccent> = {
  scheduled: { fg: 'accentBlue', bg: 'accentBlueBg' },
  as_needed: { fg: 'accentPurple', bg: 'accentPurpleBg' },
  supplement: { fg: 'accentGreen', bg: 'accentGreenBg' },
};

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
    summary: {
      gap: 4,
    },
    summaryTitle: {
      ...typography.display,
      color: colors.text,
    },
    summaryText: {
      ...typography.body,
      fontSize: 16,
      color: colors.textMuted,
    },
    tabs: {
      flexDirection: 'row' as const,
      backgroundColor: colors.border,
      borderRadius: radii.lg,
      padding: 4,
      gap: 4,
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
    tabActive: {
      backgroundColor: colors.surface,
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
    sortRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    sortLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textMuted,
    },
    sortOptions: {
      flexDirection: 'row' as const,
      gap: 6,
      flexShrink: 1,
    },
    sortChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    sortChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    sortChipText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 14,
      color: colors.textMuted,
    },
    sortChipTextActive: {
      color: colors.onAccent,
    },
    reorderBtn: {
      marginLeft: 'auto' as const,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.buttonSecondaryBg,
    },
    reorderBtnText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 14,
      color: colors.accent,
    },
  };
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeTodayStyles);
  const { user } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const tabsRef = useDemoTourTarget('today-tabs');
  const prnTabRef = useDemoTourTarget('today-tab-prn');
  const { registerScrollToTarget, unregisterScrollToTarget } = useDemoTourTargets();
  const [medications, setMedications] = useState<MedicationWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [todayTab, setTodayTab] = useState<TodayTab>('scheduled');
  const [medSort, setMedSortState] = useState<MedSort>('time');
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
  const { updateInfo, dismissUpdate } = useAppUpdateCheck();
  const [snoozeTarget, setSnoozeTarget] = useState<{
    med: MedicationWithStatus;
    time: string;
  } | null>(null);

  useEffect(() => {
    isMissedDosesBannerDismissed().then(setMissedBannerDismissed).catch(() => {});
    getMedSort().then(setMedSortState).catch(() => {});
  }, []);

  async function handleSnoozeConfirm(remindAt: Date) {
    const target = snoozeTarget;
    setSnoozeTarget(null);
    if (!target) return;
    const result = await scheduleDoseSnooze({
      med: { id: target.med.id, name: target.med.name },
      scheduleTime: target.time,
      remindAt,
    });
    if (!result.ok) setError(result.reason);
  }

  function openReorder() {
    router.push({
      pathname: routes.reorder,
      params: { tab: todayTab, ids: visibleMeds.map((m) => m.id).join(',') },
    });
  }

  async function changeMedSort(next: MedSort) {
    setMedSortState(next);
    try {
      await setMedSort(next);
    } catch {
      // preference is best-effort; UI already reflects the choice
    }
    // Choosing Custom drops the user straight into the drag-to-reorder screen.
    if (next === 'custom') openReorder();
  }

  useEffect(() => {
    registerScrollToTarget('today-tabs', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    registerScrollToTarget('today-tab-prn', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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
    }, [user, loadAll]),
  );

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
    setBusySlot(key);
    setError(null);
    try {
      await markDoseTaken(user.id, med.id, scheduleTime);
      await loadAll();
      await syncRemindersAfterSupplyChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log dose');
    } finally {
      setBusySlot(null);
    }
  }

  async function handleUndo(med: MedicationWithStatus, slot: DoseSlotStatus) {
    if (!slot.doseLogId) return;
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
  const prnLoggedToday = prnMeds.reduce((sum, m) => sum + m.dosesTakenToday, 0);
  const supplementsLogged = supplementMeds.reduce((sum, m) => sum + m.dosesTakenToday, 0);
  const showSortRow = visibleMeds.length > 1;
  const refillAlerts = getRefillAlerts(medications);

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
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Today</Text>
          <Text style={styles.summaryText}>{summaryText}</Text>
          {todayTab === 'scheduled' ? (
            <StreakSnippet stats={streakStats} onPreviewCelebration={previewCelebration} />
          ) : null}
        </View>

        <UpdateBanner info={updateInfo} onDismiss={() => void dismissUpdate()} />

        <RefillBanner
          alerts={refillAlerts}
          onPress={() => router.push(routes.account)}
        />
        <DueNowBanner items={missedDoses} />
        {!missedBannerDismissed ? (
          <MissedDosesBanner
            items={missedDoses}
            onDismiss={() => {
              void (async () => {
                await dismissMissedDosesBanner();
                setMissedBannerDismissed(true);
              })();
            }}
          />
        ) : null}
        <InteractionAlert medicationNames={medications.map((m) => m.name)} />

        <View ref={tabsRef} collapsable={false} style={styles.tabs}>
          {TAB_ORDER.map((tab) => {
            const active = todayTab === tab;
            const accent = TAB_ACCENTS[tab];
            const count = tabCounts[tab];
            const pressable = (
              <Pressable
                style={[
                  styles.tab,
                  active && styles.tabActive,
                  active && { backgroundColor: colors[accent.bg] },
                ]}
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
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by</Text>
            <View style={styles.sortOptions}>
              {todayTab !== 'as_needed' ? (
                <Pressable
                  style={[styles.sortChip, medSort === 'time' && styles.sortChipActive]}
                  onPress={() => void changeMedSort('time')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: medSort === 'time' }}
                >
                  <Text
                    style={[styles.sortChipText, medSort === 'time' && styles.sortChipTextActive]}
                  >
                    Time
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.sortChip, medSort === 'name' && styles.sortChipActive]}
                onPress={() => void changeMedSort('name')}
                accessibilityRole="button"
                accessibilityState={{ selected: medSort === 'name' }}
              >
                <Text
                  style={[styles.sortChipText, medSort === 'name' && styles.sortChipTextActive]}
                >
                  A–Z
                </Text>
              </Pressable>
              <Pressable
                style={[styles.sortChip, medSort === 'custom' && styles.sortChipActive]}
                onPress={() => void changeMedSort('custom')}
                accessibilityRole="button"
                accessibilityState={{ selected: medSort === 'custom' }}
              >
                <Text
                  style={[styles.sortChipText, medSort === 'custom' && styles.sortChipTextActive]}
                >
                  Custom
                </Text>
              </Pressable>
            </View>
            {medSort === 'custom' ? (
              <Pressable
                style={styles.reorderBtn}
                onPress={openReorder}
                accessibilityRole="button"
                accessibilityLabel="Reorder medications"
              >
                <Text style={styles.reorderBtnText}>Reorder</Text>
              </Pressable>
            ) : null}
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
              <View style={styles.list}>
                {visibleMeds.map((med) => (
                  <MedicationCard
                    key={med.id}
                    medication={med}
                    busySlot={busySlot}
                    onMarkTaken={(time) => handleMarkTaken(med, time)}
                    onSnooze={(time) => setSnoozeTarget({ med, time })}
                    onLogPrn={(payload) => handleLogPrn(med, payload)}
                    onUndo={(slot) => handleUndo(med, slot)}
                    onMoveToAsNeeded={() => handleMoveToAsNeeded(med)}
                    onMoveToDailySchedule={() => handleMoveToDailySchedule(med)}
                    onDelete={() => handleDelete(med)}
                  />
                ))}
              </View>
            )}
          </SwipeTabView>
        )}

        <TodayWellnessCheckIn />
      </ScrollView>

      <SnoozeModal
        visible={snoozeTarget != null}
        medName={snoozeTarget?.med.name ?? ''}
        onCancel={() => setSnoozeTarget(null)}
        onConfirm={handleSnoozeConfirm}
      />
    </SafeAreaView>
  );
}
