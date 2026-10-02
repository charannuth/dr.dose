import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useWellnessPageData } from '../../hooks/useWellnessPageData';
import { useWellnessMedBriefings } from '../../hooks/useWellnessMedBriefings';
import { WellnessDisclaimer } from '../../components/WellnessDisclaimer';
import { WellnessTrendsSection } from '../../components/wellness/WellnessTrendsSection';
import { PrnInsightsSection } from '../../components/wellness/PrnInsightsSection';
import { WellnessExportReport } from '../../components/wellness/WellnessExportReport';
import { WellnessMedBriefings } from '../../components/wellness/WellnessMedBriefings';
import { MedicalSourcesCard } from '../../components/MedicalSourcesCard';
import { CollapsibleSection } from '../../components/forms/CollapsibleSection';
import { TrackingCalendar } from '../../components/tracking/TrackingCalendar';
import { fetchWellnessLogsForDates, formatWellnessLogSummary, logFromRow, type WellnessLog } from '../../lib/wellness';
import { buildWellnessCalendarData } from '../../lib/wellnessCalendar';
import { getCalendarWindow, type CalendarViewRange } from '../../lib/tracking/calendarRange';
import type { CalendarSourceMeta } from '../../lib/tracking/calendarSources';
import { todayLocalDate } from '../../lib/dates';
import { tryNormalizeIsoDate } from '../../lib/isoDateInput';
import { routes } from '../../lib/routes';

