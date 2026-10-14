import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { routes } from '../../lib/routes';
import { NavigationRow } from '../../components/forms/NavigationRow';
import { MedicalRecordsForm } from '../../components/medicalRecords/MedicalRecordsForm';
import { DoctorReportCard } from '../../components/medicalRecords/DoctorReportCard';
import { fonts, radii, spacing, withAlpha, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { useMedicalSummaryData } from '../../hooks/useMedicalSummaryData';
import { formatHeightForUnit, formatWeightForUnit, normalizeBodyMetricUnit } from '../../lib/bodyMetrics';
import { todayLocalDate } from '../../lib/dates';
import { tapFeedback } from '../../lib/haptics';
import {
  DETAILS_MIGRATION_NOTICE,
  emptyMedicalRecordInput,
  fetchMedicalRecord,
  isMedicalRecordFilled,
  recordToInput,
  upsertMedicalRecord,
  type MedicalRecordInput,
} from '../../lib/medicalRecords';
import {
  ALLERGY_SEVERITIES,
  CONDITION_STATUSES,
  cleanDetails,
  familyText,
  isSevere,
  recordCompleteness,
  reviewStatus,
  surgeriesText,
} from '../../lib/medicalRecordDetails';
import { buildCareTeam, buildMedicalHistoryHtml, sortedAllergies } from '../../lib/medicalSummary';
import { ageFromDateOfBirth, genderLabel } from '../../lib/profileStats';
import { AmbientScrollView } from '../../components/AmbientBackground';

/** Old free-text history becomes list rows the first time the record is opened. */
function seedLists(input: MedicalRecordInput): MedicalRecordInput {
  const d = input.details;
  const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    ...input,
    details: {
      ...d,
      surgeries: d.surgeries.length ? d.surgeries : lines(input.past_surgeries).map((name) => ({ name })),
      family: d.family.length ? d.family : lines(input.family_history).map((condition) => ({ condition })),
    },
  };
}

