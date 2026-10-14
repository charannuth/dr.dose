import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import type { ColorPalette } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useTrackerPrefs } from '../../hooks/useTrackerPrefs';
import { todayLocalDate } from '../../lib/dates';
import { successFeedback, tapFeedback } from '../../lib/haptics';
import type { TrackerAccent } from '../../lib/tracking/catalog';
import {
  buildFieldInsights,
  compactGenericEntry,
  defaultHero,
  entryHasData,
  normalizeGenericPrefs,
  num,
  sectionsFor,
  shiftDate,
  summarizeFields,
  type Entry,
  type FieldDef,
  type FieldInsight,
  type Flag,
  type GenericPrefs,
  type TrackerCtx,
  type TrackerDef,
} from '../../lib/tracking/genericTracker';
import {
  deleteTrackerDayEntry,
  fetchTrackerDayEntries,
  saveTrackerDayEntry,
  TrackerStoreUnavailableError,
  type JsonObject,
  type TrackerDayEntry,
} from '../../lib/tracking/trackerStore';
import { CycleDayStrip } from './CycleDayStrip';
import { GenericFieldInput } from './GenericFieldInput';
import { GenericPersonalizeSheet } from './GenericPersonalizeSheet';
import { TrackerHero } from './TrackerHero';
import { NoticeCard, SectionCard, SubLabel, useTrackerUIStyles } from './TrackerUI';
import { useTrackingStyles } from './trackingStyles';

type Props = {
  def: TrackerDef;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onDataMutated?: () => void;
};

export function accentColor(accent: TrackerAccent, colors: ColorPalette): string {
  switch (accent) {
    case 'red':
      return colors.accentRed;
    case 'purple':
      return colors.accentPurple;
    case 'blue':
      return colors.accentBlue;
    case 'green':
      return colors.accentGreen;
    default:
      return colors.accentAmber;
  }
}

