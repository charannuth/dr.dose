import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useDayDetail } from '../../hooks/useDayDetail';
import { useStreakStats } from '../../hooks/useStreakStats';
import { formatDisplayDate } from '../../lib/dates';
import { fetchDoseHistory, historyStats, type HistoryDay } from '../../lib/history';
import { STREAK_CALENDAR_DAYS } from '../../lib/streaks';
import { fetchWeeklySummary, type WeeklySummary } from '../../lib/weeklySummary';
import { StreakConsistencyCalendar } from '../../components/streaks/StreakConsistencyCalendar';
import { DayAdherenceDetail } from '../../components/history/DayAdherenceDetail';

function makeHistoryStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    weeklyCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      gap: 4,
    },
    weeklyTitle: { fontSize: 14, fontWeight: '800' as const, color: colors.text },
    weeklyBody: { color: colors.textMuted, lineHeight: 22, fontSize: 15 },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    h1: { fontSize: 22, fontWeight: '900' as const, color: colors.text },
    sub: { color: colors.textMuted, lineHeight: 20 },
    bold: { fontWeight: '800' as const, color: colors.text },
    statsRow: { flexDirection: 'row' as const, gap: spacing.md },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      alignItems: 'center' as const,
      gap: 4,
    },
    statValue: { fontSize: 28, fontWeight: '900' as const, color: colors.accent },
    statLabel: { fontSize: 12, color: colors.textMuted, textAlign: 'center' as const },
    errorCard: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
    errorText: { color: colors.error, fontWeight: '800' as const },
    loadingRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center' as const,
      marginTop: spacing.sm,
    },
    primaryBtnText: { color: colors.onAccent, fontWeight: '900' as const },
    footer: {
      color: colors.textMuted,
      textAlign: 'center' as const,
      lineHeight: 20,
      marginTop: spacing.sm,
    },
    footerLink: { color: colors.accent, fontWeight: '800' as const },
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

  const { stats: streakStats, loading: streakLoading, reload: reloadStreaks } =
    useStreakStats(user?.id);
  const {
    detail: dayDetail,
    loading: dayLoading,
    error: dayError,
  } = useDayDetail(user?.id, selectedDate);

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

  const stats = historyStats(days);
  const showCalendar = !loading && !error && !streakLoading && streakStats;
  const hasWeekly =
    weekly &&
    (weekly.scheduledExpected > 0 || weekly.prnTaken > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.headerCard}>
          <Text style={styles.h1}>History</Text>
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
          <StreakConsistencyCalendar
            days={streakStats!.consistencyCalendar}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        ) : null}

        {showCalendar && selectedDate ? (
          <DayAdherenceDetail
            detail={dayDetail}
            loading={dayLoading}
            error={dayError}
            streakStatus={selectedStreakStatus}
            showHistoryLink={false}
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
