import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useTrackerPrefs } from '../../hooks/useTrackerPrefs';
import { formatScheduleTime, todayLocalDate } from '../../lib/dates';
import { formatDoseDisplay } from '../../lib/dose';
import { successFeedback, tapFeedback } from '../../lib/haptics';
import type { TrackerDoseEvent } from '../../lib/tracking/doseSync';
import { fetchTrackerDoseEventsInRange } from '../../lib/tracking/doseSync';
import {
  fetchHrtDayLogsInRange,
  HRT_MOOD_CHANGE_OPTIONS,
  upsertHrtDayLog,
  type HrtDayLog,
} from '../../lib/tracking/hrt';
import {
  bodyChangeOptions,
  daysOnHrt,
  HRT_LIBIDO_OPTIONS,
  HRT_MENOPAUSE_OPTIONS,
  HRT_REGIMEN_OPTIONS,
  HRT_ROUTE_OPTIONS,
  HRT_SECTION_OPTIONS,
  HRT_SIDE_EFFECT_OPTIONS,
  hrtDurationLabel,
  labFieldsForRegimen,
  labHistory,
  labLabel,
  lastAdministered,
  MEASUREMENT_FIELDS,
  nextDoseDue,
  nextHrtMilestone,
  normalizeHrtExtras,
  normalizeHrtPrefs,
  SITE_REACTION_OPTIONS,
  siteOptionsForRoute,
  suggestNextSite,
  URGENT_SIDE_EFFECTS,
  type HrtExtras,
  type HrtPrefs,
  type HrtSectionKey,
} from '../../lib/tracking/hrtExtras';
import { diffDays, relativeDayLabel, shiftDate } from '../../lib/tracking/cycleInsights';
import {
  compactEntry,
  fetchTrackerDayEntries,
  saveTrackerDayEntry,
  TrackerStoreUnavailableError,
  type TrackerDayEntry,
} from '../../lib/tracking/trackerStore';
import { CycleDayStrip } from './CycleDayStrip';
import { HrtPersonalizeSheet } from './HrtPersonalizeSheet';
import { TrackerHero, type HeroPill } from './TrackerHero';
import {
  Chips,
  NoticeCard,
  ScaleRow,
  SectionCard,
  Stepper,
  SubLabel,
  ToggleRow,
  useTrackerUIStyles,
} from './TrackerUI';
import { useTrackingStyles } from './trackingStyles';

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onDataMutated?: () => void;
};

function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  return { start, end };
}

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function longDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function summarize(list: string[]): string | null {
  if (list.length === 0) return null;
  if (list.length <= 2) return list.join(', ');
  return `${list.slice(0, 2).join(', ')} +${list.length - 2}`;
}

function routeLabel(route: string | undefined): string | undefined {
  return HRT_ROUTE_OPTIONS.find((r) => r.value === route)?.label;
}