const WELLNESS_SOURCE: CalendarSourceMeta[] = [{ id: 'all', label: 'Wellness', support: 'full' }];
export default function WellnessScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <WellnessOverview key={user.id} userId={user.id} userEmail={user.email} />;
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarLogs, setCalendarLogs] = useState<WellnessLog[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { setRefreshKey((key) => key + 1); }, []));
  useEffect(() => { setSelectedDate(initialDate); setAnchor(initialDate); }, [initialDate]);
  const { profileDraft, trendLogs, reportLogs, prnInsights, activeMeds, pageLoading, error } = useWellnessPageData(userId, selectedDate, refreshKey);
  const { entries: briefingEntries } = useWellnessMedBriefings(activeMeds);
  const window = useMemo(() => getCalendarWindow(anchor, range), [anchor, range]);
  useEffect(() => {
    let active = true;
    setCalendarLoading(true); setCalendarError(null);
    fetchWellnessLogsForDates(userId, window.dates).then((logs) => { if (active) setCalendarLogs(logs); })
      .catch((err) => { if (active) { setCalendarLogs([]); setCalendarError(err instanceof Error ? err.message : 'Could not load the calendar.'); } })
      .finally(() => { if (active) setCalendarLoading(false); });
    return () => { active = false; };
  }, [userId, window, refreshKey]);
  useEffect(() => { if (!pageLoading && !calendarLoading) setRefreshing(false); }, [pageLoading, calendarLoading]);
  const calendarData = useMemo(() => buildWellnessCalendarData(calendarLogs), [calendarLogs]);
  const selectedLog = calendarLogs.find((log) => log.log_date === selectedDate);
  function select(date: string) { setSelectedDate(date); if (date < window.start || date > window.end) setAnchor(date); }
  function openLog() { router.push({ pathname: routes.wellnessEntry, params: { date: selectedDate } }); }
  return <SafeAreaView style={s.safe} edges={['bottom']}>
    <Drawer.Screen options={{ headerRight: () => <Pressable style={s.add} disabled={selectedDate > today} onPress={openLog} accessibilityRole="button" accessibilityLabel={`Log wellness for ${selectedDate}`} accessibilityState={{ disabled: selectedDate > today }}><Text style={[s.plus, selectedDate > today && { opacity: 0.35 }]}>+</Text></Pressable> }} />
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setRefreshKey((key) => key + 1); }} />}>
      <View style={s.intro}><Text style={s.title}>Your daily wellbeing</Text><Text style={s.hint}>Select a day, then tap + to add or update your check-in.</Text></View>
      {error || calendarError ? <Text style={s.error} accessibilityRole="alert">{error || calendarError}</Text> : null}
      <TrackingCalendar today={today} anchor={anchor} range={range} source="all" selectedDate={selectedDate} enabledTrackers={[]} sourceOptions={WELLNESS_SOURCE} hideOverviewHint hideDaySummary
        data={calendarData} loading={calendarLoading} onAnchorChange={(date) => { setAnchor(date); setSelectedDate(date); }} onRangeChange={setRange} onSourceChange={() => {}} onSelectDate={select} />
      <Pressable style={s.summary} onPress={openLog} disabled={calendarLoading || !!calendarError || selectedDate > today} accessibilityRole="button">
        <View style={s.row}><Text style={s.sectionTitle}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text><Text style={s.link}>{selectedDate <= today ? selectedLog ? 'Edit ›' : 'Add ›' : ''}</Text></View>
        {calendarLoading ? <ActivityIndicator /> : <Text style={s.hint}>{selectedDate > today ? 'Daily logs become available on this date.' : selectedLog ? formatWellnessLogSummary(logFromRow(selectedLog)) || 'Notes saved' : 'No check-in yet. A few details are enough to get started.'}</Text>}
      </Pressable>
      <Pressable style={s.baseline} onPress={() => router.push(routes.wellnessBaseline)} accessibilityRole="button"><View style={{ flex: 1, gap: 5 }}><Text style={s.sectionTitle}>Your baseline</Text><Text style={s.hint}>{pageLoading ? 'Loading your usual patterns…' : [profileDraft.usual_bedtime && `Bed ${profileDraft.usual_bedtime}`, profileDraft.usual_wake_time && `Wake ${profileDraft.usual_wake_time}`, `${profileDraft.symptom_focus.length} tracked symptoms`].filter(Boolean).join(' · ')}</Text></View><Text style={s.link}>Edit ›</Text></Pressable>
      {pageLoading ? <ActivityIndicator accessibilityLabel="Refreshing wellness insights" /> : <>
        <CollapsibleSection title="Trends & insights" summary="Sleep, energy, and as-needed medication use"><View style={s.section}><WellnessTrendsSection trendLogs={trendLogs} /><PrnInsightsSection insights={prnInsights} /></View></CollapsibleSection>
        <CollapsibleSection title="Doctor report" summary="Review and share your recent wellbeing"><WellnessExportReport userEmail={userEmail} profile={profileDraft} medications={activeMeds} reportLogs={reportLogs} prnInsights={prnInsights} briefingEntries={briefingEntries} /></CollapsibleSection>
        <CollapsibleSection title="Medication guidance" summary="Information about your current medications"><WellnessMedBriefings medications={activeMeds} /></CollapsibleSection>
      </>}
      <CollapsibleSection title="Sources & information"><MedicalSourcesCard /></CollapsibleSection>
      <WellnessDisclaimer compact />
    </ScrollView>
  </SafeAreaView>;
}
function makeStyles(c: ColorPalette) {
  return { safe: { flex: 1, backgroundColor: c.bg }, content: { padding: 16, paddingBottom: 36, gap: 16 }, intro: { gap: 7, paddingTop: 8 },
    title: { fontFamily: fonts.heading, fontSize: 24, color: c.text }, hint: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 20, color: c.textMuted },
    add: { minWidth: 44, minHeight: 44, marginRight: 12, alignItems: 'center' as const, justifyContent: 'center' as const }, plus: { color: c.accent, fontSize: 32, fontWeight: '300' as const },
    summary: { backgroundColor: c.surface, borderRadius: 18, padding: 18, gap: 10 }, row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    sectionTitle: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 16, color: c.text }, link: { fontFamily: fonts.bodySemibold, color: c.accent, fontSize: 14 },
    baseline: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderColor: c.border }, section: { gap: 14 }, error: { color: c.error, fontSize: 14, lineHeight: 21 } };
}
