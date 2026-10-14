import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { fonts, radii, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useWellnessPageData } from '../../hooks/useWellnessPageData';
import { useWellnessMedBriefings } from '../../hooks/useWellnessMedBriefings';
import { WellnessDisclaimer } from '../../components/WellnessDisclaimer';
import { WellnessTrendsSection } from '../../components/wellness/WellnessTrendsSection';
import { PrnInsightsSection } from '../../components/wellness/PrnInsightsSection';
import { WellnessExportReport } from '../../components/wellness/WellnessExportReport';
import { WellnessMedBriefings } from '../../components/wellness/WellnessMedBriefings';
import { WellnessMoreSheet } from '../../components/wellness/WellnessMoreSheet';
import { WellnessWeekCard } from '../../components/wellness/WellnessWeekCard';
import { MedicalSourcesCard } from '../../components/MedicalSourcesCard';
import { TrackingCalendar } from '../../components/tracking/TrackingCalendar';
import { CycleDayStrip } from '../../components/tracking/CycleDayStrip';
import { fetchWellnessLogsForDates, formatWellnessLogSummary, logFromRow, type WellnessLog } from '../../lib/wellness';
import { buildWellnessCalendarData } from '../../lib/wellnessCalendar';
import { buildWeekStats, buildWellnessInsights } from '../../lib/wellnessSummary';
import { getCalendarWindow, type CalendarViewRange } from '../../lib/tracking/calendarRange';
import type { CalendarSourceMeta } from '../../lib/tracking/calendarSources';
import { addDaysToDateString, todayLocalDate } from '../../lib/dates';
import { tapFeedback } from '../../lib/haptics';
import { tryNormalizeIsoDate } from '../../lib/isoDateInput';
import { routes } from '../../lib/routes';
import { AmbientScrollView } from '../../components/AmbientBackground';

const WELLNESS_SOURCE: CalendarSourceMeta[] = [{ id: 'all', label: 'Wellness', support: 'full' }];
/** The week strip shows the selected day ±14 days; reload logs when the user strays past this. */
const STRIP_REACH = 10;

export default function WellnessScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <WellnessOverview key={user.id} userId={user.id} userEmail={user.email} />;
}

function stripDates(center: string): string[] {
  return Array.from({ length: 29 }, (_, i) => addDaysToDateString(center, i - 14));
}

