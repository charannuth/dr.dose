import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MedicationNameInput } from '../../components/medication/MedicationNameInput';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { routes } from '../../lib/routes';
import { useAuth } from '../../hooks/useAuth';
import { useMedicalRecordAllergies } from '../../hooks/useMedicalRecordAllergies';
import { checkDrugAllergies, type AllergyWarning } from '../../lib/allergyCheck';
import { checkDrugConditions, type ConditionWarning } from '../../lib/conditionCheck';
import { todayLocalDate } from '../../lib/dates';
import {
  checkMedicationInteractions,
  interactionsInvolvingDrug,
  severityLabel,
  type FoundInteraction,
  type InteractionCheckResult,
} from '../../lib/drugInteractions';
import { filterMedicationsActiveOn } from '../../lib/medicationDates';
import { supabase } from '../../lib/supabase';
import type { Medication } from '../../lib/types';

function makeInteractionStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
    header: { gap: spacing.xs },
    h1: { fontSize: 24, fontWeight: '900' as const, color: colors.text },
    sub: { color: colors.textMuted, lineHeight: 20 },
    disclaimer: {
      backgroundColor: colors.partialBg,
      borderWidth: 1,
      borderColor: colors.partialBorder,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    disclaimerText: { color: colors.text, lineHeight: 20, fontSize: 14 },
    strong: { fontWeight: '800' as const, color: colors.text },
    link: { color: colors.accent, fontWeight: '700' as const },
    footerLink: { textAlign: 'center' as const, marginTop: spacing.sm },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    sectionTitle: { fontSize: 16, fontWeight: '900' as const, color: colors.text },
    body: { color: colors.text, lineHeight: 20 },
    hint: { color: colors.textMuted, lineHeight: 20, fontSize: 14 },
    em: { fontStyle: 'italic' as const, fontWeight: '600' as const },
    meta: {
      marginTop: spacing.xs,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    medRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
    medName: { color: colors.text, fontWeight: '700' as const, lineHeight: 22 },
    medMapped: { color: colors.textMuted, lineHeight: 22 },
    medUnknown: { color: colors.partialText, lineHeight: 22 },
    errorCard: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
    errorText: { color: colors.error, fontWeight: '700' as const },
    warnCard: { backgroundColor: colors.partialBg, borderColor: colors.partialBorder },
    warnText: { color: colors.text, lineHeight: 20 },
    inlineWarn: {
      backgroundColor: colors.partialBg,
      borderRadius: radii.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.partialBorder,
    },
    successCard: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    successTitle: { fontWeight: '900' as const, color: colors.successText, fontSize: 16 },
    loadingWrap: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    loadingText: { color: colors.textMuted },
    warningBlock: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.xs,
    },
    warningHeader: { gap: spacing.xs },
    warningTitle: { fontSize: 15, fontWeight: '900' as const, color: colors.text },
    management: { color: colors.text, lineHeight: 20, fontSize: 14 },
    managementLabel: { fontWeight: '800' as const },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start' as const,
    },
    badgeMajor: { backgroundColor: colors.badgeMajorBg },
    badgeModerate: { backgroundColor: colors.badgeModerateBg },
    badgeMinor: { backgroundColor: colors.badgeMinorBg },
    badgeText: { fontSize: 12, fontWeight: '900' as const, color: colors.text },
    secondaryBtn: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center' as const,
      backgroundColor: colors.bg,
    },
    secondaryBtnText: { fontWeight: '700' as const, color: colors.text, fontSize: 16 },
    btnDisabled: { opacity: 0.5 },
  };
}

type InteractionStylesShape = ReturnType<typeof makeInteractionStyles>;

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

function severityBadgeStyle(sev: string, s: InteractionStylesShape) {
  if (sev === 'major') return [s.badge, s.badgeMajor];
  if (sev === 'moderate') return [s.badge, s.badgeModerate];
  return [s.badge, s.badgeMinor];
}

