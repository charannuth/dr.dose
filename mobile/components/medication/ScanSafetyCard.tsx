import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useMedicalRecordAllergies } from '../../hooks/useMedicalRecordAllergies';
import { routes } from '../../lib/routes';
import { runScanSafetyCheck, type ScanSafetyResult } from '../../lib/scanSafetyCheck';
import type { ScanFindingSeverity, ScanVerdictLevel } from '../../lib/scanSafetyVerdict';

type Props = {
  drugName: string;
  brandName?: string;
  currentMedicationNames: string[];
};

/** Re-run the check this long after the user stops editing the name. */
const DEBOUNCE_MS = 700;

/**
 * Shown on the scan review screen. Runs automatically after a scan and re-runs when the
 * user corrects the drug name. Informational only — never blocks saving.
 */
export function ScanSafetyCard({ drugName, brandName, currentMedicationNames }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { allergies, conditions, loading: recordLoading } = useMedicalRecordAllergies(user?.id);
  const [result, setResult] = useState<ScanSafetyResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const name = drugName.trim();
  const medsKey = currentMedicationNames.join('\n');
  const allergiesKey = allergies.join('\n');
  const conditionsKey = conditions.join('\n');

  useEffect(() => {
    if (!name || recordLoading) {
      setResult(null);
      setChecking(Boolean(name));
      return;
    }
    let active = true;
    setChecking(true);
    setError(null);
    const timer = setTimeout(() => {
      runScanSafetyCheck({
        drugName: name,
        brandName,
        currentMedicationNames,
        allergies,
        conditions,
      })
        .then((next) => {
          if (active) setResult(next);
        })
        .catch((err: unknown) => {
          if (active) {
            setResult(null);
            setError(err instanceof Error ? err.message : 'Could not run the safety check.');
          }
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, brandName, medsKey, allergiesKey, conditionsKey, recordLoading]);

  if (!name) {
    return (
      <View style={[styles.card, styles.cardNeutral]}>
        <Text style={styles.headline}>Safety check</Text>
        <Text style={styles.body}>
          Enter the medication name below and we'll check it against your allergies and current
          medications.
        </Text>
      </View>
    );
  }

  if (checking || (!result && !error)) {
    return (
      <View style={[styles.card, styles.cardNeutral]} accessibilityLiveRegion="polite">
        <View style={styles.row}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.body}>Checking {name} against your allergies and medications…</Text>
        </View>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={[styles.card, styles.cardNeutral]}>
        <Text style={styles.headline}>Safety check unavailable</Text>
        <Text style={styles.body}>
          {error ?? 'Something went wrong.'} You can still continue. Ask your pharmacist to check
          this medication against your allergies and other medicines.
        </Text>
      </View>
    );
  }

  const level = result.verdict.level;
  const tone = levelTone(level, colors);
  const noRecord = allergies.length === 0 && conditions.length === 0;

  return (
    <View
      style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.fg }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${result.verdict.headline}. ${result.verdict.summary}`}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: tone.fg }]}>
          <Text style={[styles.iconText, { color: colors.onAccent }]}>{tone.icon}</Text>
        </View>
        <Text style={[styles.headline, styles.flex, { color: tone.fg }]}>
          {result.verdict.headline}
        </Text>
      </View>
      <Text style={styles.body}>{result.verdict.summary}</Text>

      {result.findings.length > 0 ? (
        <>
          <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
            <Text style={styles.link}>
              {expanded ? 'Hide details' : `Show ${result.findings.length} detail(s)`}
            </Text>
          </Pressable>
          {expanded
            ? result.findings.map((f, idx) => (
                <View key={`${f.kind}-${idx}`} style={styles.finding}>
                  <View style={styles.row}>
                    <View
                      style={[styles.dot, { backgroundColor: severityColor(f.severity, colors) }]}
                    />
                    <Text style={[styles.findingTitle, styles.flex]}>{f.title}</Text>
                  </View>
                  <Text style={styles.findingBody}>{f.detail}</Text>
                  <Text style={styles.source}>Source: {f.source}</Text>
                </View>
              ))
            : null}
        </>
      ) : null}

      {noRecord ? (
        <Text style={styles.small}>
          No allergies on file.{' '}
          <Text style={styles.link} onPress={() => router.push(routes.medicalRecords)}>
            Add them to your medical record
          </Text>{' '}
          for a more complete check.
        </Text>
      ) : null}
      {result.fdaUnavailable ? (
        <Text style={styles.small}>
          The FDA label lookup couldn't run (are you offline?), so only our built-in references
          were checked.
        </Text>
      ) : null}
      {result.dailyMedUrl ? (
        <Text style={styles.link} onPress={() => void Linking.openURL(result.dailyMedUrl!)}>
          Read the full FDA label on DailyMed
        </Text>
      ) : null}
      <Text style={styles.small}>
        For information only, not medical advice. Always confirm with your pharmacist or doctor.
      </Text>
    </View>
  );
}

function levelTone(level: ScanVerdictLevel, colors: ColorPalette) {
  switch (level) {
    case 'danger':
      return { fg: colors.accentRed, bg: colors.accentRedBg, icon: '!' };
    case 'caution':
      return { fg: colors.accentAmber, bg: colors.accentAmberBg, icon: '!' };
    case 'clear':
      return { fg: colors.accentGreen, bg: colors.accentGreenBg, icon: '✓' };
    default:
      return { fg: colors.textMuted, bg: colors.surface, icon: '?' };
  }
}

function severityColor(severity: ScanFindingSeverity, colors: ColorPalette): string {
  if (severity === 'danger') return colors.accentRed;
  if (severity === 'caution') return colors.accentAmber;
  return colors.textMuted;
}

function makeStyles(colors: ColorPalette) {
  return {
    card: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderLeftWidth: 5,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardNeutral: { borderColor: colors.border, backgroundColor: colors.surface },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm },
    flex: { flex: 1 },
    icon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconText: { fontFamily: fonts.bodySemibold, fontSize: 14 },
    headline: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
    body: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.text, lineHeight: 20, flexShrink: 1 },
    link: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.accent },
    finding: {
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      padding: spacing.sm,
      gap: 4,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    findingTitle: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
    findingBody: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.text, lineHeight: 18 },
    source: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.textMuted },
    small: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  };
}
