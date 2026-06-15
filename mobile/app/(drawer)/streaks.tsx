import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useStreakStats } from '../../hooks/useStreakStats';
import { routes } from '../../lib/routes';
import type { StreakStats } from '../../lib/streaks';
import { StreakCard } from '../../components/streaks/StreakCard';
import { StreakBadges } from '../../components/streaks/StreakBadges';

function emptyStats(): StreakStats {
  return {
    currentStreak: 0,
    longestStreak: 0,
    todayTaken: 0,
    todayExpected: 0,
    todayExtraLogs: 0,
    todayComplete: false,
    hasMedications: false,
    last7Days: [],
    consistencyCalendar: [],
  };
}

function makeStreakScreenStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
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
    h1: { fontSize: 22, fontWeight: '900', color: colors.text },
    sub: { color: colors.textMuted, lineHeight: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    errorCard: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
    errorText: { color: colors.error, fontWeight: '800' },
    loadingRow: { alignItems: 'center', padding: spacing.md },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    primaryBtnText: { color: colors.onAccent, fontWeight: '900' },
    footer: {
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: spacing.sm,
    },
    footerLink: { color: colors.accent, fontWeight: '800' },
  });
}

export default function StreaksScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStreakScreenStyles(colors), [colors]);
  const { user } = useAuth();
  const router = useRouter();
  const { stats, loading, error, reload } = useStreakStats(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.headerCard}>
          <Text style={styles.h1}>Streaks</Text>
          <Text style={styles.sub}>
            Current streak, tulip badges, and what it takes to earn each one.
          </Text>
        </View>

        {error ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <StreakCard stats={stats ?? emptyStats()} loading={loading} />

        {!loading && stats ? (
          <>
            <StreakBadges longestStreak={stats.longestStreak} />

            {!stats.hasMedications ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Get started</Text>
                <Text style={styles.sub}>
                  Add medications with dose times on Today to start tracking streaks.
                </Text>
                <Pressable style={styles.primaryBtn} onPress={() => router.push(routes.today)}>
                  <Text style={styles.primaryBtnText}>Go to Today</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        <Text style={styles.footer}>
          Tap days on{' '}
          <Text style={styles.footerLink} onPress={() => router.push(routes.history)}>
            History
          </Text>{' '}
          to see doses logged, missed slots, and wellness notes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