function WellnessOverview({ userId, userEmail }: { userId: string; userEmail?: string }) {
  const s = useThemedStyles(makeStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ wellnessDate?: string }>();
  const today = todayLocalDate();
  const initialDate = tryNormalizeIsoDate(typeof params.wellnessDate === 'string' ? params.wellnessDate : '') || today;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [anchor, setAnchor] = useState(initialDate);
  const [range, setRange] = useState<CalendarViewRange>('month');
  const [showMonth, setShowMonth] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarLogs, setCalendarLogs] = useState<WellnessLog[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { setRefreshKey((key) => key + 1); }, []));
  useEffect(() => { setSelectedDate(initialDate); setAnchor(initialDate); }, [initialDate]);
  const { profileDraft, trendLogs, reportLogs, prnInsights, activeMeds, pageLoading, error } = useWellnessPageData(userId, selectedDate, refreshKey);
  const { entries: briefingEntries } = useWellnessMedBriefings(activeMeds);

  // Month view loads its grid; the default week strip loads the days around the anchor.
  const window = useMemo(() => getCalendarWindow(anchor, range), [anchor, range]);
  const dates = useMemo(() => (showMonth ? window.dates : stripDates(anchor)), [showMonth, window, anchor]);
  useEffect(() => {
    let active = true;
    setCalendarLoading(true); setCalendarError(null);
    fetchWellnessLogsForDates(userId, dates).then((logs) => { if (active) setCalendarLogs(logs); })
      .catch((err) => { if (active) { setCalendarLogs([]); setCalendarError(err instanceof Error ? err.message : 'Could not load your check-ins.'); } })
      .finally(() => { if (active) setCalendarLoading(false); });
    return () => { active = false; };
  }, [userId, dates, refreshKey]);
  useEffect(() => { if (!pageLoading && !calendarLoading) setRefreshing(false); }, [pageLoading, calendarLoading]);

  const calendarData = useMemo(() => buildWellnessCalendarData(calendarLogs), [calendarLogs]);
  const loggedDates = useMemo(() => new Set(calendarLogs.map((l) => l.log_date)), [calendarLogs]);
  const stats = useMemo(() => buildWeekStats(trendLogs, today), [trendLogs, today]);
  const insights = useMemo(() => buildWellnessInsights(trendLogs, prnInsights, today), [trendLogs, prnInsights, today]);
  const selectedLog = calendarLogs.find((log) => log.log_date === selectedDate);
  const isFuture = selectedDate > today;

  function select(date: string) {
    setSelectedDate(date);
    if (showMonth) {
      if (date < window.start || date > window.end) setAnchor(date);
    } else if (Math.abs(new Date(`${date}T12:00:00`).getTime() - new Date(`${anchor}T12:00:00`).getTime()) > STRIP_REACH * 86400000) {
      setAnchor(date);
    }
  }
  function openLog() { router.push({ pathname: routes.wellnessEntry, params: { date: selectedDate } }); }

  const baselineSummary = pageLoading
    ? 'Loading your usual patterns…'
    : [profileDraft.usual_bedtime && `Bed ${profileDraft.usual_bedtime}`, profileDraft.usual_wake_time && `Wake ${profileDraft.usual_wake_time}`, `${profileDraft.symptom_focus.length} tracked symptoms`].filter(Boolean).join(' · ');
  const dayTitle = selectedDate === today ? 'Today' : new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return <SafeAreaView style={s.safe} edges={['bottom']}>
    <Drawer.Screen options={{ headerRight: () => <Pressable style={s.add} disabled={isFuture} onPress={openLog} accessibilityRole="button" accessibilityLabel={`Log wellness for ${selectedDate}`} accessibilityState={{ disabled: isFuture }}><Text style={[s.plus, isFuture && { opacity: 0.35 }]}>+</Text></Pressable> }} />
    <AmbientScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setRefreshKey((key) => key + 1); }} />}>
      {error || calendarError ? <Text style={s.error} accessibilityRole="alert">{error || calendarError}</Text> : null}

      {pageLoading && trendLogs.length === 0 ? <ActivityIndicator accessibilityLabel="Loading your week" style={{ marginVertical: 24 }} /> : <WellnessWeekCard stats={stats} insights={insights} />}

      <View>
        <View style={s.row}>
          <Text style={s.sectionTitle}>Check-ins</Text>
          <Pressable onPress={() => { tapFeedback(); setShowMonth((v) => !v); if (!showMonth) setAnchor(selectedDate); }} accessibilityRole="button" hitSlop={8}>
            <Text style={s.link}>{showMonth ? 'Week' : 'Month'}</Text>
          </Pressable>
        </View>
        {showMonth ? (
          <TrackingCalendar today={today} anchor={anchor} range={range} source="all" selectedDate={selectedDate} enabledTrackers={[]} sourceOptions={WELLNESS_SOURCE} hideOverviewHint hideDaySummary
            data={calendarData} loading={calendarLoading} onAnchorChange={(date) => { setAnchor(date); setSelectedDate(date); }} onRangeChange={setRange} onSourceChange={() => {}} onSelectDate={select} />
        ) : (
          <CycleDayStrip selectedDate={selectedDate} today={today} onSelectDate={select} dayHasLog={(date) => loggedDates.has(date)} />
        )}
        <Pressable style={s.day} onPress={openLog} disabled={calendarLoading || !!calendarError || isFuture} accessibilityRole="button">
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.dayTitle}>{dayTitle}</Text>
            {calendarLoading ? <ActivityIndicator style={{ alignSelf: 'flex-start' }} /> : <Text style={s.hint} numberOfLines={2}>{isFuture ? 'Check-ins open on the day.' : selectedLog ? formatWellnessLogSummary(logFromRow(selectedLog)) || 'Notes saved' : 'No check-in yet. Tap to add one.'}</Text>}
          </View>
          {!isFuture ? <Text style={s.link}>{selectedLog ? 'Edit ›' : 'Add ›'}</Text> : null}
        </Pressable>
      </View>

      <Pressable style={s.more} onPress={() => { tapFeedback(); setMoreOpen(true); }} accessibilityRole="button" accessibilityLabel="More: detailed trends, doctor report, medication guidance, baseline and sources">
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.dayTitle}>More</Text>
          <Text style={s.hint} numberOfLines={1}>Detailed trends, doctor report, medication guidance, baseline</Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>
    </AmbientScrollView>

    <WellnessMoreSheet
      visible={moreOpen}
      onClose={() => setMoreOpen(false)}
      baselineSummary={baselineSummary}
      onEditBaseline={() => { setMoreOpen(false); router.push(routes.wellnessBaseline); }}
      sections={[
        { key: 'trends', title: 'Detailed trends', summary: 'Day-by-day charts and as-needed medication use', content: <View style={{ gap: 14 }}><WellnessTrendsSection trendLogs={trendLogs} /><PrnInsightsSection insights={prnInsights} /></View> },
        { key: 'report', title: 'Doctor report', summary: 'Review and share your recent wellbeing', content: <WellnessExportReport userEmail={userEmail} profile={profileDraft} medications={activeMeds} reportLogs={reportLogs} prnInsights={prnInsights} briefingEntries={briefingEntries} /> },
        { key: 'guidance', title: 'Medication guidance', summary: 'Information about your current medications', content: <WellnessMedBriefings medications={activeMeds} /> },
        { key: 'sources', title: 'Sources & information', content: <MedicalSourcesCard /> },
      ]}
      footer={<WellnessDisclaimer compact />}
    />
  </SafeAreaView>;
}

function makeStyles(c: ColorPalette) {
  return { safe: { flex: 1, backgroundColor: 'transparent' }, content: { padding: 16, paddingBottom: 36, gap: 18 },
    hint: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
    add: { minWidth: 44, minHeight: 44, marginRight: 12, alignItems: 'center' as const, justifyContent: 'center' as const }, plus: { color: c.accent, fontSize: 32, fontWeight: '300' as const },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    sectionTitle: { flex: 1, fontFamily: fonts.heading, fontSize: 18, color: c.text },
    day: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, backgroundColor: c.surface, borderRadius: radii.lg, padding: 16 },
    dayTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.text },
    link: { fontFamily: fonts.bodySemibold, color: c.accent, fontSize: 14 },
    more: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: c.border },
    chevron: { fontSize: 22, color: c.textMuted },
    error: { color: c.error, fontSize: 14, lineHeight: 21 } };
}
