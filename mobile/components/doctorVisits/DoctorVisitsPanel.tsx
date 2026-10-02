import { Pressable, Text, View } from 'react-native';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { TrackingCalendarCell } from '../../lib/tracking/calendarTypes';

type Props = {
  selectedDate: string;
  events: TrackingCalendarCell['events'];
  loading: boolean;
  onOpen: (id: string) => void;
};

/** The calendar stays an agenda; editing belongs to the appointment screen. */
export function DoctorVisitsPanel({ selectedDate, events, loading, onOpen }: Props) {
  const s = useThemedStyles(makeStyles);
  return <View style={s.section}>
    <Text style={s.heading}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
    {!loading && !events.length ? <Text style={s.hint}>No appointments. Tap + above to add one for this day.</Text> : null}
    {!loading && events.length ? <View style={s.list}>{events.map((event, index) => <Pressable key={event.id}
      style={[s.row, index > 0 && s.separator]} accessibilityRole="button" accessibilityLabel={`Open ${event.label}`}
      onPress={() => onOpen(event.id.replace(/-followup$/, ''))}>
      <View style={s.marker} /><Text style={s.label}>{event.label}</Text><Text style={s.arrow}>›</Text>
    </Pressable>)}</View> : null}
  </View>;
}
function makeStyles(c: ColorPalette) {
  return {
    section: { gap: 12 }, heading: { fontFamily: fonts.heading, fontSize: 17, color: c.text },
    hint: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: c.textMuted },
    list: { backgroundColor: c.surface, borderRadius: 18, overflow: 'hidden' as const },
    row: { minHeight: 64, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 16 },
    separator: { borderTopWidth: 1, borderTopColor: c.border },
    marker: { width: 3, alignSelf: 'stretch' as const, borderRadius: 2, backgroundColor: c.accent },
    label: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22, color: c.text },
    arrow: { fontSize: 22, color: c.textMuted },
  };
}
