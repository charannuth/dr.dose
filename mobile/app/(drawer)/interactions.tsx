import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CollapsibleSection } from '../../components/forms/CollapsibleSection';
import { MedicationNameInput } from '../../components/medication/MedicationNameInput';
import { MedicalSourcesCard } from '../../components/MedicalSourcesCard';
import { fonts, radii, spacing, withAlpha, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { routes } from '../../lib/routes';
import { useAuth } from '../../hooks/useAuth';
import { fetchMedicalRecord } from '../../lib/medicalRecords';
import { checkDrugAllergies } from '../../lib/allergyCheck';
import { checkDrugConditions } from '../../lib/conditionCheck';
import { safetyCheckNames, checkRecordWarnings } from '../../lib/safetyCheckWorkflow';
import { todayLocalDate } from '../../lib/dates';
import { checkMedicationInteractions, type InteractionCheckResult } from '../../lib/drugInteractions';
import { openRows } from '../../lib/crypto/seal';
import { filterMedicationsActiveOn } from '../../lib/medicationDates';
import { supabase } from '../../lib/supabase';
import { tapFeedback } from '../../lib/haptics';
import type { Medication } from '../../lib/types';
import { buildSafetyItems, safetyVerdict, splitByCandidate, type SafetyItem, type SafetyVerdict } from '../../lib/safetySummary';
import { AmbientScrollView } from '../../components/AmbientBackground';

type CheckRun = {
  result: InteractionCheckResult;
  items: SafetyItem[];
  allergies: string[];
  conditions: string[];
};

type CandidateRun = { name: string; canonical: string | null; matched: boolean; items: SafetyItem[] };

function toneColor(tone: SafetyVerdict['tone'] | SafetyItem['severity'], c: ColorPalette): string {
  if (tone === 'danger' || tone === 'major') return c.error;
  if (tone === 'caution' || tone === 'incomplete' || tone === 'moderate') return c.accentAmber;
  if (tone === 'clear') return c.accentGreen;
  return c.textMuted;
}

function WarningCard({ item }: { item: SafetyItem }) {
  const s = useThemedStyles(makeStyles);
  const { colors, isDark } = useTheme();
  const color = toneColor(item.severity, colors);
  return (
    <View style={[s.warning, { borderLeftColor: color }]}>
      <View style={[s.badge, { backgroundColor: withAlpha(color, isDark ? 0.22 : 0.14) }]}>
        <Text style={[s.badgeText, { color }]}>{item.badge}</Text>
      </View>
      <Text style={s.warningTitle}>{item.title}</Text>
      <Text style={s.body}>{item.body}</Text>
      <Text style={s.body}><Text style={s.strong}>What to do: </Text>{item.management}</Text>
    </View>
  );
}

export default function InteractionsScreen() {
  const { colors, isDark } = useTheme();
  const s = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const router = useRouter();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<CheckRun | null>(null);
  const [query, setQuery] = useState('');
  const [checking, setChecking] = useState(false);
  const [candidate, setCandidate] = useState<CandidateRun | null>(null);

  const check = useCallback(async (extra?: string): Promise<CheckRun> => {
    if (!userId || !supabase) throw new Error('Could not connect. Please try again.');
    const [medRes, record] = await Promise.all([
      supabase.from('medications').select('name, start_date, end_date').eq('user_id', userId).order('name'),
      fetchMedicalRecord(userId),
    ]);
    if (medRes.error) throw medRes.error;
    const active = filterMedicationsActiveOn(openRows('medications', (medRes.data ?? []) as Record<string, unknown>[]) as Medication[], todayLocalDate());
    const names = safetyCheckNames(active.map((m) => m.name).sort((a, b) => a.localeCompare(b)), extra);
    const allergies = record?.known_allergies ?? [];
    const conditions = record?.known_conditions ?? [];
    const [result, hits] = await Promise.all([
      checkMedicationInteractions(names),
      checkRecordWarnings(
        names,
        (n) => (allergies.length ? checkDrugAllergies(n, allergies) : Promise.resolve([])),
        (n) => (conditions.length ? checkDrugConditions(n, conditions) : Promise.resolve([])),
      ),
    ]);
    return { result, items: buildSafetyItems(result.interactions, hits.allergyHits, hits.conditionHits), allergies, conditions };
  }, [userId]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRun(await check());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check your medications');
    }
  }, [check]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void load().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]));

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function checkCandidate() {
    const name = query.trim();
    if (!name || checking) return;
    tapFeedback();
    setChecking(true);
    setError(null);
    try {
      const r = await check(name);
      const row = r.result.resolved.find((x) => x.original.toLowerCase() === name.toLowerCase());
      const split = splitByCandidate(r.items, name, row?.canonical ?? null);
      setCandidate({ name, canonical: row?.canonical ?? null, matched: Boolean(row?.canonical), items: split.candidate });
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check that medication');
    } finally {
      setChecking(false);
    }
  }

  const verdict = run ? safetyVerdict(run.result, run.items, { allergies: run.allergies.length, conditions: run.conditions.length }) : null;
  const unmatched = run?.result.resolved.filter((r) => !r.canonical) ?? [];
  const vColor = verdict ? toneColor(verdict.tone, colors) : colors.textMuted;

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
      <AmbientScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.accent} />}>
        <View style={{ gap: 4 }}>
          <Text style={s.h1}>Drug safety check</Text>
          <Text style={s.sub}>Your medications checked against each other and your allergies and conditions.</Text>
        </View>

        {error ? (
          <View style={[s.banner, { borderColor: colors.errorBorder, backgroundColor: colors.errorBg }]}>
            <Text style={[s.body, { color: colors.error }]}>{error}</Text>
            <Pressable onPress={() => void refresh()} accessibilityRole="button"><Text style={s.link}>Try again</Text></Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={s.loading}><ActivityIndicator size="large" color={colors.accent} /><Text style={s.muted}>Checking your medications…</Text></View>
        ) : run && verdict ? (
          <>
            {/* Verdict: the answer first. */}
            <View style={[s.verdict, { backgroundColor: withAlpha(vColor, isDark ? 0.15 : 0.09), borderColor: withAlpha(vColor, 0.4) }]}>
              <Text style={[s.verdictIcon, { color: vColor }]}>{verdict.tone === 'danger' ? '⚠' : verdict.tone === 'clear' ? '✓' : verdict.tone === 'empty' ? '＋' : '!'}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.verdictTitle}>{verdict.title}</Text>
                <Text style={s.muted}>{verdict.detail}</Text>
                {verdict.tone === 'empty' ? (
                  <Pressable onPress={() => router.push(routes.medicationNew)} accessibilityRole="button"><Text style={s.link}>Add a medication ›</Text></Pressable>
                ) : null}
                {unmatched.length ? (
                  <Text style={s.muted}>Not checked: <Text style={s.strong}>{unmatched.map((u) => u.original).join(', ')}</Text>. Try the generic name, e.g. ibuprofen instead of Advil.</Text>
                ) : null}
                {run.allergies.length + run.conditions.length === 0 && verdict.tone !== 'empty' ? (
                  <Pressable onPress={() => router.push(routes.medicalRecords)} accessibilityRole="link">
                    <Text style={s.muted}>Allergies and conditions aren't checked yet. <Text style={s.link}>Add them in Medical records ›</Text></Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {run.items.length ? (
              <View style={{ gap: 10 }}>
                {run.items.map((item) => <WarningCard key={item.key} item={item} />)}
              </View>
            ) : null}

            {/* Try a medicine before taking it. */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Thinking of taking something new?</Text>
              <Text style={s.muted}>Check a medicine against everything above before you take it. It won't be added to your list.</Text>
              <MedicationNameInput value={query} onChange={setQuery} placeholder="e.g. ibuprofen, Advil, Benadryl" />
              <Pressable style={[s.primary, (!query.trim() || checking) && s.disabled]} disabled={!query.trim() || checking} onPress={() => void checkCandidate()} accessibilityRole="button">
                {checking ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.primaryText}>Check it</Text>}
              </Pressable>
              {candidate ? (
                <View style={s.candidate}>
                  <View style={s.rowBetween}>
                    <Text style={s.cardTitle}>{candidate.name}{candidate.canonical && candidate.canonical !== candidate.name.toLowerCase() ? <Text style={s.muted}>{`  (${candidate.canonical})`}</Text> : null}</Text>
                    <Pressable onPress={() => setCandidate(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear this check"><Text style={s.muted}>Clear</Text></Pressable>
                  </View>
                  {!candidate.matched && !candidate.items.length ? (
                    <Text style={s.body}>We couldn't match this name, so it wasn't checked. Try the generic name or check the spelling.</Text>
                  ) : candidate.items.length ? (
                    candidate.items.map((item) => <WarningCard key={item.key} item={item} />)
                  ) : (
                    <Text style={[s.body, { color: colors.accentGreen }]}>✓ No known problems with your current medications, allergies or conditions.</Text>
                  )}
                </View>
              ) : null}
            </View>

            {/* What went into the check. */}
            <CollapsibleSection title="What was checked" summary={`${run.result.inputNames.length} medications · ${run.allergies.length} allergies · ${run.conditions.length} conditions`}>
              <View style={{ gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={s.label}>Medications</Text>
                  {run.result.resolved.length ? run.result.resolved.map((r) => (
                    <Text key={r.original} style={s.body}>
                      {r.original}
                      {r.canonical && r.canonical !== r.original.toLowerCase() ? <Text style={s.muted}>{`  → ${r.canonical}`}</Text> : null}
                      {!r.canonical ? <Text style={{ color: colors.accentAmber }}>  not matched</Text> : null}
                    </Text>
                  )) : <Text style={s.muted}>None active today</Text>}
                  <Pressable onPress={() => router.push(routes.today)} accessibilityRole="link"><Text style={s.link}>Manage on Today ›</Text></Pressable>
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={s.label}>Allergies and conditions</Text>
                  <Text style={s.body}>{[...run.allergies, ...run.conditions].join(', ') || <Text style={s.muted}>None recorded</Text>}</Text>
                  <Pressable onPress={() => router.push(routes.medicalRecords)} accessibilityRole="link"><Text style={s.link}>Edit in Medical records ›</Text></Pressable>
                </View>
                <Text style={s.muted}>{run.result.pairCount} medication pair{run.result.pairCount === 1 ? '' : 's'} compared.</Text>
              </View>
            </CollapsibleSection>
          </>
        ) : null}

        <CollapsibleSection title="Limits and sources" summary="Not medical advice. Confirm with your pharmacist.">
          <View style={{ gap: 12 }}>
            <Text style={s.body}>This uses a limited reference database plus RxNorm name matching. It can't list every interaction or allergy, and it doesn't know your doses. Always confirm with your doctor or pharmacist.</Text>
            <MedicalSourcesCard />
          </View>
        </CollapsibleSection>
      </AmbientScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20, paddingBottom: 40, gap: 16 },
    h1: { fontSize: 26, fontFamily: fonts.heading, color: c.text },
    sub: { fontFamily: fonts.bodyRegular, color: c.textMuted, lineHeight: 20 },
    banner: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: 8 },
    loading: { alignItems: 'center' as const, padding: spacing.xl, gap: spacing.sm },
    verdict: { flexDirection: 'row' as const, gap: 12, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1 },
    verdictIcon: { fontSize: 22, lineHeight: 26, fontFamily: fonts.bodyBold, width: 22, textAlign: 'center' as const },
    verdictTitle: { fontFamily: fonts.heading, fontSize: 18, color: c.text },
    warning: { backgroundColor: c.surface, borderRadius: radii.md, padding: 14, gap: 6, borderLeftWidth: 4 },
    badge: { alignSelf: 'flex-start' as const, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 12 },
    warningTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.text },
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.lg, gap: 10 },
    cardTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.text, flexShrink: 1 },
    candidate: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderColor: c.border },
    rowBetween: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
    primary: { minHeight: 46, borderRadius: radii.md, backgroundColor: c.accent, alignItems: 'center' as const, justifyContent: 'center' as const },
    primaryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.onAccent },
    disabled: { opacity: 0.5 },
    label: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, color: c.textMuted, textTransform: 'uppercase' as const },
    body: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: c.text },
    muted: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
    strong: { fontFamily: fonts.bodySemibold, color: c.text },
    link: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.accent },
  };
}