function monthBounds(date: string): { start: string; end: string } {
  const d = new Date(`${date}T12:00:00`);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const mm = String(m).padStart(2, '0');
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}` };
}

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function longDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const identity = (raw: JsonObject): Entry => raw;

/** Number fields are typed as text; store them as numbers. */
function toStored(fields: FieldDef[], data: Entry): Entry {
  const out: Entry = { ...data };
  for (const f of fields) {
    if (f.type === 'number' && out[f.id] != null) out[f.id] = num(out[f.id]);
  }
  return compactGenericEntry(out);
}

function insightLine(i: FieldInsight): string {
  if (i.kind === 'counts') return i.top.map((t) => `${t.value} (${t.count})`).join(', ');
  if (i.kind === 'days') return `${i.days} day${i.days === 1 ? '' : 's'}`;
  const unit = i.unit ? ` ${i.unit}` : '';
  let trend = '';
  if (i.recent != null && i.previous != null && i.recent !== i.previous) {
    trend = i.recent > i.previous ? ` · ↑ ${i.recent} this week` : ` · ↓ ${i.recent} this week`;
  }
  return `avg ${i.avg}${unit}${trend}`;
}

export function GenericTrackerPanel({ def, selectedDate, onSelectDate, onDataMutated }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const trackingStyles = useTrackingStyles();
  const ui = useTrackerUIStyles();
  const today = todayLocalDate();
  const isFutureDay = selectedDate > today;
  const accent = accentColor(def.accent, colors);

  const normalize = useCallback((raw: JsonObject) => normalizeGenericPrefs(def, raw), [def]);
  const { prefs, available: storeAvailable, loaded: prefsLoaded, save: savePrefs, setAvailable } =
    useTrackerPrefs<GenericPrefs>(user?.id, def.id, normalize);

  const [entries, setEntries] = useState<TrackerDayEntry<Entry>[]>([]);
  const [draft, setDraft] = useState<Entry>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  // Visible month plus ~4 months of history for streaks, flags and patterns.
  const range = useMemo(() => {
    const bounds = monthBounds(selectedDate);
    const history = shiftDate(today, -120);
    return { from: bounds.start < history ? bounds.start : history, to: bounds.end > today ? bounds.end : today };
  }, [selectedDate, today]);

  const reload = useCallback(async () => {
    if (!user) return;
    const res = await fetchTrackerDayEntries<Entry>(user.id, def.id, range.from, range.to, identity);
    setEntries(res.entries);
    if (!res.available) setAvailable(false);
  }, [user, def.id, range, setAvailable]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    reload()
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your log');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, reload]);

  const saved = useMemo(() => entries.find((e) => e.log_date === selectedDate)?.data, [entries, selectedDate]);
  const resetDraft = useCallback(() => setDraft(saved ?? {}), [saved]);
  useEffect(() => {
    resetDraft();
  }, [resetDraft]);
  useEffect(() => {
    setSavedNote(null);
  }, [selectedDate]);

  const dayHasLog = useCallback(
    (date: string) => entries.some((e) => e.log_date === date && entryHasData(e.data)),
    [entries],
  );

  const allSections = sectionsFor(def, prefs);
  const visibleSections = allSections.filter((s) => prefs.sections[s.key] !== false);
  const allFields = allSections.flatMap((s) => s.fields);

  const ctx: TrackerCtx = useMemo(
    () => ({
      prefs,
      history: entries.filter((e) => e.log_date !== selectedDate),
      day: draft,
      date: selectedDate,
      today,
    }),
    [prefs, entries, selectedDate, draft, today],
  );

  const hero = def.hero ? def.hero(ctx) : defaultHero(def, ctx);
  const flags: Flag[] = isFutureDay ? [] : def.flags?.(ctx) ?? [];
  const insights = useMemo(() => {
    const all = entries.filter((e) => e.log_date !== selectedDate);
    if (entryHasData(draft) && selectedDate <= today) all.push({ log_date: selectedDate, data: draft });
    return buildFieldInsights(def, prefs, all, today);
  }, [def, prefs, entries, draft, selectedDate, today]);

  function patch(id: string, value: unknown) {
    setDraft((d) => ({ ...d, [id]: value }));
  }

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError(null);
    setSavedNote(null);
    try {
      await action();
      await reload();
      onDataMutated?.();
      successFeedback();
      setSavedNote(done);
    } catch (err) {
      if (err instanceof TrackerStoreUnavailableError) setAvailable(false);
      else setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  function saveDay() {
    if (!user || isFutureDay) return;
    const data = toStored(allFields, draft);
    void run(() => saveTrackerDayEntry(user.id, def.id, selectedDate, data), 'Saved ✓');
  }

  function clearDay() {
    if (!user) return;
    Alert.alert('Clear this day?', `Delete everything logged for ${longDate(selectedDate)} in ${def.label}.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => void run(() => deleteTrackerDayEntry(user.id, def.id, selectedDate), 'Day cleared'),
      },
    ]);
  }

  function addOption(fieldId: string, option: string) {
    const current = prefs.customOptions[fieldId] ?? [];
    if (current.includes(option)) return;
    savePrefs({ ...prefs, customOptions: { ...prefs.customOptions, [fieldId]: [...current, option].slice(-40) } }).catch(
      (err: unknown) => {
        if (err instanceof TrackerStoreUnavailableError) setAvailable(false);
      },
    );
  }

  if (!user) return null;
  if (loading && entries.length === 0) {
    return <ActivityIndicator color={accent} style={{ marginVertical: 16 }} />;
  }

  const fieldCtx = { data: draft, prefs };
  const title = def.id === 'custom' && typeof prefs.setup.name === 'string' && prefs.setup.name.trim() ? prefs.setup.name.trim() : def.label;
  const hasSaved = Boolean(saved && entryHasData(saved));

  return (
    <View>
      <TrackerHero
        accent={accent}
        eyebrow={`${def.emoji} ${title}`}
        title={hero.title}
        subtitle={hero.subtitle ?? null}
        progress={hero.progress ?? null}
        centerValue={hero.center}
        centerCaption={hero.caption}
        pills={(hero.pills ?? []).map((label) => ({ label, color: accent }))}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={[trackingStyles.hint, { flex: 1, marginBottom: 0, fontSize: 13 }]}>🔒 {def.intro}</Text>
        <Pressable
          onPress={() => {
            tapFeedback();
            setPersonalizeOpen(true);
          }}
          style={{ borderRadius: 999, borderWidth: 1, borderColor: accent, paddingHorizontal: 12, paddingVertical: 7 }}
          accessibilityRole="button"
        >
          <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>✨ Make it yours</Text>
        </Pressable>
      </View>

      {!storeAvailable ? (
        <NoticeCard
          emoji="🛠️"
          title="This tracker can't save yet"
          body="It needs database migration 030 (tracker_preferences and tracker_day_entries). Once it's applied, everything here saves and stays encrypted."
          accent={colors.accentAmber}
        />
      ) : null}

      {prefsLoaded && !prefs.configured && (def.goals.length > 0 || def.id === 'custom') ? (
        <Pressable onPress={() => setPersonalizeOpen(true)} accessibilityRole="button">
          <NoticeCard
            emoji="✨"
            title={def.id === 'custom' ? 'Build your tracker' : 'Tell us what this is for'}
            body={
              def.id === 'custom'
                ? 'Tap here to name it and add fields: scales, numbers, counters, yes/no, lists or notes.'
                : 'Tap here to pick your goals. We will show only the sections that matter to you, and you can switch any of them on or off.'
            }
            accent={accent}
          />
        </Pressable>
      ) : null}

      {error ? <Text style={trackingStyles.errorBanner}>{error}</Text> : null}

      <CycleDayStrip selectedDate={selectedDate} today={today} onSelectDate={onSelectDate} dayHasLog={dayHasLog} />

      <Text style={[ui.title, { fontSize: 18, marginBottom: 10 }]}>
        {selectedDate === today ? 'Today' : longDate(selectedDate)}
      </Text>

      {flags.map((f) => (
        <NoticeCard
          key={f.id}
          emoji={f.tone === 'urgent' ? '🚑' : f.tone === 'warn' ? '⚠️' : '💡'}
          title={f.title}
          body={f.body}
          accent={f.tone === 'urgent' ? colors.error : f.tone === 'warn' ? colors.accentAmber : colors.accentBlue}
        />
      ))}

      {isFutureDay ? (
        <NoticeCard emoji="🔮" body="This day is in the future. Logging opens on the day." accent={colors.accentBlue} />
      ) : (
        <>
          {visibleSections.length === 0 ? (
            <NoticeCard
              emoji="🧩"
              body={def.id === 'custom' ? 'No fields yet. Add some in ✨ Make it yours.' : 'All sections are switched off. Turn some on in ✨ Make it yours.'}
              accent={accent}
            />
          ) : null}
          {visibleSections.map((s) => {
            const color = accentColor(s.accent, colors);
            const fields = s.fields.filter((f) => !f.showIf || f.showIf(fieldCtx));
            if (fields.length === 0) return null;
            return (
              <SectionCard
                key={s.key}
                emoji={s.emoji}
                title={s.label}
                accent={color}
                summary={summarizeFields(fields, draft, prefs)}
                explainer={s.explainer}
                showExplainer={prefs.explainers}
                defaultOpen={!s.collapsed}
              >
                {fields.map((f) => (
                  <GenericFieldInput
                    key={f.id}
                    field={f}
                    value={draft[f.id]}
                    onChange={(v) => patch(f.id, v)}
                    accent={color}
                    prefs={prefs}
                    onAddOption={addOption}
                  />
                ))}
              </SectionCard>
            );
          })}

          {savedNote ? <Text style={trackingStyles.successBanner}>{savedNote}</Text> : null}
          <Pressable
            style={[trackingStyles.primaryBtn, { backgroundColor: accent }, busy && trackingStyles.disabled]}
            disabled={busy || !storeAvailable}
            onPress={saveDay}
            accessibilityRole="button"
          >
            <Text style={[trackingStyles.primaryBtnText, { color: '#fff' }]}>
              Save {selectedDate === today ? 'today' : shortDate(selectedDate)}
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
            <Pressable
              style={trackingStyles.ghostBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert('Discard changes?', 'Go back to what was last saved for this day.', [
                  { text: 'Keep editing', style: 'cancel' },
                  { text: 'Discard', onPress: resetDraft },
                ])
              }
            >
              <Text style={trackingStyles.ghostBtnText}>Discard changes</Text>
            </Pressable>
            {hasSaved ? (
              <Pressable style={trackingStyles.ghostBtn} disabled={busy} onPress={clearDay}>
                <Text style={[trackingStyles.ghostBtnText, { color: colors.error }]}>Clear day</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}

      {insights.loggedDays > 0 ? (
        <SectionCard
          emoji="📈"
          title="Your patterns"
          accent={accent}
          summary={`${insights.loggedDays} day${insights.loggedDays === 1 ? '' : 's'} logged in 30 days${insights.streak > 1 ? ` · ${insights.streak}-day streak` : ''}`}
          defaultOpen={false}
        >
          {insights.fields.length === 0 ? (
            <Text style={trackingStyles.hint}>Log a few more days to see patterns here.</Text>
          ) : (
            insights.fields.map((i) => (
              <View key={i.id} style={{ marginBottom: 8 }}>
                <SubLabel>{i.label}</SubLabel>
                <Text style={ui.toggleHint}>{insightLine(i)}</Text>
              </View>
            ))
          )}
          <Text style={[trackingStyles.hint, { marginTop: 8, fontSize: 12 }]}>
            Last 30 days. Handy to screenshot for an appointment.
          </Text>
        </SectionCard>
      ) : null}

      {def.disclaimer ? (
        <Text style={[trackingStyles.hint, { fontSize: 12, marginTop: 12, textAlign: 'center' }]}>{def.disclaimer}</Text>
      ) : null}

      <GenericPersonalizeSheet
        def={def}
        visible={personalizeOpen}
        prefs={prefs}
        accent={accent}
        busy={busy}
        onCancel={() => setPersonalizeOpen(false)}
        onSave={(next) => {
          setPersonalizeOpen(false);
          void savePrefs(next)
            .then(() => {
              successFeedback();
              setSavedNote(`${def.label} is set up ✨`);
            })
            .catch((err: unknown) => {
              if (err instanceof TrackerStoreUnavailableError) setAvailable(false);
              else setError(err instanceof Error ? err.message : 'Could not save your preferences');
            });
        }}
      />
    </View>
  );
}
