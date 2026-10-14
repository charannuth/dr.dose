import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native';
import { fonts, radii, spacing, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useWellnessMedBriefings } from '../../hooks/useWellnessMedBriefings';
import { useWellnessPageData } from '../../hooks/useWellnessPageData';
import { todayLocalDate } from '../../lib/dates';
import { tapFeedback } from '../../lib/haptics';
import { buildWellnessReportHtml, createWellnessReportData } from '../../lib/wellnessReport';

function nativeHint(message: string, fallbackTitle: string) {
  if (message.includes('ExpoPrint') || message.includes('native module')) {
    Alert.alert('Rebuild required', 'Reports need a fresh native build. Stop Metro, run npx expo run:ios, then try again.');
  } else {
    Alert.alert(fallbackTitle, message);
  }
}

/**
 * The one report for your doctor: medical history first, then (optionally)
 * the last two weeks of wellness, as-needed use and medication notes.
 */
export function DoctorReportCard({
  userId,
  userEmail,
  medicalHistoryHtml,
  refreshKey,
}: {
  userId: string | undefined;
  userEmail: string | undefined;
  medicalHistoryHtml: string;
  refreshKey: number;
}) {
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [includeWellness, setIncludeWellness] = useState(true);
  const [busy, setBusy] = useState<'view' | 'pdf' | null>(null);
  const { profileDraft, reportLogs, prnInsights, activeMeds, pageLoading } = useWellnessPageData(userId, todayLocalDate(), refreshKey);
  const { entries: briefingEntries } = useWellnessMedBriefings(activeMeds);

  function html() {
    const data = createWellnessReportData({ userEmail, profile: profileDraft, medications: activeMeds, reportLogs, prnInsights, briefingEntries });
    return buildWellnessReportHtml(data, { medicalHistoryHtml, includeWellness });
  }

  async function preview() {
    tapFeedback();
    setBusy('view');
    try {
      const Print = await import('expo-print');
      await Print.printAsync({ html: html() });
    } catch (err) {
      nativeHint(err instanceof Error ? err.message : 'Could not open report', 'Report failed');
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    tapFeedback();
    setBusy('pdf');
    try {
      const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
      const { uri } = await Print.printToFileAsync({ html: html() });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Report for your doctor' });
      } else {
        Alert.alert('Report ready', `Saved to ${uri}`);
      }
    } catch (err) {
      nativeHint(err instanceof Error ? err.message : 'Could not create report', 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  const waiting = includeWellness && pageLoading;
  return (
    <View style={s.card}>
      <Text style={s.title}>Share with your doctor</Text>
      <Text style={s.hint}>A one-tap summary of your history, allergies, medications and care team, ready to print or send before a visit.</Text>
      <View style={s.toggle}>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleTitle}>Include the last 2 weeks</Text>
          <Text style={s.hint}>Check-ins, as-needed doses and medication notes</Text>
        </View>
        <Switch value={includeWellness} onValueChange={setIncludeWellness} />
      </View>
      <View style={s.buttons}>
        <Pressable style={[s.primary, (busy || waiting) && s.disabled]} disabled={Boolean(busy) || waiting} onPress={() => void share()} accessibilityRole="button">
          {busy === 'pdf' ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.primaryText}>Share PDF</Text>}
        </Pressable>
        <Pressable style={[s.secondary, (busy || waiting) && s.disabled]} disabled={Boolean(busy) || waiting} onPress={() => void preview()} accessibilityRole="button">
          {busy === 'view' ? <ActivityIndicator color={colors.accent} /> : <Text style={s.secondaryText}>Preview</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.lg, gap: 10 },
    title: { fontFamily: fonts.heading, fontSize: 18, color: c.text },
    hint: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
    toggle: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 4 },
    toggleTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.text },
    buttons: { flexDirection: 'row' as const, gap: 10, marginTop: 4 },
    primary: { flex: 1, minHeight: 46, borderRadius: radii.md, backgroundColor: c.accent, alignItems: 'center' as const, justifyContent: 'center' as const },
    primaryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.onAccent },
    secondary: { flex: 1, minHeight: 46, borderRadius: radii.md, borderWidth: 1, borderColor: c.border, alignItems: 'center' as const, justifyContent: 'center' as const },
    secondaryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.text },
    disabled: { opacity: 0.6 },
  };
}
