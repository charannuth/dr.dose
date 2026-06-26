import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useWellnessPageData } from '../../hooks/useWellnessPageData';
import { useWellnessMedBriefings } from '../../hooks/useWellnessMedBriefings';
import { WellnessBaselineForm } from '../../components/wellness/WellnessBaselineForm';
import { WellnessDailyForm } from '../../components/WellnessDailyForm';
import { WellnessDisclaimer } from '../../components/WellnessDisclaimer';
import { WellnessTrendsSection } from '../../components/wellness/WellnessTrendsSection';
import { PrnInsightsSection } from '../../components/wellness/PrnInsightsSection';
import { WellnessExportReport } from '../../components/wellness/WellnessExportReport';
import { WellnessMedBriefings } from '../../components/wellness/WellnessMedBriefings';
import { MedicalSourcesCard } from '../../components/MedicalSourcesCard';
import {
  formatWellnessLogSummary,
  isWellnessLogFilled,
  logFromRow,
  upsertWellnessLog,
  upsertWellnessProfile,
} from '../../lib/wellness';
import { formatDisplayDate, todayLocalDate } from '../../lib/dates';

function makeWellnessScreenStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
    loading: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.sm,
    },
    muted: { color: colors.textMuted },
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
    sectionTitle: { fontSize: 16, fontWeight: '900' as const, color: colors.text },
    errorCard: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
    errorText: { color: colors.error, fontWeight: '800' as const },
    success: { color: colors.success, fontWeight: '800' as const },
    dayRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    dayBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center' as const,
    },
    dayBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    dayBtnText: { fontWeight: '700' as const, color: colors.text, fontSize: 13 },
    dayBtnTextActive: { color: colors.onAccent },
    dayDot: { color: colors.success, fontSize: 8 },
    summary: { color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  };
}

export default function WellnessScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeWellnessScreenStyles);
  const { user } = useAuth();
  const params = useLocalSearchParams<{ wellnessDate?: string }>();
  const today = todayLocalDate();
  const [selectedDate, setSelectedDate] = useState(
    typeof params.wellnessDate === 'string' && params.wellnessDate
      ? params.wellnessDate
      : today,
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (typeof params.wellnessDate === 'string' && params.wellnessDate) {
      setSelectedDate(params.wellnessDate);
    }
  }, [params.wellnessDate]);

  const {
    weekDates,
    profileDraft,
    setProfileDraft,
    logDraft,
    setLogDraft,
    weekLogs,
    trendLogs,
    reportLogs,
    prnInsights,
    activeMeds,
    pageLoading,
    logLoading,
    error,
    setError,
    refreshWeekLogs,
  } = useWellnessPageData(user?.id, selectedDate);

  const { entries: briefingEntries } = useWellnessMedBriefings(activeMeds);

  const [profileBusy, setProfileBusy] = useState(false);
  const [logBusy, setLogBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const logByDate = new Map(weekLogs.map((l) => [l.log_date, l]));
  const trackedSymptoms = profileDraft.symptom_focus;

  async function handleSaveProfile() {
    if (!user) return;
    setProfileBusy(true);
    setProfileMessage(null);
    setError(null);
    try {
      await upsertWellnessProfile(user.id, profileDraft);
      setProfileMessage('Baseline saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save baseline');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleSaveLog() {
    if (!user) return;
    if (!isWellnessLogFilled(logDraft)) {
      setError('Add at least one field before saving this day.');
      return;
    }
    setLogBusy(true);
    setLogMessage(null);
    setError(null);
    try {
      await upsertWellnessLog(user.id, logDraft);
      setLogMessage(`Saved ${formatDisplayDate(logDraft.log_date)}.`);
      await refreshWeekLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save log');
    } finally {
      setLogBusy(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refreshWeekLogs();
    } finally {
      setRefreshing(false);
    }
  }

  if (pageLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.muted}>Loading wellness…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.headerCard}>
          <Text style={styles.h1}>Wellness</Text>
          <Text style={styles.sub}>
            Track daily experiences to share with your doctor — not a substitute for medical care.
          </Text>
        </View>

        <WellnessDisclaimer />

        {error ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <WellnessExportReport
          userEmail={user?.email}
          profile={profileDraft}
          medications={activeMeds}
          reportLogs={reportLogs}
          prnInsights={prnInsights}
          briefingEntries={briefingEntries}
        />

        <PrnInsightsSection insights={prnInsights} />

        <WellnessTrendsSection trendLogs={trendLogs} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your baseline</Text>
          <WellnessBaselineForm
            value={profileDraft}
            onChange={setProfileDraft}
            onSubmit={() => void handleSaveProfile()}
            busy={profileBusy}
          />
          {profileMessage ? <Text style={styles.success}>{profileMessage}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Daily log — {formatDisplayDate(selectedDate)}
          </Text>
          {logLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <WellnessDailyForm
              value={logDraft}
              onChange={setLogDraft}
              onSubmit={() => void handleSaveLog()}
              busy={logBusy}
              submitLabel={`Save ${selectedDate === today ? 'Today' : selectedDate}`}
              trackedSymptoms={trackedSymptoms}
            />
          )}
          {logMessage ? <Text style={styles.success}>{logMessage}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Last 7 days</Text>
          <View style={styles.dayRow}>
            {weekDates.map((date) => {
              const log = logByDate.get(date);
              const filled = log && isWellnessLogFilled(logFromRow(log));
              return (
                <Pressable
                  key={date}
                  style={[styles.dayBtn, selectedDate === date && styles.dayBtnActive]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text
                    style={[styles.dayBtnText, selectedDate === date && styles.dayBtnTextActive]}
                  >
                    {date === today ? 'Today' : date.slice(5)}
                  </Text>
                  {filled ? <Text style={styles.dayDot}>●</Text> : null}
                </Pressable>
              );
            })}
          </View>
          {logByDate.get(selectedDate) && isWellnessLogFilled(logFromRow(logByDate.get(selectedDate)!)) ? (
            <Text style={styles.summary}>
              {formatWellnessLogSummary(logFromRow(logByDate.get(selectedDate)!))}
            </Text>
          ) : null}
        </View>

        <WellnessMedBriefings medications={activeMeds} />

        <MedicalSourcesCard />
      </ScrollView>
    </SafeAreaView>
  );
}
