import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { routes } from '../../lib/routes';
import { STREAK_CALENDAR_DAYS } from '../../lib/streaks';
import { LegalLinks } from '../../components/LegalLinks';
import { MedicalSourcesCard } from '../../components/MedicalSourcesCard';
import { CollapsibleSection } from '../../components/forms/CollapsibleSection';
import { NavigationRow } from '../../components/forms/NavigationRow';
import { fonts, type ColorPalette } from '../../constants/theme';

const TOPICS = [
  { title: 'Customize Quick view', summary: 'Choose, resize and arrange your widgets', body: 'On Today, open Edit Quick view. Choose the information you want to see, select Compact or Detailed, and move widgets into your preferred order. Save to keep the layout.', action: 'Open Today', route: routes.today },
  { title: 'Log a dose or correct a mistake', summary: 'Scheduled doses, as-needed medications and undo', body: 'Mark each scheduled dose separately. Use Undo on a dose logged by mistake. History lets you select a day to review doses and wellness notes, and offers late logging where available. Logging is a record of what you took; it is not an instruction to take an additional dose.', action: 'Review dose history', route: routes.history },
  { title: 'Update a refill', summary: 'Remaining supply and medication details', body: 'Open Refills to choose a medication, update the remaining count, add refill quantity, or edit its details. You can also open it from the refill tile on Today.', action: 'Open Refills', route: routes.refills },
  { title: 'Reminders or timezone not right?', summary: 'Permissions, sounds and the app clock', body: 'In My account, open Reminders to enable alerts, choose a sound, or check scheduled reminders. If permission is denied, use Open iPhone Settings. Appearance & time contains the timezone selector. After traveling, open the app so reminders can update.', action: 'Open My account', route: routes.account },
  { title: 'Appointments and connected calendars', summary: 'Save a visit and optionally add a calendar copy', body: 'Select a date in Doctor visits, then tap + to create an appointment. When offered, choose Apple/device, Google, or Microsoft to add a calendar copy. Copies do not provide automatic two-way synchronization; check both calendars when changing an appointment.', action: 'Open Doctor visits', route: routes.doctorVisits },
  { title: 'Tracking and wellness logs', summary: 'Use the same date-first workflow', body: 'Choose a date in Tracking or Wellness and open the entry editor to add or update a log. Wellness keeps daily check-ins separate from your baseline. Tracking includes cycle, HRT, and medication progress; enable HRT dose syncing on the relevant medication when needed.', action: 'Open Wellness', route: routes.wellness },
  { title: 'Understand streaks and gardens', summary: 'Complete days and earned milestones', body: `A complete day means every scheduled dose was logged. History shows the last ${STREAK_CALENDAR_DAYS} days using status symbols. Badges are earned from your longest streak. Tap a milestone in Streaks to preview its celebration; the 30-, 60-, and 100-day badges grow into tulip gardens.`, action: 'View Streaks', route: routes.streaks },
  { title: 'What can the safety check tell me?', summary: 'Warnings, unmatched names and limitations', body: 'The check uses a limited reference set and medication name matching. Unmatched names mean some checks are incomplete. A result with no warnings does not guarantee safety. Confirm medication decisions with your doctor or pharmacist. Keep self-reported allergies and conditions up to date in Medical records.', action: 'Open Drug safety check', route: routes.interactions },
  { title: 'Manage your account and data', summary: 'Profile, password and account deletion', body: 'My account groups profile, appearance, reminders, and security settings. Medical records stores your self-reported health information. Account deletion permanently removes your account and associated data and asks you to confirm before proceeding.', action: 'Open My account', route: routes.account },
];

export default function HelpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const topics = TOPICS.filter((topic) => `${topic.title} ${topic.summary} ${topic.body}`.toLowerCase().includes(needle));
  return <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.header}><Text style={s.title}>How can we help?</Text><Text style={s.hint}>Quick answers and a direct path to what you need.</Text></View>
      <TextInput style={s.search} accessibilityLabel="Search help topics" placeholder="Search reminders, refills, calendars…" placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} autoCorrect={false} clearButtonMode="while-editing" />
      <View><Text style={s.sectionTitle}>Help topics</Text>
        {topics.map((topic) => <CollapsibleSection key={`${needle}-${topic.title}`} title={topic.title} summary={topic.summary} initiallyOpen={Boolean(needle)}>
          <Text style={s.body}>{topic.body}</Text>
          <NavigationRow title={topic.action} onPress={() => router.push(topic.route)} />
        </CollapsibleSection>)}
        {!topics.length ? <Text style={s.hint}>No matching topics. Try “reminders”, “refills”, or “calendar”.</Text> : null}
      </View>
      <View style={s.safety}><Text style={s.sectionTitle}>Safety first</Text><Text style={s.body}>Dr. Dose is for personal organization and does not provide medical advice. Follow your doctor or pharmacist’s instructions. For an urgent medical problem, contact local emergency services.</Text></View>
      <CollapsibleSection title="Sources & citations" summary="Read the references behind the app"><MedicalSourcesCard /></CollapsibleSection>
      <LegalLinks colors={colors} styles={{ legalRow: s.legalRow, legalLink: s.link, legalMuted: s.hint }} />
    </ScrollView>
  </SafeAreaView>;
}
function makeStyles(c: ColorPalette) {
  return { safe: { flex: 1, backgroundColor: c.bg }, scroll: { padding: 20, paddingBottom: 40, gap: 24 }, header: { gap: 8 }, title: { fontFamily: fonts.heading, fontSize: 26, color: c.text }, hint: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 21, color: c.textMuted }, body: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 23, color: c.text }, sectionTitle: { fontFamily: fonts.bodySemibold, fontSize: 17, color: c.text }, search: { minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: c.surface, color: c.text, fontFamily: fonts.bodyRegular, fontSize: 15 }, safety: { borderLeftWidth: 2, borderColor: c.accent, paddingLeft: 16, gap: 10 }, legalRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 }, link: { color: c.accent, fontFamily: fonts.bodyMedium } };
}