function InteractionResultItem({ item }: { item: FoundInteraction }) {
  const styles = useThemedStyles(makeInteractionStyles);
  return (
    <View style={styles.warningBlock}>
      <View style={styles.warningHeader}>
        <View style={severityBadgeStyle(item.severity, styles)}>
          <Text style={styles.badgeText}>{severityLabel(item.severity)}</Text>
        </View>
        <Text style={styles.warningTitle}>
          {item.displayA} + {item.displayB}
        </Text>
      </View>
      <Text style={styles.body}>{item.description}</Text>
      <Text style={styles.management}>
        <Text style={styles.managementLabel}>What to do: </Text>
        {item.management}
      </Text>
    </View>
  );
}

function MedicalRecordWarningItem({
  kind,
  item,
}: {
  kind: 'allergy' | 'condition';
  item: AllergyWarning | ConditionWarning;
}) {
  const styles = useThemedStyles(makeInteractionStyles);
  const badgeLabel =
    kind === 'allergy'
      ? `Allergy (${item.severity})`
      : `Condition (${item.severity})`;

  const detail =
    kind === 'allergy' ? (
      <>
        You listed <Text style={styles.em}>{(item as AllergyWarning).userAllergyText}</Text> (
        {(item as AllergyWarning).allergyLabel}). {item.description}
      </>
    ) : (
      <>
        Your record includes{' '}
        <Text style={styles.em}>{(item as ConditionWarning).userConditionText}</Text> (
        {(item as ConditionWarning).conditionLabel}). {item.description}
      </>
    );

  return (
    <View style={styles.warningBlock}>
      <View style={styles.warningHeader}>
        <View style={severityBadgeStyle(item.severity, styles)}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
        <Text style={styles.warningTitle}>{item.drugName}</Text>
      </View>
      <Text style={styles.body}>{detail}</Text>
      <Text style={styles.management}>
        <Text style={styles.managementLabel}>What to do: </Text>
        {item.management}
      </Text>
    </View>
  );
}

