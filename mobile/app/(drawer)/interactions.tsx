import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CollapsibleSection } from '../../components/forms/CollapsibleSection';
import { MedicationNameInput } from '../../components/medication/MedicationNameInput';
import { MedicalSourcesCard } from '../../components/MedicalSourcesCard';
import type { ColorPalette } from '../../constants/theme';
import { fonts, radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { routes } from '../../lib/routes';
import { useAuth } from '../../hooks/useAuth';
import { fetchMedicalRecord } from '../../lib/medicalRecords';
import { checkDrugAllergies, type AllergyWarning } from '../../lib/allergyCheck';
import { checkDrugConditions, type ConditionWarning } from '../../lib/conditionCheck';
import { safetyCheckNames, checkRecordWarnings } from '../../lib/safetyCheckWorkflow';
import { todayLocalDate } from '../../lib/dates';
import {
  checkMedicationInteractions,
  interactionsInvolvingDrug,
  severityLabel,
  type FoundInteraction,
  type InteractionCheckResult,
} from '../../lib/drugInteractions';
import { openRows } from '../../lib/crypto/seal';
import { filterMedicationsActiveOn } from '../../lib/medicationDates';
import { supabase } from '../../lib/supabase';
import type { Medication } from '../../lib/types';

function makeInteractionStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 40, gap: 24 },
    header: { gap: spacing.xs },
    h1: { fontSize: 26, fontFamily: fonts.heading, color: colors.text },
    sub: { color: colors.textMuted, lineHeight: 20 },
    disclaimer: { paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
    disclaimerText: { color: colors.text, lineHeight: 20, fontSize: 14 },
    strong: { fontWeight: '800' as const, color: colors.text },
    link: { color: colors.accent, fontWeight: '700' as const },
    footerLink: { textAlign: 'center' as const, marginTop: spacing.sm },
    card: { paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
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
    successCard: { borderColor: colors.border },
    successTitle: { fontFamily: fonts.bodySemibold, color: colors.text, fontSize: 16 },
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
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const requestVersion = useRef(0);
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InteractionCheckResult | null>(null);
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarning[]>([]);
  const [conditionWarnings, setConditionWarnings] = useState<ConditionWarning[]>([]);
  const [extraDrug, setExtraDrug] = useState('');
  const [rechecking, setRechecking] = useState(false);
  const [lastCheckedDrug, setLastCheckedDrug] = useState<string | null>(null);

  const runCheck = useCallback(async (candidate?: string) => {
    if (!userId) return;
    const version = ++requestVersion.current;
    setError(null);
    try {
      if (!supabase) throw new Error('Could not connect. Please try again.');
      const [medicationResponse, record] = await Promise.all([
        supabase.from('medications').select('name, start_date, end_date').eq('user_id', userId).order('name'),
        fetchMedicalRecord(userId),
      ]);
      if (medicationResponse.error) throw medicationResponse.error;
      const active = filterMedicationsActiveOn(openRows('medications', (medicationResponse.data ?? []) as Record<string, unknown>[]) as Medication[], todayLocalDate());
      const currentNames = active.map((med) => med.name).sort((a, b) => a.localeCompare(b));
      const names = safetyCheckNames(currentNames, candidate);
      const savedAllergies = record?.known_allergies ?? [];
      const savedConditions = record?.known_conditions ?? [];
      const [data, hits] = await Promise.all([
        checkMedicationInteractions(names),
        checkRecordWarnings(names,
          (name) => savedAllergies.length ? checkDrugAllergies(name, savedAllergies) : Promise.resolve([]),
          (name) => savedConditions.length ? checkDrugConditions(name, savedConditions) : Promise.resolve([]),
        ),
      ]);
      if (version !== requestVersion.current) return;
      setAllergies(savedAllergies);
      setConditions(savedConditions);
      setResult(data);
      setAllergyWarnings(hits.allergyHits);
      setConditionWarnings(hits.conditionHits);
      setLastCheckedDrug(candidate ?? null);
    } catch (err) {
      if (version !== requestVersion.current) return;
      setResult(null);
      setAllergyWarnings([]);
      setConditionWarnings([]);
      throw err;
    }
  }, [userId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setResult(null);
    setLastCheckedDrug(null);
    runCheck().catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Could not check interactions');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; requestVersion.current += 1; };
  }, [runCheck]));

  async function onRefresh() {
    if (rechecking || refreshing) return;
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
    if (!result || !extraDrug.trim() || rechecking || refreshing) return;

    const candidate = extraDrug.trim();
    setRechecking(true);
    try {
      await runCheck(candidate);
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
    allergies.length === 0 && conditions.length === 0 && !loading && !refreshing && !rechecking && !error && Boolean(result);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.h1}>Drug safety check</Text>
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
            <Pressable accessibilityRole="button" disabled={refreshing} style={styles.secondaryBtn} onPress={() => void onRefresh()}><Text style={styles.secondaryBtnText}>{refreshing ? 'Checking…' : 'Try again'}</Text></Pressable>
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

        {loading || rechecking || refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Checking your medications…</Text>
          </View>
        ) : result ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Check another drug</Text>
              <Text style={styles.hint}>
                Compare one medication with your saved active list. This does not add it to your medications. Each new check replaces the previous comparison.
              </Text>
              <MedicationNameInput
                value={extraDrug}
                onChange={setExtraDrug}
                placeholder="e.g. ibuprofen, Advil, Lexapro"
              />
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.secondaryBtn,
                  (rechecking || refreshing || !extraDrug.trim()) && styles.btnDisabled,
                ]}
                disabled={rechecking || refreshing || !extraDrug.trim()}
                onPress={() => void handleAddExtraDrug()}
              >
                <Text style={styles.secondaryBtnText}>
                  {rechecking ? 'Checking…' : 'Check medication'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{result.inputNames.length === 0 ? 'Add a medication to begin' : `${result.interactions.length + allergyWarnings.length + conditionWarnings.length} warnings found in this check`}</Text>
              {result.inputNames.length < 2 ? <Text style={styles.hint}>At least two matched medications are needed for a drug-pair check.</Text> : null}
              <Text style={styles.hint}>{result.mappedCount} of {result.resolved.length} names matched · {result.pairCount} drug pairs checked</Text>
              {unresolved.length > 0 ? <Text style={styles.warnText}>Incomplete coverage: {unresolved.length} unmatched names. Review the unmatched list below.</Text> : null}
              {lastCheckedDrug ? <Pressable accessibilityRole="button" disabled={refreshing || rechecking} style={styles.secondaryBtn} onPress={() => void onRefresh()}><Text style={styles.secondaryBtnText}>Clear comparison · saved medications only</Text></Pressable> : null}
            </View>
            <CollapsibleSection title={lastCheckedDrug ? 'Medications in this comparison' : 'Your active medications'} summary={`${result.inputNames.length} medications · view matched names`}>
              <View style={{ gap: 10 }}>
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

            </CollapsibleSection>
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
                <Text style={styles.successTitle}>No drug-pair warnings found</Text>
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
                  These names could not be matched to the reference set. Their drug-pair checks are incomplete.
                </Text>
                {unresolved.map((r) => (
                  <Text key={r.original} style={styles.body}>
                    • {r.original}
                  </Text>
                ))}
              </View>
            ) : null}


          </>
        ) : null}

        <CollapsibleSection title="Sources & limitations" summary="References used by the safety check"><MedicalSourcesCard /></CollapsibleSection>

        <Pressable onPress={() => router.push(routes.today)}>
          <Text style={[styles.link, styles.footerLink]}>Back to Today</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
