import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeProvider';
import { routes } from '../../lib/routes';
import { STREAK_CALENDAR_DAYS } from '../../lib/streaks';
import { LegalLinks } from '../../components/LegalLinks';
import { MedicalSourcesCard } from '../../components/MedicalSourcesCard';
import { radii, spacing } from '../../constants/theme';

const RXNORM_URL = 'https://www.nlm.nih.gov/research/umls/rxnorm/index.html';

function Bullet({ children, styles }: { children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function Strong({ children, styles }: { children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return <Text style={styles.strong}>{children}</Text>;
}

export default function HelpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.h1}>Help & safety</Text>
          <Text style={styles.sub}>How to use Dr. Dose</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Using the app</Text>
          <Bullet styles={styles}>
            <Strong styles={styles}>Today</Strong> — mark each scheduled dose separately (e.g.
            morning and evening are two doses). Use <Strong styles={styles}>Move to as needed</Strong>{' '}
            or <Strong styles={styles}>Move to daily schedule</Strong> on a medication to switch types
            without re-adding it. Refill and missed-dose banners appear when relevant.
          </Bullet>
          <Bullet styles={styles}>
            <Strong styles={styles}>History</Strong> — {STREAK_CALENDAR_DAYS}-day calendar, weekly
            summary, and dose list. Tap a day to filter.
          </Bullet>
          <Bullet styles={styles}>
            <Strong styles={styles}>Tracking</Strong> — optional modules (cycle, HRT, medication
            progress). Set your physical profile (editable anytime). HRT doses logged on Today sync here
            when you enable <Strong styles={styles}>Sync doses to Tracking → HRT</Strong> on a
            medication.
          </Bullet>
          <Bullet styles={styles}>
            <Strong styles={styles}>Account → Medications</Strong> — add, edit, or remove medications.
            When you type a name, suggestions come from a built-in list plus{' '}
            <Text style={styles.link} onPress={() => void Linking.openURL(RXNORM_URL)}>
              RxNorm (NIH)
            </Text>{' '}
            (brands and generics such as Lipitor, Tylenol, lisinopril). Set a{' '}
            <Strong styles={styles}>start date</Strong> and optional{' '}
            <Strong styles={styles}>end date</Strong> for each schedule (e.g. a short antibiotic course).
          </Bullet>
          <Bullet styles={styles}>
            <Strong styles={styles}>Medical records</Strong> — self-reported allergies, blood type, and
            conditions (not certified clinical records).{' '}
            <Strong styles={styles}>Drug safety check</Strong> — cross-reference medications and your
            allergy list (always ask a pharmacist).
          </Bullet>
          <Bullet styles={styles}>
            <Strong styles={styles}>Streaks</Strong> — current streak and tulip badge milestones.{' '}
            <Strong styles={styles}>Account</Strong> — profile photo, display name, theme, timezone,
            dose reminders, and sign out.
          </Bullet>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Streaks & History</Text>
          <Text style={styles.body}>
            A <Text style={styles.strong}>perfect day</Text> means you logged every scheduled dose that
            day. Your current streak counts consecutive perfect days. Today still counts as in progress
            until the day ends — missing doses after that breaks the streak. On{' '}
            <Text style={styles.strong}>History</Text>, the color calendar shows perfect, partial, and
            missed days; tap one to see each dose and your wellness check-in. On{' '}
            <Text style={styles.strong}>Streaks</Text>, see tulip badges and how many consecutive perfect
            days each one requires.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reminders & missed doses</Text>
          <Text style={styles.body}>
            Enable <Text style={styles.strong}>dose reminders</Text> in{' '}
            <Text style={styles.link} onPress={() => router.push(routes.account)}>
              Account
            </Text>
            . On iPhone, you get lock-screen alerts at each scheduled dose time, even when the app is
            closed. The missed-doses banner on Today shows yesterday&apos;s gaps and today&apos;s
            past-due slots.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preventing double doses</Text>
          <Text style={styles.body}>
            Each dose <Text style={styles.em}>time</Text> can only be marked once per day. Add one row
            per daily dose in the medication wizard. Use <Text style={styles.strong}>Undo</Text> on a slot
            if you logged it by mistake. Pill counts drop by one each time you mark a dose taken.
          </Text>
        </View>

        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.sectionTitle}>Medical disclaimer</Text>
          <Text style={styles.body}>
            Dr. Dose is for personal organization only. It does not provide medical advice. Always
            follow instructions from your doctor or pharmacist. Call emergency services for urgent
            medical problems.
          </Text>
        </View>

        <MedicalSourcesCard />

        <LegalLinks
          colors={colors}
          styles={{
            legalRow: styles.legalRow,
            legalLink: styles.link,
            legalMuted: styles.legalMuted,
          }}
        />

        <Pressable onPress={() => router.push(routes.today)}>
          <Text style={[styles.link, styles.footerLink]}>Back to Today</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
    header: { gap: spacing.xs },
    h1: { fontSize: 24, fontWeight: '900', color: colors.text },
    sub: { color: colors.textMuted, lineHeight: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    warningCard: {
      backgroundColor: colors.partialBg,
      borderColor: colors.partialBorder,
    },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text, marginBottom: spacing.xs },
    body: { color: colors.text, lineHeight: 22, fontSize: 15 },
    bulletRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    bulletDot: { color: colors.text, fontSize: 15, lineHeight: 22 },
    bulletText: { flex: 1, color: colors.text, lineHeight: 22, fontSize: 15 },
    strong: { fontWeight: '800', color: colors.text },
    em: { fontStyle: 'italic' },
    link: { color: colors.accent, fontWeight: '700' },
    footerLink: { textAlign: 'center', marginTop: spacing.sm },
    legalRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    legalMuted: { color: colors.textMuted, fontSize: 14 },
  });
}