export default function InteractionsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeInteractionStyles);
  const { user } = useAuth();
  const router = useRouter();
  const { allergies, conditions } = useMedicalRecordAllergies(user?.id);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InteractionCheckResult | null>(null);
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarning[]>([]);
  const [conditionWarnings, setConditionWarnings] = useState<ConditionWarning[]>([]);
  const [extraDrug, setExtraDrug] = useState('');
  const [rechecking, setRechecking] = useState(false);
  const [lastCheckedDrug, setLastCheckedDrug] = useState<string | null>(null);

  const runMedicalRecordCheck = useCallback(
    async (names: string[]) => {
      const allergyHits: AllergyWarning[] = [];
      const conditionHits: ConditionWarning[] = [];
      for (const name of names) {
        if (allergies.length > 0) {
          allergyHits.push(...(await checkDrugAllergies(name, allergies)));
        }
        if (conditions.length > 0) {
          conditionHits.push(...(await checkDrugConditions(name, conditions)));
        }
      }
      setAllergyWarnings(allergyHits);
      setConditionWarnings(conditionHits);
    },
    [allergies, conditions],
  );

  const runCheck = useCallback(
    async (names?: string[]) => {
      if (!user) return;
      setError(null);
      if (!supabase) {
        setError('Supabase is not configured');
        setResult(null);
        return;
      }

      let namesToCheck = names;
      if (!namesToCheck) {
        const { data, error: fetchError } = await supabase
          .from('medications')
          .select('name, start_date, end_date')
          .eq('user_id', user.id)
          .order('name');

        if (fetchError) throw fetchError;

        const today = todayLocalDate();
        const activeMeds = filterMedicationsActiveOn((data ?? []) as Medication[], today);
        namesToCheck = activeMeds.map((m) => m.name);
      }

      const data = await checkMedicationInteractions(namesToCheck);
      setResult(data);
      await runMedicalRecordCheck(namesToCheck);
    },
    [user, runMedicalRecordCheck],
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    runCheck()
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not check interactions');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, runCheck]);

  async function onRefresh() {
    setRefreshing(true);
    setLastCheckedDrug(null);
    try {
      await runCheck();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAddExtraDrug() {
    if (!result || !extraDrug.trim()) return;

    const candidate = extraDrug.trim();
    setRechecking(true);
    try {
      const existing = new Set(result.inputNames.map((n) => n.toLowerCase()));
      const names = existing.has(candidate.toLowerCase())
        ? result.inputNames
        : [...result.inputNames, candidate];
      setLastCheckedDrug(candidate);
      await runCheck(names);
      setExtraDrug('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check interactions');
    } finally {
      setRechecking(false);
    }
  }

  const highlightedInteractions = useMemo(
    () =>
      result && lastCheckedDrug
        ? interactionsInvolvingDrug(result.interactions, lastCheckedDrug, result.resolved)
        : [],
    [result, lastCheckedDrug],
  );

  const otherInteractions = useMemo(() => {
    if (!result) return [];
    if (!lastCheckedDrug) return result.interactions;
    return result.interactions.filter(
      (item) =>
        !highlightedInteractions.some(
          (hit) => hit.drugA === item.drugA && hit.drugB === item.drugB,
        ),
    );
  }, [result, lastCheckedDrug, highlightedInteractions]);

  const unresolved = useMemo(
    () => result?.resolved.filter((r) => !r.canonical) ?? [],
    [result],
  );

  const majorCount =
    result?.interactions.filter((i) => i.severity === 'major').length ?? 0;

  const showMedicalRecordBanner =
    allergies.length === 0 && conditions.length === 0 && !loading;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.h1}>Drug interaction check</Text>
          <Text style={styles.sub}>
            Cross-reference your active medications for known interaction warnings
          </Text>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            <Text style={styles.strong}>Not medical advice.</Text> This tool uses a limited
            reference database plus RxNorm name matching. It cannot list every interaction or
            allergy. Always confirm with your doctor or pharmacist.{' '}
            <Text
              style={styles.link}
              onPress={() => router.push(routes.medicalRecords)}
            >
              Update medical records
            </Text>{' '}
            (allergies, conditions).
          </Text>
        </View>

        {error ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {showMedicalRecordBanner ? (
          <View style={[styles.card, styles.warnCard]}>
            <Text style={styles.warnText}>
              Add allergies and conditions (e.g. asthma) in{' '}
              <Text
                style={styles.link}
                onPress={() => router.push(routes.medicalRecords)}
              >
                Medical records
              </Text>{' '}
              to check medications against your history.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Checking your medications…</Text>
          </View>
        ) : result ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Your active medications</Text>
              {result.inputNames.length === 0 ? (
                <Text style={styles.body}>
                  No active medications today.{' '}
                  <Text
                    style={styles.link}
                    onPress={() => router.push(routes.medicationNew)}
                  >
                    Add medications
                  </Text>{' '}
                  to run a check.
                </Text>
              ) : (
                <>
                  {result.resolved.map((row) => (
                    <View key={row.original} style={styles.medRow}>
                      <Text style={styles.medName}>• {row.original}</Text>
                      {row.canonical && row.canonical !== normalizeName(row.original) ? (
                        <Text style={styles.medMapped}> → {row.canonical}</Text>
                      ) : null}
                      {!row.canonical ? (
                        <Text style={styles.medUnknown}> — not in reference set</Text>
                      ) : null}
                    </View>
                  ))}
                  {result.inputNames.length >= 2 ? (
                    <Text style={styles.meta}>
                      Mapped {result.mappedCount} of {result.resolved.length} name
                      {result.resolved.length === 1 ? '' : 's'} · checked {result.pairCount}{' '}
                      pair{result.pairCount === 1 ? '' : 's'} · {result.interactions.length}{' '}
                      warning{result.interactions.length === 1 ? '' : 's'} found
                      {majorCount > 0 ? ` (${majorCount} major)` : ''}
                    </Text>
                  ) : null}
                  {result.unmappedCount > 0 && result.inputNames.length >= 2 ? (
                    <View style={[styles.inlineWarn, { marginTop: spacing.sm }]}>
                      <Text style={styles.warnText}>
                        {result.unmappedCount} medication
                        {result.unmappedCount === 1 ? ' was' : 's were'} not matched to our
                        reference set, so some drug–drug pairs could not be checked. Try the
                        generic name (e.g. ibuprofen instead of Advil) or check spelling.
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            {allergyWarnings.length > 0 || conditionWarnings.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Medical record cross-check</Text>
                <Text style={styles.hint}>
                  Based on your{' '}
                  <Text
                    style={styles.link}
                    onPress={() => router.push(routes.medicalRecords)}
                  >
                    medical record
                  </Text>{' '}
                  — not a diagnosis. If you have asthma, NSAIDs such as ibuprofen and naproxen
                  (Aleve) may both need clinician review.
                </Text>
                {allergyWarnings.map((item) => (
                  <MedicalRecordWarningItem
                    key={`a-${item.drugName}-${item.category}`}
                    kind="allergy"
                    item={item}
                  />
                ))}
                {conditionWarnings.map((item) => (
                  <MedicalRecordWarningItem
                    key={`c-${item.drugName}-${item.conditionKey}`}
                    kind="condition"
                    item={item}
                  />
                ))}
              </View>
            ) : null}

            {result.interactions.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Drug-to-drug interactions</Text>
                {lastCheckedDrug && highlightedInteractions.length > 0 ? (
                  <>
                    <Text style={styles.hint}>
                      Warnings involving <Text style={styles.strong}>{lastCheckedDrug}</Text> and
                      your current list:
                    </Text>
                    {highlightedInteractions.map((item) => (
                      <InteractionResultItem
                        key={`new-${item.drugA}-${item.drugB}`}
                        item={item}
                      />
                    ))}
                  </>
                ) : null}
                {lastCheckedDrug && otherInteractions.length > 0 ? (
                  <Text style={[styles.hint, { marginTop: spacing.sm }]}>
                    Other interactions on your list:
                  </Text>
                ) : null}
                {(lastCheckedDrug ? otherInteractions : result.interactions).map((item) => (
                  <InteractionResultItem
                    key={`${item.drugA}-${item.drugB}`}
                    item={item}
                  />
                ))}
              </View>
            ) : result.inputNames.length >= 2 && result.mappedCount >= 2 ? (
              <View style={[styles.card, styles.successCard]}>
                <Text style={styles.successTitle}>No known interactions</Text>
                <Text style={styles.body}>
                  in our reference database for your current medication list.
                </Text>
                <Text style={[styles.hint, { marginTop: spacing.sm }]}>
                  This does not guarantee safety. New drugs, doses, and conditions can still
                  matter — ask a pharmacist if unsure.
                </Text>
              </View>
            ) : result.inputNames.length >= 2 && result.mappedCount < 2 ? (
              <View style={[styles.card, styles.warnCard]}>
                <Text style={styles.warnText}>
                  <Text style={styles.strong}>Not enough medications mapped</Text> to run a full
                  drug–drug check. Add generic names where possible, or update spelling.
                </Text>
              </View>
            ) : null}

            {unresolved.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Could not fully map</Text>
                <Text style={styles.hint}>
                  These names were not matched to our interaction database. They were still
                  included in the check if a synonym matched.
                </Text>
                {unresolved.map((r) => (
                  <Text key={r.original} style={styles.body}>
                    • {r.original}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Check another drug</Text>
              <Text style={styles.hint}>
                See if a medication you are considering interacts with your current list.
              </Text>
              <MedicationNameInput
                value={extraDrug}
                onChange={setExtraDrug}
                placeholder="e.g. ibuprofen, Advil, Lexapro"
              />
              <Pressable
                style={[
                  styles.secondaryBtn,
                  (rechecking || !extraDrug.trim()) && styles.btnDisabled,
                ]}
                disabled={rechecking || !extraDrug.trim()}
                onPress={() => void handleAddExtraDrug()}
              >
                <Text style={styles.secondaryBtnText}>
                  {rechecking ? 'Checking…' : 'Add & recheck'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <Pressable onPress={() => router.push(routes.today)}>
          <Text style={[styles.link, styles.footerLink]}>Back to Today</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