function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export default function MedicalRecordsScreen() {
  const { colors, isDark } = useTheme();
  const s = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const router = useRouter();
  const today = todayLocalDate();
  const [draft, setDraft] = useState<MedicalRecordInput>(emptyMedicalRecordInput());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const draftDirtyRef = useRef(false);
  const savedInputRef = useRef<MedicalRecordInput>(emptyMedicalRecordInput());
  const userId = user?.id;
  useFocusEffect(useCallback(() => { if (!draftDirtyRef.current) setReloadKey((k) => k + 1); }, []));
  const { medications, visits } = useMedicalSummaryData(userId, reloadKey);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoadFailed(false);
    fetchMedicalRecord(userId)
      .then((record) => {
        if (!active || draftDirtyRef.current) return;
        const next = seedLists(recordToInput(record));
        savedInputRef.current = next;
        setDraft(next);
        if (!isMedicalRecordFilled(next)) setEditing(true);
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadFailed(true);
          setError(err instanceof Error ? err.message : 'Failed to load medical record');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  function startEdit(section: string | null = null) {
    tapFeedback();
    setFocus(section);
    setEditing(true);
    setMessage(null);
  }

  async function save(input: MedicalRecordInput, doneMessage = 'Medical record saved.') {
    if (!userId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const details = { ...cleanDetails(input.details, input.known_allergies, input.known_conditions), reviewedAt: today };
      const toSave: MedicalRecordInput = {
        ...input,
        details,
        past_surgeries: details.surgeries.length ? surgeriesText(details.surgeries) : '',
        family_history: details.family.length ? familyText(details.family) : '',
      };
      const saved = await upsertMedicalRecord(userId, toSave);
      const next = seedLists({ ...recordToInput(saved), details: saved.detailsUnsaved ? details : recordToInput(saved).details });
      savedInputRef.current = next;
      setDraft(next);
      draftDirtyRef.current = false;
      setNotice(saved.detailsUnsaved ? DETAILS_MIGRATION_NOTICE : null);
      setMessage(doneMessage);
      setEditing(false);
      setFocus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save medical record');
    } finally {
      setBusy(false);
    }
  }

  const d = draft.details;
  const age = draft.date_of_birth ? ageFromDateOfBirth(draft.date_of_birth) : null;
  const sex = genderLabel(draft.gender);
  const heightLabel = formatHeightForUnit(draft.height_cm ? Number(draft.height_cm) : null, normalizeBodyMetricUnit(draft.height_unit));
  const weightLabel = formatWeightForUnit(draft.weight_kg ? Number(draft.weight_kg) : null, normalizeBodyMetricUnit(draft.weight_unit));
  const completeness = recordCompleteness(draft, d);
  const doneCount = completeness.filter((c) => c.done).length;
  const review = reviewStatus(d.reviewedAt, today);
  const careTeam = useMemo(() => buildCareTeam(d.careTeam, visits, today), [d.careTeam, visits, today]);
  const allergies = sortedAllergies(draft.known_allergies, d);
  const severeAllergies = allergies.filter((a) => isSevere(d.allergies[a]));
  const activeConditions = draft.known_conditions.filter((c) => d.conditions[c]?.status !== 'resolved');
  const ec = d.emergencyContact;
  const historyHtml = useMemo(
    () =>
      buildMedicalHistoryHtml({
        ageYears: age,
        dateOfBirth: draft.date_of_birth,
        sex,
        heightLabel,
        weightLabel,
        bloodType: draft.blood_type,
        allergies: draft.known_allergies,
        conditions: draft.known_conditions,
        pastSurgeriesText: draft.past_surgeries,
        familyHistoryText: draft.family_history,
        emergencyNotes: draft.emergency_notes,
        otherNotes: draft.other_notes,
        details: d,
        medications,
        visits,
        today,
      }),
    [age, draft, d, sex, heightLabel, weightLabel, medications, visits, today],
  );
  const severityColor = (sev?: string) =>
    sev === 'anaphylaxis' || sev === 'severe' ? colors.error : sev === 'moderate' ? colors.accentAmber : colors.textMuted;

  const banners = (
    <>
      {error ? <View style={[s.banner, s.bannerError]}><Text style={s.bannerErrorText}>{error}</Text></View> : null}
      {notice ? <View style={[s.banner, s.bannerWarn]}><Text style={s.bannerWarnText}>{notice}</Text></View> : null}
      {message ? <View style={[s.banner, s.bannerSuccess]}><Text style={s.bannerSuccessText}>{message}</Text></View> : null}
    </>
  );

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
      <AmbientScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.h1}>Medical records</Text>
            <Text style={s.sub}>Your health history in one place, ready for any doctor.</Text>
          </View>
          {!loading && !loadFailed && !editing && isMedicalRecordFilled(draft) ? (
            <Pressable onPress={() => startEdit()} style={s.editBtn} accessibilityRole="button">
              <Text style={s.editText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        {banners}

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : loadFailed ? (
          <NavigationRow title="Try loading again" subtitle="Your saved record has not been changed." onPress={() => { setLoading(true); setReloadKey((k) => k + 1); }} />
        ) : editing ? (
          <>
            <MedicalRecordsForm value={draft} onChange={(next) => { draftDirtyRef.current = true; setDraft(next); }} onSubmit={() => void save(draft)} busy={busy} focus={focus} />
            {isMedicalRecordFilled(savedInputRef.current) ? (
              <Pressable style={s.cancel} disabled={busy} onPress={() => { setDraft(savedInputRef.current); draftDirtyRef.current = false; setEditing(false); setFocus(null); setError(null); }} accessibilityRole="button">
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            {/* Emergency card: what someone needs in seconds. */}
            <View style={[s.emergency, { backgroundColor: withAlpha(colors.error, isDark ? 0.14 : 0.08), borderColor: withAlpha(colors.error, 0.35) }]}>
              <View style={s.emergencyHead}>
                <Text style={[s.eyebrow, { color: colors.error }]}>IN AN EMERGENCY</Text>
                {draft.blood_type && draft.blood_type !== 'unknown' ? <Text style={[s.blood, { color: colors.error }]}>{draft.blood_type}</Text> : null}
              </View>
              <Text style={s.emLine}>
                <Text style={s.emLabel}>Allergies: </Text>
                {severeAllergies.length ? severeAllergies.join(', ') : allergies.length ? 'none severe' : d.noKnownAllergies ? 'no known allergies' : 'not recorded'}
              </Text>
              {activeConditions.length ? <Text style={s.emLine}><Text style={s.emLabel}>Conditions: </Text>{activeConditions.join(', ')}</Text> : null}
              {draft.emergency_notes.trim() ? <Text style={s.emLine}><Text style={s.emLabel}>Notes: </Text>{draft.emergency_notes.trim()}</Text> : null}
              {ec.name ? (
                <Pressable disabled={!ec.phone} onPress={() => ec.phone && void Linking.openURL(telUrl(ec.phone))} accessibilityRole={ec.phone ? 'link' : undefined}>
                  <Text style={s.emLine}>
                    <Text style={s.emLabel}>Contact: </Text>
                    {ec.name}{ec.relation ? ` (${ec.relation})` : ''}{ec.phone ? <Text style={s.phone}>{`  ${ec.phone}`}</Text> : null}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => startEdit('emergency')} accessibilityRole="button"><Text style={s.addLink}>+ Add an emergency contact</Text></Pressable>
              )}
            </View>

            {/* Completeness and freshness. */}
            <View style={s.card}>
              <View style={s.rowBetween}>
                <Text style={s.cardTitle}>{doneCount === completeness.length ? 'Your record is complete' : `${doneCount} of ${completeness.length} filled in`}</Text>
                <Text style={[s.reviewed, review.stale && { color: colors.accentAmber }]}>{review.label}</Text>
              </View>
              <View style={s.bar}>
                {completeness.map((c) => <View key={c.key} style={[s.barSeg, { backgroundColor: c.done ? colors.accentGreen : withAlpha(colors.textMuted, 0.25) }]} />)}
              </View>
              {completeness.filter((c) => !c.done).slice(0, 3).map((c) => (
                <Pressable key={c.key} onPress={() => startEdit(c.key === 'basics' ? 'basics' : c.key)} style={s.todo} accessibilityRole="button">
                  <Text style={s.todoText}>+ Add {c.label.toLowerCase()}</Text>
                </Pressable>
              ))}
              {review.stale && d.reviewedAt ? (
                <Pressable onPress={() => void save(draft, 'Marked as up to date.')} disabled={busy} style={s.todo} accessibilityRole="button">
                  <Text style={s.todoText}>✓ It's all still correct</Text>
                </Pressable>
              ) : null}
            </View>

            <DoctorReportCard userId={userId} userEmail={user?.email} medicalHistoryHtml={historyHtml} refreshKey={reloadKey} />

            {/* The record itself. */}
            <View style={s.card}>
              <Section title="About you" onEdit={() => startEdit('basics')}>
                <Text style={s.value}>
                  {[age != null ? `${age} years` : null, sex, draft.blood_type && draft.blood_type !== 'unknown' ? `Blood type ${draft.blood_type}` : null].filter(Boolean).join(' · ') || 'Not recorded'}
                </Text>
                {heightLabel || weightLabel ? (
                  <Pressable onPress={() => router.push(routes.tracking)} accessibilityRole="link">
                    <Text style={s.muted}>{[heightLabel, weightLabel].filter(Boolean).join(' · ')}  <Text style={s.linkText}>Tracking ›</Text></Text>
                  </Pressable>
                ) : null}
              </Section>

              <Section title="Allergies" onEdit={() => startEdit('allergies')}>
                {allergies.length ? (
                  allergies.map((a) => {
                    const ad = d.allergies[a];
                    return (
                      <View key={a} style={s.item}>
                        <View style={[s.dot, { backgroundColor: severityColor(ad?.severity) }]} />
                        <Text style={s.value}>
                          {a}
                          {ad?.reaction || ad?.severity ? <Text style={s.muted}>{`  ${[ad.reaction, ALLERGY_SEVERITIES.find((x) => x.id === ad.severity)?.label].filter(Boolean).join(' · ')}`}</Text> : null}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={s.muted}>{d.noKnownAllergies ? 'No known allergies' : 'Not recorded'}</Text>
                )}
              </Section>

              <Section title="Conditions" onEdit={() => startEdit('conditions')}>
                {draft.known_conditions.length ? (
                  draft.known_conditions.map((c) => {
                    const cd = d.conditions[c];
                    return (
                      <Text key={c} style={[s.value, cd?.status === 'resolved' && s.resolved]}>
                        {c}
                        {cd?.status || cd?.since ? <Text style={s.muted}>{`  ${[CONDITION_STATUSES.find((x) => x.id === cd.status)?.label, cd.since ? `since ${cd.since}` : null].filter(Boolean).join(' · ')}`}</Text> : null}
                      </Text>
                    );
                  })
                ) : (
                  <Text style={s.muted}>Not recorded</Text>
                )}
              </Section>

              <Section title="Current medications" actionLabel="Today ›" onEdit={() => router.push(routes.today)}>
                {medications.length ? (
                  medications.map((m) => (
                    <Text key={m.name} style={s.value}>
                      {m.name}
                      <Text style={s.muted}>{`  ${[m.dose, m.schedule].filter(Boolean).join(' · ')}`}</Text>
                    </Text>
                  ))
                ) : (
                  <Text style={s.muted}>None. Medications you add on Today show here.</Text>
                )}
              </Section>

              <Section title="Surgeries and family history" onEdit={() => startEdit('history')}>
                {d.surgeries.map((x, i) => <Text key={`s${i}`} style={s.value}>{x.name}{x.year ? <Text style={s.muted}>{`  ${x.year}`}</Text> : null}</Text>)}
                {d.family.map((x, i) => <Text key={`f${i}`} style={s.value}>{x.condition}{x.relative ? <Text style={s.muted}>{`  ${x.relative.toLowerCase()}`}</Text> : null}</Text>)}
                {!d.surgeries.length && !d.family.length ? <Text style={s.muted}>Not recorded</Text> : null}
              </Section>

              <Section title="Vaccinations" onEdit={() => startEdit('vaccines')}>
                {d.vaccines.length ? d.vaccines.map((v, i) => <Text key={i} style={s.value}>{v.name}{v.date ? <Text style={s.muted}>{`  ${v.date}`}</Text> : null}</Text>) : <Text style={s.muted}>Not recorded</Text>}
              </Section>

              <Section title="Care team" onEdit={() => startEdit('careTeam')} last={!draft.other_notes.trim()}>
                {careTeam.length ? (
                  careTeam.map((c, i) => (
                    <Pressable key={i} disabled={!c.phone} onPress={() => c.phone && void Linking.openURL(telUrl(c.phone))} accessibilityRole={c.phone ? 'link' : undefined}>
                      <Text style={s.value}>
                        {c.name}
                        <Text style={s.muted}>{`  ${[c.role, c.fromVisits ? 'from your visits' : null].filter(Boolean).join(' · ')}`}</Text>
                        {c.phone ? <Text style={s.phone}>{`  ${c.phone}`}</Text> : null}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={s.muted}>Add your primary doctor and pharmacy</Text>
                )}
              </Section>

              {draft.other_notes.trim() ? (
                <Section title="Other notes" onEdit={() => startEdit('emergency')} last>
                  <Text style={s.value}>{draft.other_notes.trim()}</Text>
                </Section>
              ) : null}
            </View>

            <NavigationRow title="Drug safety check" subtitle="Check your medications against these allergies and conditions" onPress={() => router.push(routes.interactions)} />
          </>
        )}
      </AmbientScrollView>
    </SafeAreaView>
  );
}

function Section({ title, onEdit, actionLabel = 'Edit', last, children }: { title: string; onEdit: () => void; actionLabel?: string; last?: boolean; children: React.ReactNode }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={[s.section, last && { borderBottomWidth: 0 }]}>
      <View style={s.rowBetween}>
        <Text style={s.sectionTitle}>{title}</Text>
        <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${actionLabel === 'Edit' ? 'Edit' : 'Open'} ${title}`}>
          <Text style={s.linkText}>{actionLabel}</Text>
        </Pressable>
      </View>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20, paddingBottom: 40, gap: 16 },
    header: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12 },
    h1: { fontSize: 26, fontFamily: fonts.heading, color: c.text },
    sub: { fontFamily: fonts.bodyRegular, color: c.textMuted, lineHeight: 20 },
    editBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center' as const, alignItems: 'flex-end' as const },
    editText: { fontFamily: fonts.bodySemibold, color: c.accent, fontSize: 16 },
    loading: { alignItems: 'center' as const, padding: spacing.xl },
    banner: { borderRadius: radii.md, padding: spacing.md, borderWidth: 1 },
    bannerError: { backgroundColor: c.errorBg, borderColor: c.errorBorder },
    bannerErrorText: { color: c.error, fontFamily: fonts.bodySemibold },
    bannerWarn: { backgroundColor: withAlpha(c.accentAmber, 0.12), borderColor: withAlpha(c.accentAmber, 0.4) },
    bannerWarnText: { color: c.text, fontFamily: fonts.bodyMedium, lineHeight: 20 },
    bannerSuccess: { backgroundColor: c.successBg, borderColor: c.successBorder },
    bannerSuccessText: { color: c.successText, fontFamily: fonts.bodySemibold },
    emergency: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, gap: 6 },
    emergencyHead: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 2 },
    eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4 },
    blood: { fontFamily: fonts.heading, fontSize: 20 },
    emLine: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 22, color: c.text },
    emLabel: { fontFamily: fonts.bodySemibold, color: c.text },
    phone: { fontFamily: fonts.bodySemibold, color: c.accent },
    addLink: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.accent, paddingTop: 4 },
    card: { backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.lg, gap: 10 },
    cardTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.text, flex: 1 },
    rowBetween: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
    reviewed: { fontFamily: fonts.bodyMedium, fontSize: 12, color: c.textMuted },
    bar: { flexDirection: 'row' as const, gap: 4 },
    barSeg: { flex: 1, height: 6, borderRadius: 3 },
    todo: { minHeight: 36, justifyContent: 'center' as const },
    todoText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.accent },
    section: { gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border },
    sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, color: c.textMuted, textTransform: 'uppercase' as const },
    linkText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.accent },
    item: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    value: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 22, color: c.text, flexShrink: 1 },
    resolved: { opacity: 0.6 },
    muted: { fontFamily: fonts.bodyRegular, fontSize: 13, color: c.textMuted },
    cancel: { alignSelf: 'center' as const, minHeight: 44, justifyContent: 'center' as const, paddingHorizontal: 16 },
    cancelText: { fontFamily: fonts.bodySemibold, color: c.textMuted, fontSize: 15 },
  };
}
