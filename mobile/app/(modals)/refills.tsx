import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { fonts, type ColorPalette } from '../../constants/theme';
import { EntryEditorScreen } from '../../components/forms/EntryEditorScreen';
import { CollapsibleSection } from '../../components/forms/CollapsibleSection';
import { useGroupedFormStyles } from '../../components/forms/groupedFormStyles';
import { fetchMedicationsWithStatus } from '../../lib/medications';
import { fetchRefillMedication, saveMedicationRefill } from '../../lib/refillManagement';
import { parseRefillCount, type RefillDraft } from '../../lib/refillForm';
import { formatInventoryCount, inventoryUnitLabel } from '../../lib/inventory';
import { rescheduleAllReminders } from '../../lib/reminders';
import { routes } from '../../lib/routes';
import type { MedicationWithStatus } from '../../lib/types';

export default function RefillsScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!user) return null;
  return typeof id === 'string' ? <RefillEditor key={`${user.id}:${id}`} userId={user.id} id={id} /> : <RefillList key={user.id} userId={user.id} />;
}
function RefillList({ userId }: { userId: string }) {
  const s = useThemedStyles(makeStyles);
  const router = useRouter();
  const [medications, setMedications] = useState<MedicationWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(null);
    fetchMedicationsWithStatus(userId).then((meds) => { if (active) setMedications([...meds].sort((a, b) => (a.pills_remaining ?? Infinity) - (b.pills_remaining ?? Infinity) || a.name.localeCompare(b.name))); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load refills.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, retry]));
  return <SafeAreaView style={s.safe} edges={['bottom']}>
    <Stack.Screen options={{ title: 'Refills', headerRight: () => <Pressable style={s.button} onPress={() => router.back()} accessibilityRole="button"><Text style={s.link}>Done</Text></Pressable> }} />
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Keep your supply up to date</Text><Text style={s.hint}>Choose a medication to record a refill or correct its remaining supply. Low counts appear first.</Text>
      {loading ? <ActivityIndicator /> : error ? <Pressable onPress={() => setRetry((v) => v + 1)} accessibilityRole="button"><Text style={s.error}>{error} Tap to retry.</Text></Pressable> : medications.length ? medications.map((med) => <Pressable key={med.id} style={s.card} onPress={() => router.push({ pathname: routes.refills, params: { id: med.id } })} accessibilityRole="button" accessibilityLabel={`Update refill for ${med.name}`}>
        <View style={s.row}><Text style={s.name}>{med.name}</Text><Text style={s.link}>›</Text></View>
        <Text style={s.hint}>{[med.dose_mg, med.dose_pills].filter(Boolean).join(' · ') || 'Medication supply'}</Text>
        <Text style={[s.supply, med.pills_remaining !== null && med.pills_remaining <= 7 && s.low]}>{med.pills_remaining === null ? 'Supply tracking off' : `${formatInventoryCount(med.pills_remaining, med)} remaining${med.pills_remaining <= 7 ? ' · Refill soon' : ''}`}</Text>
      </Pressable>) : <Text style={s.hint}>Your medications will appear here once you add them.</Text>}
    </ScrollView>
  </SafeAreaView>;
}
function RefillEditor({ userId, id }: { userId: string; id: string }) {
  const load = useCallback(async () => {
    const medication = await fetchRefillMedication(userId, id);
    const draft: RefillDraft = { name: medication.name, strength: medication.dose_mg ?? '', notes: medication.notes ?? '', trackSupply: medication.pills_remaining !== null, remaining: String(medication.pills_remaining ?? 0) };
    return { medication, draft };
  }, [userId, id]);
  return <EntryEditorScreen title="Update refill" subtitle="Record your new supply and review the medication details." load={load} save={async ({ medication, draft }) => {
    await saveMedicationRefill(userId, medication, draft);
    await rescheduleAllReminders(userId).catch(() => { /* Supply saved; reminders retry on next app open. */ });
  }}>
    {(value, onChange, busy) => <RefillFields draft={value.draft} onChange={(draft) => onChange({ ...value, draft })} unit={inventoryUnitLabel(value.medication)} dose={value.medication.dose_pills} busy={busy} />}
  </EntryEditorScreen>;
}
function RefillFields({ draft, onChange, unit, dose, busy }: { draft: RefillDraft; onChange: (value: RefillDraft) => void; unit: string; dose: string | null; busy: boolean }) {
  const s = useThemedStyles(makeStyles);
  const f = useGroupedFormStyles();
  const [added, setAdded] = useState('30');
  const [error, setError] = useState<string | null>(null);
  const patch = (values: Partial<RefillDraft>) => onChange({ ...draft, ...values });
  function adjust(delta: number) {
    try { const next = Math.max(0, parseRefillCount(draft.remaining) + delta); parseRefillCount(String(next)); patch({ remaining: String(next) }); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Check your count.'); }
  }
  return <View style={{ gap: 20 }}>
    <Text style={s.title}>{draft.name}</Text>
    <View style={f.group}><View style={f.row}><Text style={f.rowLabel}>Track remaining supply</Text><Switch value={draft.trackSupply} disabled={busy} onValueChange={(trackSupply) => patch({ trackSupply })} accessibilityLabel="Track remaining supply" /></View></View>
    {draft.trackSupply ? <View style={s.card}>
      <Text style={s.hint}>CURRENT {unit.toUpperCase()} REMAINING</Text>
      <View style={s.counter}>
        <Pressable style={s.step} disabled={busy || draft.remaining === '0'} onPress={() => adjust(-1)} accessibilityRole="button" accessibilityLabel={`Remove one ${unit}`}><Text style={s.stepText}>−</Text></Pressable>
        <TextInput style={s.count} value={draft.remaining} onChangeText={(remaining) => { patch({ remaining }); setError(null); }} editable={!busy} keyboardType="number-pad" selectTextOnFocus accessibilityLabel={`${unit} remaining`} />
        <Pressable style={s.step} disabled={busy} onPress={() => adjust(1)} accessibilityRole="button" accessibilityLabel={`Add one ${unit}`}><Text style={s.stepText}>+</Text></Pressable>
      </View>
      <Text style={s.hint}>Set your total supply above, or add the quantity you just picked up below.</Text>
      <View style={s.row}><TextInput style={[f.input, s.addInput]} value={added} onChangeText={setAdded} keyboardType="number-pad" editable={!busy} accessibilityLabel={`Refill quantity in ${unit}`} /><Pressable style={s.button} disabled={busy} accessibilityRole="button" onPress={() => {
        try { const amount = parseRefillCount(added); if (!amount) throw new Error('Enter a refill quantity greater than zero.'); adjust(amount); }
        catch (err) { setError(err instanceof Error ? err.message : 'Check your refill quantity.'); }
      }}><Text style={s.link}>Add refill</Text></Pressable></View>
      {error ? <Text style={s.error} accessibilityRole="alert">{error}</Text> : null}
      <Text style={s.hint}>Low-supply reminders use the existing threshold of 7 remaining. {dose ? `Current dose: ${dose}.` : ''}</Text>
    </View> : <Text style={s.hint}>Turn on supply tracking to keep a count and receive low-supply reminders.</Text>}
    <CollapsibleSection title="Medication details" summary="Name, strength, and instructions">
      <View style={f.group}>{([{ key: 'name', label: 'Medication name' }, { key: 'strength', label: 'Strength · include units' }, { key: 'notes', label: 'Notes / instructions' }] as const).map(({ key, label }, index) => <View key={key}>
        {index ? <View style={f.divider} /> : null}<View style={f.field}><Text style={f.label}>{label}</Text><TextInput style={[f.input, key === 'notes' && f.textarea]} value={draft[key]} onChangeText={(text) => patch({ [key]: text })} editable={!busy} multiline={key === 'notes'} accessibilityLabel={label} /></View>
      </View>)}</View>
    </CollapsibleSection>
    <Text style={s.hint}>Changes are applied when you tap Save.</Text>
  </View>;
}
function makeStyles(c: ColorPalette) {
  return { safe: { flex: 1, backgroundColor: c.bg }, content: { padding: 20, gap: 14, paddingBottom: 40 }, title: { fontFamily: fonts.heading, fontSize: 23, color: c.text }, hint: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 20, color: c.textMuted }, card: { padding: 18, gap: 12, borderRadius: 18, backgroundColor: c.surface }, row: { flexDirection: 'row' as const, gap: 12, alignItems: 'center' as const }, name: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 17, color: c.text }, supply: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.text }, low: { color: c.partialText }, link: { color: c.accent, fontFamily: fonts.bodySemibold, fontSize: 15 }, button: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, justifyContent: 'center' as const }, error: { color: c.error, fontSize: 13, lineHeight: 20 }, counter: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 }, step: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg, alignItems: 'center' as const, justifyContent: 'center' as const }, stepText: { color: c.accent, fontSize: 26 }, count: { flex: 1, minHeight: 70, textAlign: 'center' as const, color: c.text, fontFamily: fonts.heading, fontSize: 36 }, addInput: { flex: 1, backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 } };
}
