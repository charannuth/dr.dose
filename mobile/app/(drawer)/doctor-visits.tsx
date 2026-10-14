import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { fonts, radii, type ColorPalette } from '../../constants/theme';
import { tapFeedback } from '../../lib/haptics';
import { fetchDoctorVisits, type DoctorVisit } from '../../lib/doctorVisits';
import { buildVisitsOverview } from '../../lib/doctorVisitsOverview';
import { DoctorVisitsOverview } from '../../components/doctorVisits/DoctorVisitsOverview';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useDoctorVisitsCalendarData } from '../../hooks/useDoctorVisitsCalendarData';
import { DoctorVisitsPanel } from '../../components/doctorVisits/DoctorVisitsPanel';
import { DoctorMonthCalendar, type DoctorCalendarRange } from '../../components/doctorVisits/DoctorMonthCalendar';
import { getCalendarWindow } from '../../lib/tracking/calendarRange';
import { todayLocalDate } from '../../lib/dates';
import { routes } from '../../lib/routes';
import { AmbientScrollView } from '../../components/AmbientBackground';

export default function DoctorVisitsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const s = useThemedStyles(makeStyles);
  const today = todayLocalDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarAnchor, setCalendarAnchor] = useState(today);
  const [calendarRange, setCalendarRange] = useState<DoctorCalendarRange>('month');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(useCallback(() => { setRefreshKey((key) => key + 1); }, []));
  const [showCalendar, setShowCalendar] = useState(false);
  const { data, loading, error, reload } = useDoctorVisitsCalendarData(showCalendar ? user?.id : undefined, calendarRange, calendarAnchor, refreshKey);
  const [visits, setVisits] = useState<DoctorVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const loadVisits = useCallback(async () => {
    if (!user?.id) return;
    try { setVisits(await fetchDoctorVisits(user.id, 200)); setVisitsError(null); }
    catch (err) { setVisitsError(err instanceof Error ? err.message : 'Could not load your visits.'); }
    finally { setVisitsLoading(false); }
  }, [user?.id]);
  useEffect(() => { void loadVisits(); }, [loadVisits, refreshKey]);
  const overview = useMemo(() => buildVisitsOverview(visits, today), [visits, today]);
  function selectDate(date: string) {
    setSelectedDate(date);
    const visible = getCalendarWindow(calendarAnchor, calendarRange);
    if (date < visible.start || date > visible.end) setCalendarAnchor(date);
  }
  function openAppointment(id?: string, date = showCalendar ? selectedDate : today) {
    router.push({ pathname: routes.doctorAppointment, params: { date, ...(id ? { id } : {}) } });
  }
  async function refresh() {
    setRefreshing(true);
    try { await Promise.all([loadVisits(), showCalendar ? reload() : Promise.resolve()]); } finally { setRefreshing(false); }
  }
  const shownError = visitsError ?? (showCalendar ? error : null);
  return <SafeAreaView style={s.safe} edges={['bottom']}>
    <Drawer.Screen options={{ headerRight: () => <Pressable style={s.add} onPress={() => openAppointment()} accessibilityRole="button" accessibilityLabel="Add appointment"><Text style={s.plus}>+</Text></Pressable> }} />
    <AmbientScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      {shownError ? <Text accessibilityRole="alert" style={s.error}>{shownError}</Text> : null}
      <DoctorVisitsOverview overview={overview} today={today} loading={visitsLoading} onOpen={(id) => openAppointment(id)} onAdd={(date) => openAppointment(undefined, date ?? today)} />
      <View style={s.calendarCard}>
        <Pressable style={s.calendarToggle} onPress={() => { tapFeedback(); setShowCalendar((v) => !v); }} accessibilityRole="button" accessibilityState={{ expanded: showCalendar }}>
          <Text style={s.calendarIcon}>🗓️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.calendarTitle}>Calendar</Text>
            <Text style={s.calendarHint}>{showCalendar ? 'Tap a day to see or add visits' : 'See all your visits by month'}</Text>
          </View>
          <Text style={s.calendarChevron}>{showCalendar ? '⌃' : '⌄'}</Text>
        </Pressable>
        {showCalendar ? <View style={s.calendarBody}>
          <DoctorMonthCalendar today={today} anchor={calendarAnchor} selectedDate={selectedDate} data={data} loading={loading}
            range={calendarRange} onRangeChange={setCalendarRange}
            onAnchorChange={(date) => { setCalendarAnchor(date); setSelectedDate(date); }} onSelectDate={selectDate} />
          <View style={s.agenda}>
            <DoctorVisitsPanel selectedDate={selectedDate} events={data.cells.get(selectedDate)?.events ?? []} loading={loading} onOpen={(id) => openAppointment(id)} />
          </View>
        </View> : null}
      </View>
      <Pressable style={s.report} onPress={() => router.push(routes.medicalRecords)} accessibilityRole="button">
        <Text style={s.reportEmoji}>📋</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.calendarTitle}>Prepare for your visit</Text>
          <Text style={s.calendarHint}>Share your history, medications and recent check-ins</Text>
        </View>
        <Text style={s.calendarChevron}>›</Text>
      </Pressable>
    </AmbientScrollView>
  </SafeAreaView>;
}
function makeStyles(c: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: 'transparent' }, content: { padding: 16, paddingBottom: 32, gap: 16 },
    add: { minHeight: 44, minWidth: 44, marginRight: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
    plus: { color: c.accent, fontSize: 32, fontWeight: '300' as const },
    agenda: { borderTopWidth: 1, borderColor: c.border, paddingTop: 20 },
    calendarCard: { backgroundColor: c.surface, borderRadius: radii.lg, overflow: 'hidden' as const },
    calendarToggle: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 16, minHeight: 64 },
    calendarIcon: { fontSize: 20 }, reportEmoji: { fontSize: 20 },
    calendarTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.text },
    calendarHint: { fontFamily: fonts.bodyRegular, fontSize: 13, color: c.textMuted, marginTop: 2 },
    calendarChevron: { fontSize: 20, color: c.textMuted },
    calendarBody: { paddingHorizontal: 12, paddingBottom: 16, gap: 20 },
    error: { color: c.error, fontSize: 14, lineHeight: 20 },
    report: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 16, minHeight: 64, backgroundColor: c.surface, borderRadius: radii.lg },
  };
}
