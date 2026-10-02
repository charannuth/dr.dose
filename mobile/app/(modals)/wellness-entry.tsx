import { useCallback } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EntryEditorScreen } from '../../components/forms/EntryEditorScreen';
import { WellnessDailyForm } from '../../components/WellnessDailyForm';
import { useAuth } from '../../hooks/useAuth';
import { emptyWellnessLogInput, fetchWellnessLog, fetchWellnessProfile, isWellnessLogFilled, logFromRow, upsertWellnessLog, type WellnessLogInput } from '../../lib/wellness';
import { todayLocalDate } from '../../lib/dates';
import { tryNormalizeIsoDate } from '../../lib/isoDateInput';
import { validateWellnessLog } from '../../lib/wellnessForm';

export default function WellnessEntryScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = tryNormalizeIsoDate(typeof params.date === 'string' ? params.date : todayLocalDate());
  if (!user || !date) return <Text>Return to Wellness and select a valid date.</Text>;
  return <Editor key={`${user.id}:${date}`} userId={user.id} date={date} />;
}
function Editor({ userId, date }: { userId: string; date: string }) {
  const load = useCallback(async () => {
    const [row, profile] = await Promise.all([fetchWellnessLog(userId, date), fetchWellnessProfile(userId)]);
    return { log: row ? logFromRow(row) : emptyWellnessLogInput(date), trackedSymptoms: profile?.symptom_focus ?? [] };
  }, [userId, date]);
  async function save(value: { log: WellnessLogInput; trackedSymptoms: string[] }) {
    validateWellnessLog(value.log, todayLocalDate());
    if (!isWellnessLogFilled(value.log)) throw new Error('Add at least one detail before saving this day.');
    await upsertWellnessLog(userId, value.log);
  }
  return <EntryEditorScreen title="Daily wellness" subtitle={new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} load={load} save={save}>
    {(value, onChange, busy) => <WellnessDailyForm value={value.log} onChange={(log) => onChange({ ...value, log })} busy={busy} trackedSymptoms={value.trackedSymptoms} hideSubmit onSubmit={() => {}} />}
  </EntryEditorScreen>;
}
