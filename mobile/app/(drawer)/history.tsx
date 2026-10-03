import { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { routes } from '../../lib/routes';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useDayDetail } from '../../hooks/useDayDetail';
import { useStreakStats } from '../../hooks/useStreakStats';
import { addDaysToDateString, formatDisplayDate, todayLocalDate } from '../../lib/dates';
import { redeemDose, undoDose } from '../../lib/medications';
import type { DayDoseSlot } from '../../lib/dayDetail';
import { fetchDoseHistory, historyStats, type HistoryDay } from '../../lib/history';
import { STREAK_CALENDAR_DAYS } from '../../lib/streaks';
import { fetchWeeklySummary, type WeeklySummary } from '../../lib/weeklySummary';
import { HistoryCalendar } from '../../components/history/HistoryCalendar';
import { DayAdherenceDetail } from '../../components/history/DayAdherenceDetail';

function makeHistoryStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 40, gap: 24 },
    headerCard: { gap: 8, paddingTop: 4 },
    h1: { fontFamily: fonts.heading, fontSize: 26, color: colors.text },
    sub: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 20, color: colors.textMuted },
    weeklyCard: { gap: 8, paddingBottom: 20, borderBottomWidth: 1, borderColor: colors.border },
    weeklyTitle: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
    weeklyBody: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 23, color: colors.textMuted },
    bold: { fontFamily: fonts.bodySemibold, color: colors.text },
    card: { paddingVertical: 16, gap: 12 },
    statsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 20, borderTopWidth: 1, borderColor: colors.border, paddingTop: 20 },
    statCard: { flex: 1, minWidth: 120, gap: 6 },
    statValue: { fontFamily: fonts.heading, fontSize: 28, color: colors.text },
    statLabel: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
    errorCard: { borderTopWidth: 1, borderColor: colors.border }, errorText: { color: colors.error, fontSize: 14, lineHeight: 21 },
    loadingRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm },
    primaryBtn: { minHeight: 48, backgroundColor: colors.accent, borderRadius: radii.md, justifyContent: 'center' as const, alignItems: 'center' as const },
    primaryBtnText: { fontFamily: fonts.bodySemibold, color: colors.onAccent },
    footer: { color: colors.textMuted, fontSize: 12, lineHeight: 20 }, footerLink: { color: colors.accent, fontFamily: fonts.bodySemibold },
  };
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeHistoryStyles);
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ historyDate?: string }>();
  const initialDate =
    typeof params.historyDate === 'string' && params.historyDate.length > 0
      ? params.historyDate
      : null;

  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemBusy, setRedeemBusy] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const { stats: streakStats, loading: streakLoading, reload: reloadStreaks } =
    useStreakStats(user?.id);
  const {
    detail: dayDetail,
    loading: dayLoading,
    error: dayError,
    reload: reloadDay,
  } = useDayDetail(user?.id, selectedDate);

  const yesterday = addDaysToDateString(todayLocalDate(), -1);
  const canRedeem = selectedDate === yesterday;

  const selectedStreakStatus = useMemo(() => {
    if (!selectedDate || !streakStats) return undefined;
    return streakStats.consistencyCalendar.find((d) => d.date === selectedDate)?.status;
  }, [selectedDate, streakStats]);

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
  }, [initialDate]);

  async function loadHistory() {
    if (!user) return;
    setError(null);
    const [history, summary] = await Promise.all([
      fetchDoseHistory(user.id, STREAK_CALENDAR_DAYS),
      fetchWeeklySummary(user.id),
    ]);
    await reloadStreaks();
    setDays(history);
    setWeekly(summary);
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);

    loadHistory()
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load history');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRedeem(slot: DayDoseSlot) {
    if (!user || !selectedDate) return;
    setRedeemError(null);
    setRedeemBusy(`${slot.medicationId}-${slot.scheduleTime}`);
    try {
      await redeemDose(user.id, slot.medicationId, slot.scheduleTime, selectedDate);
      reloadDay();
      await loadHistory();
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Failed to redeem dose');
    } finally {
      setRedeemBusy(null);
    }
  }

  async function handleUndoLate(slot: DayDoseSlot) {
    if (!slot.doseLogId) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Undo this dose?',
        `Remove the “taken” mark for ${slot.medicationName}? You can log it again later.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Undo', style: 'destructive', onPress: () => resolve(true) },
        ],
      );
    });
    if (!confirmed) return;

    setRedeemError(null);
    setRedeemBusy(`${slot.medicationId}-${slot.scheduleTime}`);
    try {
      await undoDose(slot.doseLogId, slot.medicationId);
      reloadDay();
      await loadHistory();
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Failed to undo dose');
    } finally {
      setRedeemBusy(null);
    }
  }

  const stats = historyStats(days);
  const showCalendar = !loading && !error && !streakLoading && streakStats;
  const hasWeekly =
    weekly &&
    (weekly.scheduledExpected > 0 || weekly.prnTaken > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.headerCard}>
          <Text style={styles.h1}>Your recent record</Text>
          <Text style={styles.sub}>
            {selectedDate
              ? formatDisplayDate(selectedDate)
              : `${STREAK_CALENDAR_DAYS}-day calendar · tap a day for doses and notes`}
          </Text>
        </View>

        {!loading && !error && hasWeekly ? (
          <View style={styles.weeklyCard}>
            <Text style={styles.weeklyTitle}>This week</Text>
            <Text style={styles.weeklyBody}>
              {weekly!.scheduledExpected > 0 ? (
                <>
                  <Text style={styles.bold}>Daily schedule:</Text> {weekly!.scheduledTaken} of{' '}
                  {weekly!.scheduledExpected} doses ({weekly!.scheduledPercent}%)
                </>
              ) : null}
              {weekly!.scheduledExpected > 0 && weekly!.prnTaken > 0 ? ' · ' : null}
              {weekly!.prnTaken > 0 ? (
                <>
                  <Text style={styles.bold}>As needed:</Text> {weekly!.prnTaken}
                  {weekly!.prnCap > 0
                    ? ` of ${weekly!.prnCap} max doses`
                    : ` dose${weekly!.prnTaken === 1 ? '' : 's'} logged`}
                </>
              ) : null}
            </Text>
          </View>
        ) : null}

        {showCalendar ? (
          <HistoryCalendar
            days={streakStats!.consistencyCalendar}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        ) : null}

        {showCalendar && selectedDate ? (
          <DayAdherenceDetail
            minimal
            detail={dayDetail}
            loading={dayLoading}
            error={dayError ?? redeemError}
            streakStatus={selectedStreakStatus}
            showHistoryLink={false}
            canRedeem={canRedeem}
            busyKey={redeemBusy}
            onRedeem={handleRedeem}
            onUndoLate={handleUndoLate}
            onClear={() => setSelectedDate(null)}
          />
        ) : null}

        {!loading && !error && !selectedDate && streakStats ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalDoses}</Text>
              <Text style={styles.statLabel}>Doses logged ({stats.dayCount} days)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.daysWithDoses}</Text>
              <Text style={styles.statLabel}>Days with at least one dose</Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading || streakLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.sub}>Loading history…</Text>
          </View>
        ) : null}

        {!loading &&
        stats.totalDoses === 0 &&
        !streakStats?.hasMedications &&
        !selectedDate &&
        !streakLoading ? (
          <View style={styles.card}>
            <Text style={styles.sub}>
              No doses logged yet in the last {STREAK_CALENDAR_DAYS} days.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push(routes.today)}>
              <Text style={styles.primaryBtnText}>Go to Today</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Tulip badges and streak milestones are on{' '}
          <Text style={styles.footerLink} onPress={() => router.push(routes.streaks)}>
            Streaks
          </Text>
          .
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
