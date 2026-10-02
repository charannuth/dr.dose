import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useDoctorVisitsCalendarData } from '../../hooks/useDoctorVisitsCalendarData';
import { DoctorVisitsPanel } from '../../components/doctorVisits/DoctorVisitsPanel';
import { DoctorMonthCalendar, type DoctorCalendarRange } from '../../components/doctorVisits/DoctorMonthCalendar';
import { getCalendarWindow } from '../../lib/tracking/calendarRange';
import { todayLocalDate } from '../../lib/dates';
import { routes } from '../../lib/routes';

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
  const { data, loading, error, reload } = useDoctorVisitsCalendarData(user?.id, calendarRange, calendarAnchor, refreshKey);
  function selectDate(date: string) {
    setSelectedDate(date);
    const visible = getCalendarWindow(calendarAnchor, calendarRange);
    if (date < visible.start || date > visible.end) setCalendarAnchor(date);
  }
  function openAppointment(id?: string) {
    router.push({ pathname: routes.doctorAppointment, params: { date: selectedDate, ...(id ? { id } : {}) } });
  }
  async function refresh() { setRefreshing(true); try { await reload(); } finally { setRefreshing(false); } }
  return <SafeAreaView style={s.safe} edges={['bottom']}>
    <Drawer.Screen options={{ headerRight: () => <Pressable style={s.add} onPress={() => openAppointment()} accessibilityRole="button" accessibilityLabel={`Add appointment on ${selectedDate}`}><Text style={s.plus}>+</Text></Pressable> }} />
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <DoctorMonthCalendar today={today} anchor={calendarAnchor} selectedDate={selectedDate} data={data} loading={loading}
        range={calendarRange} onRangeChange={setCalendarRange}
        onAnchorChange={(date) => { setCalendarAnchor(date); setSelectedDate(date); }} onSelectDate={selectDate} />
      <View style={s.agenda}>
        <DoctorVisitsPanel selectedDate={selectedDate} events={data.cells.get(selectedDate)?.events ?? []} loading={loading} onOpen={openAppointment} />
      </View>
      <Pressable style={s.report} onPress={() => router.push(routes.wellness)} accessibilityRole="button"><Text style={s.link}>Prepare wellness report ›</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
function makeStyles(c: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: c.bg }, content: { padding: 16, paddingBottom: 32, gap: 24 },
    add: { minHeight: 44, minWidth: 44, marginRight: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
    plus: { color: c.accent, fontSize: 32, fontWeight: '300' as const },
    agenda: { borderTopWidth: 1, borderColor: c.border, paddingTop: 20 },
    error: { color: c.error, fontSize: 14, lineHeight: 20 },
    report: { minHeight: 44, justifyContent: 'center' as const },
    link: { color: c.accent, fontFamily: fonts.bodyMedium, fontSize: 14 },
  };
}
