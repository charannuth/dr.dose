import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { rescheduleAllReminders } from '../../lib/reminders';
import { useAuth } from '../../hooks/useAuth';
import { useDoctorVisitsCalendarData } from '../../hooks/useDoctorVisitsCalendarData';
import { DoctorVisitsPanel } from '../../components/doctorVisits/DoctorVisitsPanel';
import { TrackingCalendar } from '../../components/tracking/TrackingCalendar';
import { todayLocalDate } from '../../lib/dates';
import { routes } from '../../lib/routes';
import { CALENDAR_SOURCE_ALL } from '../../lib/tracking/calendarSources';
import type { CalendarSourceMeta } from '../../lib/tracking/calendarSources';
import type { CalendarViewRange } from '../../lib/tracking/calendarRange';

const DOCTOR_VISITS_SOURCE_OPTIONS: CalendarSourceMeta[] = [
  {
    id: CALENDAR_SOURCE_ALL,
    label: 'Doctor visits',
    support: 'full',
  },
];

export default function DoctorVisitsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeScreenStyles);
  const today = todayLocalDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarAnchor, setCalendarAnchor] = useState(today);
  const [calendarRange, setCalendarRange] = useState<CalendarViewRange>('month');
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: calendarData,
    loading: calendarLoading,
    error: calendarError,
    reload: reloadCalendar,
  } = useDoctorVisitsCalendarData(user?.id, calendarRange, calendarAnchor, calendarRefreshKey);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setCalendarAnchor(date);
  }

  const bumpCalendarRefresh = useCallback(() => {
    setCalendarRefreshKey((k) => k + 1);
  }, []);

  const handleDataMutated = useCallback(() => {
    bumpCalendarRefresh();
    if (user?.id) {
      void rescheduleAllReminders(user.id).catch(() => {
        /* ignore — visit saved; reminders resync on next app open */
      });
    }
  }, [bumpCalendarRefresh, user?.id]);

  async function onRefresh() {
    setRefreshing(true);
    await reloadCalendar();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View style={styles.headerCard}>
          <Text style={styles.h1}>Doctor visits</Text>
          <Text style={styles.sub}>
            Schedule upcoming appointments and save notes after your visit — for your own records,
            not a clinical chart.
          </Text>
          <Pressable style={styles.linkBtn} onPress={() => router.push(routes.wellness)}>
            <Text style={styles.linkBtnText}>Prepare wellness report</Text>
          </Pressable>
        </View>

        {calendarError ? <Text style={styles.errorText}>{calendarError}</Text> : null}

        <View style={styles.calendarCard}>
          <TrackingCalendar
            today={today}
            anchor={calendarAnchor}
            range={calendarRange}
            source={CALENDAR_SOURCE_ALL}
            selectedDate={selectedDate}
            enabledTrackers={[]}
            data={calendarData}
            loading={calendarLoading}
            sourceOptions={DOCTOR_VISITS_SOURCE_OPTIONS}
            hideOverviewHint
            onAnchorChange={setCalendarAnchor}
            onRangeChange={setCalendarRange}
            onSourceChange={() => {}}
            onSelectDate={handleSelectDate}
          />
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.sectionTitle}>Visit details</Text>
          <DoctorVisitsPanel
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onDataMutated={handleDataMutated}
          />
        </View>

        <Text style={styles.footerHint}>
          For symptoms and daily check-ins, use Wellness from the menu — you can share a doctor
          report from there.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeScreenStyles(colors: ColorPalette) {
  return {
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
    calendarCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    panelCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    h1: { fontSize: 22, fontWeight: '900' as const, color: colors.text },
    sub: { color: colors.textMuted, lineHeight: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '900' as const, color: colors.text, marginBottom: spacing.xs },
    linkBtn: {
      alignSelf: 'flex-start' as const,
      marginTop: spacing.xs,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    linkBtnText: { color: colors.accent, fontWeight: '700' as const, fontSize: 14 },
    errorText: {
      color: colors.error,
      backgroundColor: colors.errorBg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.errorBorder,
    },
    footerHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  };
}
