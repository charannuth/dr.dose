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
import { DueNowBanner } from '../../components/banners/DueNowBanner';
import { MissedDosesBanner } from '../../components/banners/MissedDosesBanner';
import { RefillBanner } from '../../components/banners/RefillBanner';
import { InteractionAlert } from '../../components/banners/InteractionAlert';
import { TodayWellnessCheckIn } from '../../components/TodayWellnessCheckIn';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTourTarget, useDemoTourTargets } from '../../context/DemoTourTargetsContext';
import {
  deleteMedication,
  fetchMedicationsWithStatus,
  markDoseTaken,
  markPrnDoseTaken,
  migrateMedicationToAsNeeded,
  migrateMedicationToScheduled,
  todayDoseTotals,
  undoDose,
} from '../../lib/medications';
import { isAsNeededMed, type MedicationScheduleType } from '../../lib/medicationSchedule';
import { fetchStreakStats, type StreakStats } from '../../lib/streaks';
import { fetchMissedDoses, type MissedDoseItem } from '../../lib/missedDoses';
import { getRefillAlerts } from '../../lib/refills';
import { rescheduleAllReminders } from '../../lib/reminders';
import { getReminders } from '../../lib/settings';
import {
  dismissMissedDosesBanner,
  isMissedDosesBannerDismissed,
} from '../../lib/bannerSettings';
import type { DoseSlotStatus, MedicationWithStatus } from '../../lib/types';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import type { PrnDoseLogPayload } from '../../lib/prnCheckIn';
import { Alert } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type TodayTab = 'scheduled' | 'as_needed';

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
      fontSize: 28,
      fontWeight: '800' as const,
      color: colors.text,
    },
    summaryText: {
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
      gap: 6,
      paddingVertical: 10,
      borderRadius: radii.md,
    },
    tabActive: {
      backgroundColor: colors.surface,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.text,
    },
    tabCount: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.pendingBg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 6,
    },
    tabCountActive: {
      backgroundColor: colors.accent,
    },
    tabCountText: {
      fontSize: 12,
      fontWeight: '700' as const,
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
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    emptyBody: {
      fontSize: 15,
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
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: '700' as const,
    },
    list: {
      gap: spacing.md,
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
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null);
  const [missedDoses, setMissedDoses] = useState<MissedDoseItem[]>([]);
  const [missedBannerDismissed, setMissedBannerDismissed] = useState(false);
  const { celebrationStreak, dismissCelebration, previewCelebration } = useStreakCelebration(
    user?.id,
    streakStats,
  );

  useEffect(() => {
    isMissedDosesBannerDismissed().then(setMissedBannerDismissed).catch(() => {});
  }, []);

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

  const { taken: dosesTaken, total: dosesTotal } = todayDoseTotals(medications);
  const scheduledMeds = useMemo(
    () => medications.filter((m) => !isAsNeededMed(m)),
    [medications],
  );
  const prnMeds = useMemo(
    () => medications.filter((m) => isAsNeededMed(m)),
    [medications],
  );
  const visibleMeds = todayTab === 'scheduled' ? scheduledMeds : prnMeds;
  const prnLoggedToday = prnMeds.reduce((sum, m) => sum + m.dosesTakenToday, 0);
  const refillAlerts = getRefillAlerts(medications);

  function openAddMedication(scheduleType: MedicationScheduleType = 'scheduled') {
    router.push({
      pathname: '/medications/new',
      params: { scheduleType },
    });
  }

  const summaryText =
    todayTab === 'scheduled'
      ? dosesTotal === 0
        ? scheduledMeds.length === 0
          ? 'No daily medications yet'
          : 'No dose times scheduled today'
        : `${dosesTaken} of ${dosesTotal} dose${dosesTotal === 1 ? '' : 's'} taken`
      : prnMeds.length === 0
        ? 'No as-needed medications yet'
        : prnLoggedToday === 0
          ? 'Log a dose when you take one'
          : `${prnLoggedToday} dose${prnLoggedToday === 1 ? '' : 's'} logged today`;

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

        <RefillBanner
          alerts={refillAlerts}
          onPress={() => router.push('/account')}
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
          <Pressable
            style={[styles.tab, todayTab === 'scheduled' && styles.tabActive]}
            onPress={() => setTodayTab('scheduled')}
          >
            <Text style={[styles.tabText, todayTab === 'scheduled' && styles.tabTextActive]}>
              Daily schedule
            </Text>
            {scheduledMeds.length > 0 ? (
              <View style={[styles.tabCount, todayTab === 'scheduled' && styles.tabCountActive]}>
                <Text
                  style={[
                    styles.tabCountText,
                    todayTab === 'scheduled' && styles.tabCountTextActive,
                  ]}
                >
                  {scheduledMeds.length}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <View ref={prnTabRef} collapsable={false} style={{ flex: 1 }}>
            <Pressable
              style={[styles.tab, todayTab === 'as_needed' && styles.tabActive]}
              onPress={() => setTodayTab('as_needed')}
            >
            <Text style={[styles.tabText, todayTab === 'as_needed' && styles.tabTextActive]}>
              As needed
            </Text>
            {prnMeds.length > 0 ? (
              <View style={[styles.tabCount, todayTab === 'as_needed' && styles.tabCountActive]}>
                <Text
                  style={[
                    styles.tabCountText,
                    todayTab === 'as_needed' && styles.tabCountTextActive,
                  ]}
                >
                  {prnMeds.length}
                </Text>
              </View>
            ) : null}
          </Pressable>
          </View>
        </View>

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
        ) : visibleMeds.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyBody}>
              {todayTab === 'scheduled'
                ? 'No daily medications yet. Add one with fixed reminder times.'
                : 'No as-needed medications yet. Add PRN meds like pain relievers or rescue inhalers.'}
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() =>
                openAddMedication(todayTab === 'scheduled' ? 'scheduled' : 'as_needed')
              }
            >
              <Text style={styles.emptyBtnText}>
                {todayTab === 'scheduled'
                  ? 'Add daily medication'
                  : 'Add as-needed medication'}
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
                onLogPrn={(payload) => handleLogPrn(med, payload)}
                onUndo={(slot) => handleUndo(med, slot)}
                onMoveToAsNeeded={() => handleMoveToAsNeeded(med)}
                onMoveToDailySchedule={() => handleMoveToDailySchedule(med)}
                onDelete={() => handleDelete(med)}
              />
            ))}
          </View>
        )}

        <TodayWellnessCheckIn />
      </ScrollView>
    </SafeAreaView>
  );
}
