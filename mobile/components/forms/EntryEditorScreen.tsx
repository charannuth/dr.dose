import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { useHeaderHeight, usePreventRemove } from 'expo-router/react-navigation';
import { useReducedMotion } from 'react-native-reanimated';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';

/** Shared load → edit → save screen with draft protection and native navigation. */
export function EntryEditorScreen<T>({ title, subtitle, load, save, children }: {
  title: string; subtitle: string; load: () => Promise<T>; save: (value: T) => Promise<unknown>;
  children: (value: T, onChange: (next: T) => void, busy: boolean) => ReactNode;
}) {
  const s = useThemedStyles(makeStyles);
  const router = useRouter();
  const navigation = useNavigation();
  const height = useHeaderHeight();
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState<T | null>(null);
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const dirty = draft !== null && JSON.stringify(draft) !== baseline;
  usePreventRemove(!leaving && (busy || dirty), ({ data }) => {
    if (busy) return;
    Alert.alert('Discard changes?', 'Your changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    load().then((value) => { if (active) { setDraft(value); setBaseline(JSON.stringify(value)); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load this entry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, retry]);
  useEffect(() => { if (leaving) router.back(); }, [leaving, router]);
  async function submit() {
    if (draft === null || saving.current) return;
    Keyboard.dismiss(); saving.current = true; setBusy(true); setError(null);
    try { await save(draft); setBaseline(JSON.stringify(draft)); setLeaving(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Your changes are still here.'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <SafeAreaView edges={['bottom']} style={s.safe}>
    <Stack.Screen options={{ title, headerBackVisible: false, headerShadowVisible: false, animation: reduced ? 'none' : 'slide_from_right', headerStyle: { backgroundColor: s.safe.backgroundColor },
      headerLeft: () => <Pressable style={s.action} disabled={busy} onPress={() => router.back()} accessibilityRole="button"><Text style={s.link}>Cancel</Text></Pressable>,
      headerRight: () => <Pressable style={s.action} disabled={busy || loading || draft === null} onPress={() => void submit()} accessibilityRole="button" accessibilityState={{ disabled: busy || loading || draft === null }}><Text style={[s.link, (loading || busy || draft === null) && { opacity: 0.4 }]}>{busy ? 'Saving…' : 'Save'}</Text></Pressable>,
    }} />
    <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={height}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content}>
        <Text style={s.subtitle}>{subtitle}</Text>
        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator accessibilityLabel="Loading entry" /> : draft === null ? <Pressable style={s.action} onPress={() => setRetry((v) => v + 1)} accessibilityRole="button"><Text style={s.link}>Try again</Text></Pressable> : <View pointerEvents={busy ? 'none' : 'auto'}>{children(draft, setDraft, busy)}</View>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function makeStyles(c: ColorPalette) {
  return { safe: { flex: 1, backgroundColor: c.bg }, content: { padding: 20, paddingBottom: 40, gap: 20 }, action: { minWidth: 44, minHeight: 44, justifyContent: 'center' as const }, link: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.accent }, subtitle: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: c.textMuted }, error: { color: c.error, fontSize: 14, lineHeight: 21 } };
}
