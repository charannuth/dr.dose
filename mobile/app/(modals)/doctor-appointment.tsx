import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useHeaderHeight, usePreventRemove } from 'expo-router/react-navigation';
import { useReducedMotion } from 'react-native-reanimated';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../hooks/useAuth';
import { DoctorAppointmentPanel } from '../../components/doctorVisits/DoctorAppointmentPanel';
import { DoctorVisitNotesPanel } from '../../components/doctorVisits/DoctorVisitNotesPanel';
import { AddToCalendar } from '../../components/doctorVisits/AddToCalendar';
import { deleteDoctorVisit, emptyDoctorVisitInput, fetchDoctorVisit, insertDoctorVisit, updateDoctorVisit, visitToInput, type DoctorVisit } from '../../lib/doctorVisits';
import { prepareDoctorVisitInput } from '../../lib/doctorVisitForm';
import { tryNormalizeIsoDate } from '../../lib/isoDateInput';
import { todayLocalDate } from '../../lib/dates';
import { rescheduleAllReminders } from '../../lib/reminders';
import { routes } from '../../lib/routes';

export default function AppointmentScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ date?: string; id?: string }>();
  const date = tryNormalizeIsoDate(typeof params.date === 'string' ? params.date : todayLocalDate());
  const id = typeof params.id === 'string' ? params.id : undefined;
  if (!user || !date) return <Text>Unable to open this appointment. Return to the calendar and select a date.</Text>;
  return <AppointmentEditor key={`${user.id}:${id ?? 'new'}:${date}`} userId={user.id} date={date} id={id} />;
}

function AppointmentEditor({ userId, date, id }: { userId: string; date: string; id?: string }) {
  const s = useThemedStyles(makeStyles);
  const router = useRouter();
  const navigation = useNavigation();
  const reducedMotion = useReducedMotion();
  const headerHeight = useHeaderHeight();
  const [draft, setDraft] = useState(() => emptyDoctorVisitInput(date));
  const [baseline, setBaseline] = useState(() => emptyDoctorVisitInput(date));
  const [saved, setSaved] = useState<DoctorVisit | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [ready, setReady] = useState(!id);
  const [busy, setBusy] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [retry, setRetry] = useState(0);
  const dirty = !deleted && JSON.stringify(draft) !== JSON.stringify(baseline);
  usePreventRemove(busy || dirty, ({ data }) => {
    if (busy) return;
    Alert.alert('Discard changes?', 'Your appointment changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true); setReady(false); setError(null);
    fetchDoctorVisit(userId, id).then((visit) => {
      if (!active) return;
      setSaved(visit); setDraft(visitToInput(visit)); setBaseline(visitToInput(visit)); setReady(true);
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load this appointment.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, id, retry]);
  function close() { if (router.canGoBack()) router.back(); else router.replace(routes.doctorVisits); }
  function syncReminders() { void rescheduleAllReminders(userId).catch(() => { /* Saved; reminders retry on next app open. */ }); }
  async function save() {
    if (savingRef.current || !ready || deleted) return;
    Keyboard.dismiss();
    setError(null); setMessage(null);
    let payload;
    try { payload = prepareDoctorVisitInput(draft); }
    catch (err) { setError(err instanceof Error ? err.message : 'Check the appointment details.'); return; }
    savingRef.current = true; setBusy(true);
    try {
      const visit = saved ? await updateDoctorVisit(userId, saved.id, payload) : await insertDoctorVisit(userId, payload);
      setSaved(visit); setDraft(visitToInput(visit)); setBaseline(visitToInput(visit));
      setMessage('Appointment saved. You can add a calendar copy below, or tap Done.');
      syncReminders();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your appointment. Try again.'); }
    finally { savingRef.current = false; setBusy(false); }
  }
  function remove() {
    if (!saved || savingRef.current) return;
    const visit = saved;
    Alert.alert('Delete appointment?', 'This removes the appointment and its notes from Dr. Dose. Calendar copies are managed separately.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void (async () => {
        if (savingRef.current) return;
        savingRef.current = true; setBusy(true); setError(null);
        try { await deleteDoctorVisit(userId, visit.id); setDeleted(true); setMessage('Appointment deleted.'); syncReminders(); }
        catch (err) { setError(err instanceof Error ? err.message : 'Could not delete the appointment.'); }
        finally { savingRef.current = false; setBusy(false); }
      })(); } },
    ]);
  }
  const done = deleted || Boolean(saved && !dirty);
  return <SafeAreaView style={s.safe} edges={['bottom']}>
    <Stack.Screen options={{ title: saved ? 'Appointment' : 'New appointment', headerStyle: { backgroundColor: s.safe.backgroundColor },
      animation: reducedMotion ? 'none' : 'slide_from_right', headerBackVisible: false,
      headerLeft: () => <Pressable style={s.action} disabled={busy} onPress={close} accessibilityRole="button"><Text style={s.actionText}>{saved ? 'Back' : 'Cancel'}</Text></Pressable>,
      headerRight: () => <Pressable style={s.action} disabled={busy || !ready} onPress={done ? close : () => void save()} accessibilityRole="button" accessibilityState={{ disabled: busy || !ready }}>
        <Text style={[s.actionText, (busy || !ready) && s.disabled]}>{busy ? 'Saving…' : done ? 'Done' : 'Save'}</Text>
      </Pressable>,
    }} />
    <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content}>
        <View style={s.intro}><Text style={s.date}>{new Date(`${draft.visit_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text style={s.subtitle}>{saved ? 'Your appointment details, all in one place.' : 'Make room for your next visit.'}</Text></View>
        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
        {message ? <Text accessibilityRole="alert" style={s.message}>{message}</Text> : null}
        {loading ? <ActivityIndicator accessibilityLabel="Loading appointment" /> : !ready ? <Pressable style={s.action} onPress={() => setRetry((v) => v + 1)} accessibilityRole="button"><Text style={s.actionText}>Try again</Text></Pressable> : !deleted ? <>
          <DoctorAppointmentPanel value={draft} onChange={(next) => { setDraft(next); setMessage(null); }} busy={busy} />
          {draft.visit_date <= todayLocalDate() ? <DoctorVisitNotesPanel value={draft} onChange={(next) => { setDraft(next); setMessage(null); }} busy={busy} /> : <Text style={s.subtitle}>You can add visit notes on the appointment day.</Text>}
          {saved && !dirty ? <AddToCalendar key={saved.updated_at} visit={saved} /> : saved ? <Text style={s.subtitle}>Save your changes before adding a calendar copy.</Text> : null}
          {saved ? <Pressable style={s.delete} disabled={busy} onPress={remove} accessibilityRole="button"><Text style={s.deleteText}>Delete appointment</Text></Pressable> : null}
        </> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function makeStyles(c: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: c.bg }, content: { padding: 20, paddingBottom: 40, gap: 24 },
    intro: { gap: 8, paddingBottom: 4 }, date: { fontFamily: fonts.heading, fontSize: 23, color: c.text },
    subtitle: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 20, color: c.textMuted },
    action: { minHeight: 44, minWidth: 44, justifyContent: 'center' as const },
    actionText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.accent }, disabled: { opacity: 0.4 },
    error: { fontSize: 14, lineHeight: 21, color: c.error }, message: { fontSize: 14, lineHeight: 21, color: c.successText },
    delete: { minHeight: 48, alignItems: 'center' as const, justifyContent: 'center' as const }, deleteText: { fontFamily: fonts.bodyMedium, color: c.error, fontSize: 15 },
  };
}