export function HrtTrackerPanel({ selectedDate, onSelectDate, onDataMutated }: Props) {
  const { user } = useAuth();
  const trackingStyles = useTrackingStyles();
  const ui = useTrackerUIStyles();
  const { colors } = useTheme();
  const today = todayLocalDate();
  const isFutureDay = selectedDate > today;
  const {
    prefs,
    available: storeAvailable,
    save: savePrefs,
    setAvailable: setStoreAvailable,
  } = useTrackerPrefs<HrtPrefs>(user?.id, 'hrt', normalizeHrtPrefs);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  const [logs, setLogs] = useState<HrtDayLog[]>([]);
  const [entries, setEntries] = useState<TrackerDayEntry<HrtExtras>[]>([]);
  const [doseEvents, setDoseEvents] = useState<TrackerDoseEvent[]>([]);

  const [bodilyDraft, setBodilyDraft] = useState<string[]>([]);
  const [moodDraft, setMoodDraft] = useState<string[]>([]);
  const [otherDraft, setOtherDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [extras, setExtras] = useState<HrtExtras>({});

  // Visible month + a year of history for labs, site rotation and dose timing.
  const range = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    const bounds = monthBounds(d.getFullYear(), d.getMonth() + 1);
    const history = shiftDate(today, -365);
    return {
      from: bounds.start < history ? bounds.start : history,
      to: bounds.end > today ? bounds.end : today,
    };
  }, [selectedDate, today]);

  const reload = useCallback(async () => {
    if (!user) return;
    const [rangeLogs, rangeEntries, events] = await Promise.all([
      fetchHrtDayLogsInRange(user.id, range.from, range.to),
      fetchTrackerDayEntries(user.id, 'hrt', range.from, range.to, normalizeHrtExtras),
      fetchTrackerDoseEventsInRange(user.id, 'hrt', selectedDate, selectedDate, 200),
    ]);
    setLogs(rangeLogs);
    setEntries(rangeEntries.entries);
    setDoseEvents(events);
    if (!rangeEntries.available) setStoreAvailable(false);
  }, [user, range, selectedDate, setStoreAvailable]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    reload()
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load HRT log');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, reload]);

  const selectedLog = useMemo(() => logs.find((l) => l.log_date === selectedDate) ?? null, [logs, selectedDate]);
  const savedExtras = useMemo(
    () => entries.find((e) => e.log_date === selectedDate)?.data,
    [entries, selectedDate],
  );

  const resetDrafts = useCallback(() => {
    setBodilyDraft(selectedLog?.bodily_changes ?? []);
    setMoodDraft(selectedLog?.mood_changes ?? []);
    setOtherDraft(selectedLog?.other_changes ?? '');
    setNotesDraft(selectedLog?.notes ?? '');
    setExtras(savedExtras ?? {});
  }, [selectedLog, savedExtras]);

  useEffect(() => {
    resetDrafts();
  }, [resetDrafts]);

  useEffect(() => {
    setSavedNote(null);
  }, [selectedDate]);

  const dayHasLog = useCallback(
    (date: string) => {
      const log = logs.find((l) => l.log_date === date);
      const hasLog =
        log &&
        (log.bodily_changes.length > 0 ||
          log.mood_changes.length > 0 ||
          Boolean(log.other_changes?.trim()) ||
          Boolean(log.notes?.trim()));
      return Boolean(hasLog || entries.some((e) => e.log_date === date));
    },
    [logs, entries],
  );

  function patchExtras(patch: Partial<HrtExtras>) {
    setExtras((e) => ({ ...e, ...patch }));
  }

  async function saveExtras(date: string, data: HrtExtras) {
    if (!user) return;
    try {
      await saveTrackerDayEntry(user.id, 'hrt', date, compactEntry(data));
    } catch (err) {
      if (err instanceof TrackerStoreUnavailableError) {
        setStoreAvailable(false);
        return;
      }
      throw err;
    }
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
      setError(err instanceof Error ? err.message : 'Could not save HRT log');
    } finally {
      setBusy(false);
    }
  }

  function saveDay() {
    if (!user || isFutureDay) return;
    void run(async () => {
      await upsertHrtDayLog(user.id, selectedDate, {
        bodily_changes: bodilyDraft,
        mood_changes: moodDraft,
        other_changes: otherDraft,
        notes: notesDraft,
      });
      await saveExtras(selectedDate, extras);
    }, 'Saved ✓');
  }

  if (!user) return null;

  if (loading && logs.length === 0 && entries.length === 0) {
    return <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />;
  }

  const accent = colors.accentPurple;
  const regimen = HRT_REGIMEN_OPTIONS.find((r) => r.value === prefs.regimen);
  const days = daysOnHrt(prefs.startDate, today);
  const milestone = nextHrtMilestone(prefs.startDate, today);
  const nextDue = nextDoseDue(entries, prefs.everyDays, today);
  const last = lastAdministered(entries, today);
  const defaultRoute = prefs.routes[0];
  const route = extras.route ?? defaultRoute;
  const siteOptions = siteOptionsForRoute(route);
  const suggestedSite = suggestNextSite(
    entries.filter((e) => e.log_date !== selectedDate),
    route,
  );

  let center = '—';
  let caption = 'days on HRT';
  let progress: number | null = null;
  if (nextDue && prefs.everyDays) {
    const since = last ? diffDays(last.log_date, today) : 0;
    center = String(Math.max(0, nextDue.inDays));
    caption = nextDue.inDays === 1 ? 'day to dose' : 'days to dose';
    progress = Math.min(1, since / prefs.everyDays);
  } else if (days != null) {
    center = days > 999 ? `${Math.floor(days / 365)}y` : String(days);
    if (milestone) {
      const total = diffDays(prefs.startDate!, milestone.date);
      progress = total > 0 ? (total - milestone.inDays) / total : null;
    }
  }

  const heroTitle =
    days != null ? `${hrtDurationLabel(days)} on HRT` : regimen ? `${regimen.label} HRT` : 'Your HRT journal';
  let heroSubtitle: string | null = null;
  if (nextDue) {
    heroSubtitle =
      nextDue.inDays < 0
        ? `Your next dose was due ${relativeDayLabel(today, nextDue.date)}.`
        : `Next dose ${nextDue.inDays === 0 ? 'is due today' : `due ${relativeDayLabel(today, nextDue.date)}`} (${shortDate(nextDue.date)}).`;
  } else if (!prefs.configured) {
    heroSubtitle = 'Add your start date and routine in ✨ Make it yours to unlock milestones and dose countdowns.';
  } else if (milestone) {
    heroSubtitle = `${milestone.label} milestone ${relativeDayLabel(today, milestone.date)}. You've got this.`;
  }

  const pills: HeroPill[] = [];
  if (regimen) pills.push({ label: `${regimen.emoji} ${regimen.label}`, color: accent });
  if (milestone && days != null) pills.push({ label: `🏁 ${milestone.label} on ${shortDate(milestone.date)}`, color: colors.accentGreen });
  if (last) pills.push({ label: `Last dose ${shortDate(last.log_date)}`, color: colors.accentBlue });
  if (suggestedSite && !extras.site) pills.push({ label: `📍 Next site: ${suggestedSite}`, color: colors.accentAmber });

  const loggedDoseToday = Boolean(extras.administered || savedExtras?.administered);
  const heroAction =
    !isFutureDay && !loggedDoseToday && (prefs.routes.length > 0 || prefs.everyDays)
      ? {
          label: `Log ${route?.startsWith('injection') ? 'injection' : route === 'patch' ? 'patch change' : 'dose'} for ${selectedDate === today ? 'today' : shortDate(selectedDate)}`,
          run: () => {
            const next: HrtExtras = {
              ...extras,
              administered: true,
              route: route,
              site: extras.site ?? suggestedSite ?? undefined,
            };
            setExtras(next);
            void run(() => saveExtras(selectedDate, next), 'Dose logged ✓');
          },
        }
      : null;

  const show = (key: HrtSectionKey) => prefs.sections[key];
  const urgent = (extras.sideEffects ?? []).some((s) => (URGENT_SIDE_EFFECTS as readonly string[]).includes(s));
  const bodyOptions = [...new Set([...bodyChangeOptions(prefs.regimen), ...bodilyDraft])];
  const labs = labHistory(entries).slice(0, 8);

  const sectionCard = (key: HrtSectionKey, color: string, summary: string | null, children: ReactNode) => {
    const meta = HRT_SECTION_OPTIONS.find((s) => s.key === key)!;
    return (
      <SectionCard
        key={key}
        emoji={meta.emoji}
        title={meta.label}
        accent={color}
        summary={summary}
        explainer={meta.explainer}
        showExplainer={prefs.explainers}
      >
        {children}
      </SectionCard>
    );
  };

  return (
    <View>
      <TrackerHero
        accent={accent}
        eyebrow={regimen ? 'Your journey' : 'HRT & hormones'}
        title={heroTitle}
        subtitle={heroSubtitle}
        progress={progress}
        centerValue={center}
        centerCaption={caption}
        pills={pills}
        actionLabel={heroAction?.label}
        onAction={busy ? undefined : heroAction?.run}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={[trackingStyles.hint, { flex: 1, marginBottom: 0, fontSize: 13 }]}>
          🔒 Your journal is encrypted on your phone. Doses you log on Today show up here automatically.
        </Text>
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
          title="Some new options can't save yet"
          body="Personalization, dose sites, labs and measurements need database migration 030. Your body and mood journal still saves as usual."
          accent={colors.accentAmber}
        />
      ) : null}

      {error ? <Text style={trackingStyles.errorBanner}>{error}</Text> : null}

      <CycleDayStrip selectedDate={selectedDate} today={today} onSelectDate={onSelectDate} dayHasLog={dayHasLog} />

      <Text style={[ui.title, { fontSize: 18, marginBottom: 10 }]}>
        {selectedDate === today ? 'Today' : longDate(selectedDate)}
        {days != null && selectedDate >= (prefs.startDate ?? selectedDate)
          ? `  ·  day ${diffDays(prefs.startDate!, selectedDate) + 1}`
          : ''}
      </Text>

      {isFutureDay ? (
        <NoticeCard
          emoji="🔮"
          body="This day is in the future. Logging opens on the day."
          accent={colors.accentBlue}
        />
      ) : (
        <>
          {show('dose')
            ? sectionCard(
                'dose',
                accent,
                extras.administered
                  ? [routeLabel(extras.route), extras.site].filter(Boolean).join(' · ') || 'Logged ✓'
                  : doseEvents.length
                    ? `${doseEvents.length} synced from Today`
                    : null,
                <>
                  {doseEvents.map((event) => (
                    <View key={event.id} style={[trackingStyles.card, { marginBottom: 8 }]}>
                      <Text style={{ fontWeight: '700', color: colors.text }}>✓ {event.medication_name}</Text>
                      <Text style={trackingStyles.hint}>
                        {formatScheduleTime(event.schedule_time)}
                        {event.dose_pills || event.dose_mg
                          ? ` · ${formatDoseDisplay({ dose_pills: event.dose_pills, dose_mg: event.dose_mg })}`
                          : ''}
                      </Text>
                    </View>
                  ))}
                  <ToggleRow
                    label="Took / applied my dose"
                    hint={doseEvents.length ? 'Your Today doses already count; use this for anything else.' : undefined}
                    value={Boolean(extras.administered)}
                    onChange={(v) => patchExtras({ administered: v || undefined })}
                    accent={accent}
                  />
                  <SubLabel>How</SubLabel>
                  <Chips
                    options={(prefs.routes.length
                      ? HRT_ROUTE_OPTIONS.filter((r) => prefs.routes.includes(r.value))
                      : HRT_ROUTE_OPTIONS
                    ).map((r) => ({ value: r.value, label: r.label }))}
                    accent={accent}
                    selected={route}
                    onChange={(v) => patchExtras({ route: v, site: undefined })}
                  />
                  {siteOptions.length ? (
                    <>
                      <SubLabel>Where</SubLabel>
                      {suggestedSite ? (
                        <Text style={[trackingStyles.hint, { fontSize: 13 }]}>
                          Suggested: {suggestedSite} (rested the longest)
                        </Text>
                      ) : null}
                      <Chips
                        options={siteOptions}
                        accent={accent}
                        selected={extras.site}
                        onChange={(v) => patchExtras({ site: v })}
                      />
                      <SubLabel>Site reaction</SubLabel>
                      <Chips
                        multiple
                        options={SITE_REACTION_OPTIONS}
                        accent={accent}
                        selected={extras.siteReaction ?? []}
                        onChange={(next) => patchExtras({ siteReaction: next })}
                      />
                    </>
                  ) : null}
                </>,
              )
            : null}

          {show('body')
            ? sectionCard(
                'body',
                colors.accentBlue,
                summarize(bodilyDraft),
                <>
                  <Chips
                    multiple
                    options={bodyOptions}
                    accent={colors.accentBlue}
                    selected={bodilyDraft}
                    onChange={setBodilyDraft}
                  />
                  <SubLabel>Anything else you noticed</SubLabel>
                  <TextInput
                    style={[trackingStyles.input, trackingStyles.textarea]}
                    multiline
                    value={otherDraft}
                    onChangeText={setOtherDraft}
                    placeholder="Small wins count too"
                    placeholderTextColor={colors.textMuted}
                  />
                </>,
              )
            : null}

          {show('mood')
            ? sectionCard(
                'mood',
                colors.accentRed,
                summarize(moodDraft),
                <>
                  <Chips
                    multiple
                    options={HRT_MOOD_CHANGE_OPTIONS}
                    accent={colors.accentRed}
                    selected={moodDraft}
                    onChange={setMoodDraft}
                  />
                  <SubLabel>Overall mood</SubLabel>
                  <ScaleRow
                    label="Mood"
                    min={1}
                    max={5}
                    value={extras.mood}
                    onChange={(v) => patchExtras({ mood: v })}
                    accent={colors.accentRed}
                    lowLabel="Rough"
                    highLabel="Great"
                    emojis={['😞', '😕', '😐', '🙂', '😄']}
                  />
                  <SubLabel>Energy</SubLabel>
                  <ScaleRow
                    label="Energy"
                    min={1}
                    max={5}
                    value={extras.energy}
                    onChange={(v) => patchExtras({ energy: v })}
                    accent={colors.accentRed}
                    lowLabel="Drained"
                    highLabel="Buzzing"
                    emojis={['🪫', '😮‍💨', '🙂', '😊', '⚡']}
                  />
                  {prefs.regimen !== 'menopause' ? (
                    <>
                      <SubLabel>How at home do you feel in your body?</SubLabel>
                      <ScaleRow
                        label="Body comfort"
                        min={1}
                        max={5}
                        value={extras.bodyComfort}
                        onChange={(v) => patchExtras({ bodyComfort: v })}
                        accent={colors.accentRed}
                        lowLabel="Not at all"
                        highLabel="Completely"
                        emojis={['🌧️', '🌥️', '⛅', '🌤️', '🌈']}
                      />
                    </>
                  ) : null}
                  <SubLabel>Libido</SubLabel>
                  <Chips
                    options={HRT_LIBIDO_OPTIONS}
                    accent={colors.accentRed}
                    selected={extras.libido}
                    onChange={(v) => patchExtras({ libido: v })}
                  />
                  {extras.mood === 1 ? (
                    <NoticeCard
                      emoji="💛"
                      body="Rough days happen. If low moods stick around or you ever feel unsafe, please reach out to someone you trust or a doctor. In the US you can call or text 988, or the Trans Lifeline at 877-565-8860."
                      accent={colors.accentAmber}
                    />
                  ) : null}
                </>,
              )
            : null}

          {show('sideEffects')
            ? sectionCard(
                'sideEffects',
                colors.accentAmber,
                summarize(extras.sideEffects ?? []),
                <>
                  <Chips
                    multiple
                    options={HRT_SIDE_EFFECT_OPTIONS}
                    accent={colors.accentAmber}
                    selected={extras.sideEffects ?? []}
                    onChange={(next) => patchExtras({ sideEffects: next })}
                  />
                  {urgent ? (
                    <NoticeCard
                      emoji="🚑"
                      title="Please get checked today"
                      body="Leg swelling or pain, chest pain, or shortness of breath can be signs of a blood clot. Call your doctor or emergency services now."
                      accent={colors.error}
                    />
                  ) : null}
                </>,
              )
            : null}

          {show('menopause')
            ? sectionCard(
                'menopause',
                colors.accentBlue,
                summarize(extras.menopauseSymptoms ?? []),
                <>
                  <Chips
                    multiple
                    options={HRT_MENOPAUSE_OPTIONS}
                    accent={colors.accentBlue}
                    selected={extras.menopauseSymptoms ?? []}
                    onChange={(next) => patchExtras({ menopauseSymptoms: next })}
                  />
                  <SubLabel>Hot flashes today</SubLabel>
                  <Stepper
                    value={extras.hotFlashes ?? 0}
                    onChange={(n) => patchExtras({ hotFlashes: n || undefined })}
                    accent={colors.accentBlue}
                    max={50}
                  />
                </>,
              )
            : null}

          {show('labs')
            ? sectionCard(
                'labs',
                colors.accentGreen,
                extras.labs ? `${Object.keys(extras.labs).length} result(s)` : labs[0] ? `Last: ${shortDate(labs[0].date)}` : null,
                <>
                  {labFieldsForRegimen(prefs.regimen).map((f) => (
                    <View key={f.key}>
                      <Text style={trackingStyles.label}>
                        {f.label} <Text style={{ color: colors.textMuted, fontWeight: '400' }}>({f.unit})</Text>
                      </Text>
                      <TextInput
                        style={trackingStyles.input}
                        keyboardType="decimal-pad"
                        value={extras.labs?.[f.key] ?? ''}
                        onChangeText={(v) =>
                          patchExtras({ labs: { ...(extras.labs ?? {}), [f.key]: v.replace(/[^0-9.,<>]/g, '') } })
                        }
                        placeholder="—"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  ))}
                  {labs.length ? (
                    <>
                      <SubLabel>Recent results</SubLabel>
                      {labs.map((l) => (
                        <Text key={`${l.date}-${l.key}`} style={[trackingStyles.hint, { marginBottom: 2 }]}>
                          {shortDate(l.date)} · {labLabel(l.key)}: <Text style={{ fontWeight: '700', color: colors.text }}>{l.value}</Text>
                        </Text>
                      ))}
                    </>
                  ) : null}
                </>,
              )
            : null}

          {show('measurements')
            ? sectionCard(
                'measurements',
                colors.accentBlue,
                extras.measurements ? 'Logged' : null,
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {MEASUREMENT_FIELDS.map((f) => (
                    <View key={f.key} style={{ width: '48%' }}>
                      <Text style={trackingStyles.label}>
                        {f.label} ({prefs.measurementUnit})
                      </Text>
                      <TextInput
                        style={trackingStyles.input}
                        keyboardType="decimal-pad"
                        value={extras.measurements?.[f.key] ?? ''}
                        onChangeText={(v) =>
                          patchExtras({
                            measurements: { ...(extras.measurements ?? {}), [f.key]: v.replace(/[^0-9.,]/g, '') },
                          })
                        }
                      />
                    </View>
                  ))}
                </View>,
              )
            : null}

          {show('milestone')
            ? sectionCard(
                'milestone',
                colors.accentGreen,
                extras.milestone ?? null,
                <TextInput
                  style={trackingStyles.input}
                  value={extras.milestone ?? ''}
                  onChangeText={(v) => patchExtras({ milestone: v || undefined })}
                  placeholder="First time someone got my name right, new clothes fit…"
                  placeholderTextColor={colors.textMuted}
                />,
              )
            : null}

          {show('notes')
            ? sectionCard(
                'notes',
                colors.accentBlue,
                notesDraft.trim() || null,
                <TextInput
                  style={[trackingStyles.input, trackingStyles.textarea]}
                  multiline
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  placeholder="Questions for your next appointment, how today went…"
                  placeholderTextColor={colors.textMuted}
                />,
              )
            : null}

          {savedNote ? <Text style={trackingStyles.successBanner}>{savedNote}</Text> : null}
          <Pressable
            style={[trackingStyles.primaryBtn, { backgroundColor: accent }, busy && trackingStyles.disabled]}
            disabled={busy}
            onPress={saveDay}
            accessibilityRole="button"
          >
            <Text style={[trackingStyles.primaryBtnText, { color: '#fff' }]}>
              Save {selectedDate === today ? 'today' : shortDate(selectedDate)}
            </Text>
          </Pressable>
          <Pressable
            style={trackingStyles.ghostBtn}
            disabled={busy}
            onPress={() =>
              Alert.alert('Discard changes?', 'Go back to what was last saved for this day.', [
                { text: 'Keep editing', style: 'cancel' },
                { text: 'Discard', onPress: resetDrafts },
              ])
            }
          >
            <Text style={trackingStyles.ghostBtnText}>Discard changes</Text>
          </Pressable>
        </>
      )}

      <HrtPersonalizeSheet
        visible={personalizeOpen}
        prefs={prefs}
        busy={busy}
        onCancel={() => setPersonalizeOpen(false)}
        onSave={(next) => {
          setPersonalizeOpen(false);
          void savePrefs(next)
            .then(() => {
              successFeedback();
              setSavedNote('Your HRT tracker is set up ✨');
            })
            .catch((err: unknown) => {
              if (err instanceof TrackerStoreUnavailableError) setStoreAvailable(false);
              else setError(err instanceof Error ? err.message : 'Could not save your preferences');
            });
        }}
      />
    </View>
  );
}
