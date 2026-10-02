import { useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { EntryEditorScreen } from '../../components/forms/EntryEditorScreen';
import { WellnessBaselineForm } from '../../components/wellness/WellnessBaselineForm';
import { fetchWellnessProfile, profileToInput, upsertWellnessProfile, type WellnessProfileInput } from '../../lib/wellness';

export default function WellnessBaselineScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return <Editor key={user.id} userId={user.id} />;
}
function Editor({ userId }: { userId: string }) {
  const load = useCallback(async () => profileToInput(await fetchWellnessProfile(userId)), [userId]);
  const save = (value: WellnessProfileInput) => upsertWellnessProfile(userId, value);
  return <EntryEditorScreen title="Your baseline" subtitle="Your usual patterns and the symptoms you want to follow." load={load} save={save}>
    {(value, onChange, busy) => <WellnessBaselineForm value={value} onChange={onChange} busy={busy} hideSubmit onSubmit={() => {}} />}
  </EntryEditorScreen>;
}
