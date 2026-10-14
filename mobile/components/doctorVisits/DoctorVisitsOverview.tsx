import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { fonts, radii, spacing, withAlpha, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { tapFeedback } from '../../lib/haptics';
import { formatAppointmentTypeLabel, type DoctorVisit } from '../../lib/doctorVisits';
import { locationAction, relativeVisitDay, type VisitsOverview } from '../../lib/doctorVisitsOverview';

const PAST_PREVIEW = 3;

function shortDate(date: string, withYear = false): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

function providerOf(v: DoctorVisit): string {
  return v.provider_name?.trim() || v.specialty?.trim() || formatAppointmentTypeLabel(v.appointment_type) || 'Doctor visit';
}

/** "Telehealth · Cardiology", without repeating what the title already says. */
function detailOf(v: DoctorVisit): string {
  const title = providerOf(v);
  const parts = [formatAppointmentTypeLabel(v.appointment_type), v.specialty?.trim()].filter(
    (p): p is string => Boolean(p) && p !== title,
  );
  return parts.join(' · ');
}

function DateBadge({ date, tint }: { date: string; tint: string }) {
  const s = useThemedStyles(makeStyles);
  const { isDark } = useTheme();
  const d = new Date(`${date}T12:00:00`);
  return (
    <View style={[s.badge, { backgroundColor: withAlpha(tint, isDark ? 0.18 : 0.12) }]}>
      <Text style={[s.badgeMonth, { color: tint }]}>{d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
      <Text style={s.badgeDay}>{d.getDate()}</Text>
    </View>
  );
}

function VisitRow({ visit, today, tint, onOpen, first }: { visit: DoctorVisit; today: string; tint: string; onOpen: (id: string) => void; first: boolean }) {
  const s = useThemedStyles(makeStyles);
  const when = [relativeVisitDay(visit.visit_date, today), visit.visit_time?.trim()].filter(Boolean).join(' · ');
  const detail = detailOf(visit);
  return (
    <Pressable
      style={[s.row, !first && s.separator]}
      onPress={() => onOpen(visit.id)}
      accessibilityRole="button"
      accessibilityLabel={`${providerOf(visit)}, ${shortDate(visit.visit_date)}${visit.visit_time ? ` at ${visit.visit_time}` : ''}`}
    >
      <DateBadge date={visit.visit_date} tint={tint} />
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>{providerOf(visit)}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>{detail ? `${when} · ${detail}` : when}</Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}

/**
 * The top of Doctor visits: your next appointment front and center, anything
 * that needs a nudge (notes to add, a follow-up to book), then the rest of
 * your upcoming and recent visits as a simple list.
 */
export function DoctorVisitsOverview({
  overview,
  today,
  loading,
  onOpen,
  onAdd,
}: {
  overview: VisitsOverview;
  today: string;
  loading: boolean;
  onOpen: (id: string) => void;
  onAdd: (date?: string) => void;
}) {
  const s = useThemedStyles(makeStyles);
  const { colors, isDark } = useTheme();
  const [showAllPast, setShowAllPast] = useState(false);
  const { next, upcoming, needsNotes, past, followUps } = overview;

  if (loading && !next && !past.length) {
    return <View style={[s.hero, s.heroEmpty]}><Text style={s.muted}>Loading your visits…</Text></View>;
  }

  const action = next ? locationAction(next.location) : null;
  const pastShown = showAllPast ? past : past.slice(0, PAST_PREVIEW);

  return (
    <View style={s.wrap}>
      {next ? (
        <Pressable
          style={[s.hero, { backgroundColor: withAlpha(colors.accentBlue, isDark ? 0.16 : 0.1) }]}
          onPress={() => onOpen(next.id)}
          accessibilityRole="button"
          accessibilityLabel={`Next visit: ${providerOf(next)}, ${relativeVisitDay(next.visit_date, today)}`}
        >
          <Text style={[s.eyebrow, { color: colors.accentBlue }]}>NEXT VISIT</Text>
          <Text style={s.heroWhen}>
            {relativeVisitDay(next.visit_date, today)}
            {next.visit_time?.trim() ? ` · ${next.visit_time.trim()}` : ''}
          </Text>
          <Text style={s.heroDate}>{shortDate(next.visit_date, next.visit_date.slice(0, 4) !== today.slice(0, 4))}</Text>
          <View style={s.heroDivider} />
          <Text style={s.heroProvider} numberOfLines={2}>{providerOf(next)}</Text>
          {detailOf(next) ? <Text style={s.muted}>{detailOf(next)}</Text> : null}
          {next.location?.trim() ? <Text style={s.heroLine} numberOfLines={2}>📍 {next.location.trim()}</Text> : null}
          {next.reason?.trim() ? <Text style={s.heroLine} numberOfLines={3}>📝 {next.reason.trim()}</Text> : null}
          <View style={s.heroActions}>
            {action ? (
              <Pressable
                style={[s.pill, { backgroundColor: colors.accentBlue }]}
                onPress={() => {
                  tapFeedback();
                  void Linking.openURL(action.url);
                }}
                accessibilityRole="link"
              >
                <Text style={s.pillText}>{action.kind === 'link' ? 'Join visit' : 'Directions'}</Text>
              </Pressable>
            ) : null}
            <View style={[s.pill, s.pillGhost]}>
              <Text style={[s.pillGhostText, { color: colors.accentBlue }]}>View details</Text>
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={[s.hero, s.heroEmpty]}>
          <Text style={s.emptyEmoji}>🩺</Text>
          <Text style={s.heroProvider}>No upcoming visits</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>
            Add your next appointment and we'll keep the details and a reminder in one place.
          </Text>
          <Pressable style={[s.pill, { backgroundColor: colors.accent, marginTop: 4 }]} onPress={() => onAdd()} accessibilityRole="button">
            <Text style={s.pillText}>Add a visit</Text>
          </Pressable>
        </View>
      )}

      {followUps.map(({ visit, date }) => {
        const overdue = date < today;
        return (
          <Pressable key={`fu-${visit.id}`} style={[s.nudge, { borderColor: withAlpha(colors.accentAmber, 0.45) }]} onPress={() => onAdd(date < today ? today : date)} accessibilityRole="button">
            <Text style={s.nudgeEmoji}>📅</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.nudgeTitle}>Book your follow-up with {providerOf(visit)}</Text>
              <Text style={s.muted}>{overdue ? `It was due ${relativeVisitDay(date, today).toLowerCase()}.` : `Due ${shortDate(date)} (${relativeVisitDay(date, today).toLowerCase()}).`}</Text>
            </View>
            <Text style={[s.nudgeAction, { color: colors.accentAmber }]}>Add</Text>
          </Pressable>
        );
      })}

      {needsNotes.slice(0, 2).map((visit) => (
        <Pressable key={`notes-${visit.id}`} style={[s.nudge, { borderColor: withAlpha(colors.accentPurple, 0.45) }]} onPress={() => onOpen(visit.id)} accessibilityRole="button">
          <Text style={s.nudgeEmoji}>✍️</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.nudgeTitle}>How did it go with {providerOf(visit)}?</Text>
            <Text style={s.muted}>Jot down what was said while it's fresh ({relativeVisitDay(visit.visit_date, today).toLowerCase()}).</Text>
          </View>
          <Text style={[s.nudgeAction, { color: colors.accentPurple }]}>Add notes</Text>
        </Pressable>
      ))}

      {upcoming.length ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Coming up</Text>
          <View style={s.list}>
            {upcoming.map((v, i) => <VisitRow key={v.id} visit={v} today={today} tint={colors.accentBlue} onOpen={onOpen} first={i === 0} />)}
          </View>
        </View>
      ) : null}

      {past.length ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Past visits</Text>
          <View style={s.list}>
            {pastShown.map((v, i) => <VisitRow key={v.id} visit={v} today={today} tint={colors.textMuted} onOpen={onOpen} first={i === 0} />)}
          </View>
          {past.length > PAST_PREVIEW ? (
            <Pressable onPress={() => { tapFeedback(); setShowAllPast((v) => !v); }} accessibilityRole="button" style={s.more}>
              <Text style={s.moreText}>{showAllPast ? 'Show fewer' : `Show all ${past.length}`}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    wrap: { gap: 14 },
    hero: { borderRadius: radii.lg, padding: spacing.lg, gap: 4 },
    heroEmpty: { backgroundColor: c.surface, alignItems: 'center' as const, gap: 8, paddingVertical: 28 },
    eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4 },
    heroWhen: { fontFamily: fonts.heading, fontSize: 28, color: c.text, marginTop: 4 },
    heroDate: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.textMuted },
    heroDivider: { height: 1, backgroundColor: withAlpha(c.textMuted, 0.2), marginVertical: 10 },
    heroProvider: { fontFamily: fonts.bodySemibold, fontSize: 18, color: c.text },
    heroLine: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 20, color: c.text, marginTop: 4 },
    heroActions: { flexDirection: 'row' as const, gap: 10, marginTop: 14, flexWrap: 'wrap' as const },
    pill: { minHeight: 40, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center' as const, justifyContent: 'center' as const },
    pillText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: '#fff' },
    pillGhost: { borderWidth: 1, borderColor: withAlpha(c.textMuted, 0.3) },
    pillGhostText: { fontFamily: fonts.bodySemibold, fontSize: 14 },
    emptyEmoji: { fontSize: 32 },
    muted: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
    nudge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      padding: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    nudgeEmoji: { fontSize: 20 },
    nudgeTitle: { fontFamily: fonts.bodySemibold, fontSize: 14, lineHeight: 20, color: c.text },
    nudgeAction: { fontFamily: fonts.bodySemibold, fontSize: 13 },
    section: { gap: 10, marginTop: 6 },
    sectionTitle: { fontFamily: fonts.heading, fontSize: 17, color: c.text },
    list: { backgroundColor: c.surface, borderRadius: radii.lg, overflow: 'hidden' as const },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 64 },
    separator: { borderTopWidth: 1, borderTopColor: c.border },
    badge: { width: 46, height: 50, borderRadius: radii.md, alignItems: 'center' as const, justifyContent: 'center' as const },
    badgeMonth: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8 },
    badgeDay: { fontFamily: fonts.heading, fontSize: 19, color: c.text },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.text },
    rowMeta: { fontFamily: fonts.bodyRegular, fontSize: 13, color: c.textMuted },
    chevron: { fontSize: 22, color: c.textMuted },
    more: { alignSelf: 'flex-start' as const, minHeight: 36, justifyContent: 'center' as const },
    moreText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.accent },
  };
}
