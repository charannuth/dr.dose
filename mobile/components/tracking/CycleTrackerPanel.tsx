import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useTrackerPrefs } from '../../hooks/useTrackerPrefs';
import { todayLocalDate } from '../../lib/dates';
import { successFeedback, tapFeedback } from '../../lib/haptics';
import {
  cancelOpenPeriod,
  clearPeriodLate,
  CYCLE_SYMPTOMS_DURING,
  CYCLE_SYMPTOMS_PRE,
  cycleDayHasAnyData,
  cycleDayInPeriod,
  cycleLengthSourceLabel,
  deleteCycleDayLog,
  deleteMostRecentPeriod,
  effectiveCycleLengthForPrediction,
  endPeriod,
  fetchCycleDayLogs,
  fetchCyclePeriods,
  fetchCycleSettings,
  fetchOpenPeriod,
  getCyclePrediction,
  markPeriodLate,
  mergeSymptomOptions,
  PHASE_HINTS,
  PHASE_LABELS,
  softClearCycleDayLog,
  startPeriod,
  undoLastPeriodEnd,
  updateCycleSettings,
  updatePeriodEnd,
  updatePeriodStart,
  upsertCycleDayLog,
  type CycleDayLog,
  type CyclePeriod,
  type CycleSettings,
  type FlowLevel,
} from '../../lib/tracking/cycle';
import { estimatedPhaseForDate, type CyclePhase } from '../../lib/tracking/cyclePhases';
import {
  BIRTH_CONTROL_OPTIONS,
  BODY_EXTRA_OPTIONS,
  birthControlIsDaily,
  CYCLE_SECTION_OPTIONS,
  cycleExtrasHasData,
  DISCHARGE_OPTIONS,
  extrasSupportNote,
  LIBIDO_OPTIONS,
  MENOPAUSE_SYMPTOM_OPTIONS,
  MOOD_OPTIONS,
  normalizeCycleExtras,
  normalizeCyclePrefs,
  OVULATION_TEST_OPTIONS,
  PAIN_AREA_OPTIONS,
  PERIOD_PRODUCT_OPTIONS,
  periodWord,
  POSTPARTUM_OPTIONS,
  PREGNANCY_TEST_OPTIONS,
  PROTECTION_OPTIONS,
  type CycleExtras,
  type CyclePrefs,
  type CycleSectionKey,
} from '../../lib/tracking/cycleExtras';
import {
  buildCycleInsights,
  diffDays,
  fertileWindow,
  predictionRange,
  relativeDayLabel,
  shiftDate,
} from '../../lib/tracking/cycleInsights';
import {
  compactEntry,
  deleteTrackerDayEntry,
  fetchTrackerDayEntries,
  saveTrackerDayEntry,
  TrackerStoreUnavailableError,
} from '../../lib/tracking/trackerStore';
import { tryNormalizeIsoDate } from '../../lib/isoDateInput';
import { IsoDateInput } from '../IsoDateInput';
import { CycleDayStrip } from './CycleDayStrip';
import { CycleBasicsCard, CycleInsightsCard } from './CycleInsightsCard';
import { CyclePersonalizeSheet } from './CyclePersonalizeSheet';
import { EditCustomSymptomsModal } from './EditCustomSymptomsModal';
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

const FLOW_OPTIONS: { value: FlowLevel; label: string; emoji: string }[] = [
  { value: 'spotting', label: 'Spotting', emoji: '•' },
  { value: 'light', label: 'Light', emoji: '💧' },
  { value: 'medium', label: 'Medium', emoji: '💧💧' },
  { value: 'heavy', label: 'Heavy', emoji: '💧💧💧' },
];

const PHASE_EMOJI: Record<CyclePhase, string> = {
  menstrual: '🩸',
  follicular: '🌱',
  ovulation: '🌼',
  luteal: '🌙',
};

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEnd(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
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

function sectionMeta(key: CycleSectionKey) {
  return CYCLE_SECTION_OPTIONS.find((s) => s.key === key)!;
}

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onDataMutated?: () => void;
};

export function CycleTrackerPanel({ selectedDate, onSelectDate, onDataMutated }: Props) {
  const trackingStyles = useTrackingStyles();
  const ui = useTrackerUIStyles();
  const { colors } = useTheme();
  const { user } = useAuth();
  const today = todayLocalDate();
  const {
    prefs,
    available: storeAvailable,
    save: savePrefs,
    setAvailable: setStoreAvailable,
  } = useTrackerPrefs<CyclePrefs>(user?.id, 'cycle', normalizeCyclePrefs);

  const [settings, setSettings] = useState<CycleSettings | null>(null);
  const [periods, setPeriods] = useState<CyclePeriod[]>([]);
  const [openPeriod, setOpenPeriod] = useState<CyclePeriod | null>(null);
  const [dayLogs, setDayLogs] = useState<CycleDayLog[]>([]);
  const [extrasByDate, setExtrasByDate] = useState<Record<string, CycleExtras>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [periodEndDraft, setPeriodEndDraft] = useState(today);
  const [periodStartDraft, setPeriodStartDraft] = useState('');
  const [lastEndedDraft, setLastEndedDraft] = useState('');

  const word = prefs.discreet ? 'cycle' : periodWord(prefs);
  const Word = word.charAt(0).toUpperCase() + word.slice(1);

  const logMonth = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [selectedDate]);

  // Load the visible month plus ~6 months of history for insights.
  const range = useMemo(() => {
    const from = monthStart(logMonth.year, logMonth.month);
    const to = monthEnd(logMonth.year, logMonth.month);
    const history = shiftDate(today, -180);
    return { from: from < history ? from : history, to: to > today ? to : today };
  }, [logMonth, today]);

  const reload = useCallback(async () => {
    if (!user) return;
    const [s, p, open, logs, entries] = await Promise.all([
      fetchCycleSettings(user.id),
      fetchCyclePeriods(user.id),
      fetchOpenPeriod(user.id),
      fetchCycleDayLogs(user.id, range.from, range.to),
      fetchTrackerDayEntries(user.id, 'cycle', range.from, range.to, normalizeCycleExtras),
    ]);
    setSettings(s);
    setPeriods(p);
    setOpenPeriod(open);
    setDayLogs(logs);
    const map: Record<string, CycleExtras> = {};
    for (const e of entries.entries) map[e.log_date] = e.data;
    setExtrasByDate(map);
    if (!entries.available) setStoreAvailable(false);
  }, [user, range, setStoreAvailable]);

  useEffect(() => {
    if (openPeriod) {
      setPeriodEndDraft(today);
      setPeriodStartDraft(openPeriod.started_on);
    }
  }, [openPeriod?.id, openPeriod?.started_on, today]);

  const lastClosedPeriod = useMemo(() => periods.find((p) => p.ended_on != null) ?? null, [periods]);

  useEffect(() => {
    if (lastClosedPeriod?.ended_on) setLastEndedDraft(lastClosedPeriod.ended_on);
  }, [lastClosedPeriod?.id, lastClosedPeriod?.ended_on]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    reload()
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load cycle data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, reload]);

  const prediction = useMemo(
    () => (settings ? getCyclePrediction(periods, settings, today) : null),
    [settings, periods, today],
  );
  const effectiveCycle = useMemo(
    () => (settings ? effectiveCycleLengthForPrediction(settings, periods) : null),
    [settings, periods],
  );

  const insights = useMemo(
    () =>
      buildCycleInsights(periods, dayLogs, extrasByDate, {
        today,
        youngUser: prefs.goals.includes('learning'),
        expectsMissedPeriods:
          prefs.goals.includes('perimenopause') ||
          prefs.goals.includes('postpartum') ||
          ['iud_hormonal', 'implant', 'shot'].includes(prefs.birthControl),
      }),
    [periods, dayLogs, extrasByDate, today, prefs.goals, prefs.birthControl],
  );

  const dayHasLog = useCallback(
    (date: string) =>
      cycleDayHasAnyData(dayLogs.find((l) => l.log_date === date)) ||
      cycleExtrasHasData(extrasByDate[date]),
    [dayLogs, extrasByDate],
  );

  const isFutureDay = selectedDate > today;
  const selectedLog = dayLogs.find((l) => l.log_date === selectedDate);
  const savedExtras = extrasByDate[selectedDate];
  const [flow, setFlow] = useState<FlowLevel | ''>('');
  const [symptomsPre, setSymptomsPre] = useState<string[]>([]);
  const [symptomsDuring, setSymptomsDuring] = useState<string[]>([]);
  const [intercourse, setIntercourse] = useState(false);
  const [notes, setNotes] = useState('');
  const [extras, setExtras] = useState<CycleExtras>({});
  const [editSymptomsKind, setEditSymptomsKind] = useState<'pre' | 'during' | null>(null);

  const preOptions = useMemo(
    () => mergeSymptomOptions(CYCLE_SYMPTOMS_PRE, [...(settings?.custom_symptoms_pre ?? []), ...symptomsPre]),
    [settings?.custom_symptoms_pre, symptomsPre],
  );
  const duringOptions = useMemo(
    () =>
      mergeSymptomOptions(CYCLE_SYMPTOMS_DURING, [...(settings?.custom_symptoms_during ?? []), ...symptomsDuring]),
    [settings?.custom_symptoms_during, symptomsDuring],
  );

  const resetDrafts = useCallback(() => {
    setFlow(selectedLog?.flow_level ?? '');
    setSymptomsPre(selectedLog?.symptoms_pre ?? []);
    setSymptomsDuring(selectedLog?.symptoms ?? []);
    setIntercourse(selectedLog?.intercourse ?? false);
    setNotes(selectedLog?.notes ?? '');
    setExtras(savedExtras ?? {});
  }, [selectedLog, savedExtras]);

  useEffect(() => {
    resetDrafts();
  }, [resetDrafts]);

  useEffect(() => {
    setSavedNote(null);
  }, [selectedDate]);

  const selectedInPeriod = useMemo(() => cycleDayInPeriod(selectedDate, periods) != null, [selectedDate, periods]);
  const bleedingFlow = flow !== '' && flow !== 'spotting';
  const isPeriodDay = selectedInPeriod || bleedingFlow;

  // Logging flow on a day after the latest period starts a new one there, so
  // nobody has to find a separate "started" button first.
  const latestPeriod = periods[0] ?? null;
  const canAutoStart =
    !openPeriod &&
    !selectedInPeriod &&
    !isFutureDay &&
    (!latestPeriod || selectedDate > (latestPeriod.ended_on ?? latestPeriod.started_on));
  const willStartPeriod = bleedingFlow && canAutoStart;

  function patchExtras(patch: Partial<CycleExtras>) {
    setExtras((e) => ({ ...e, ...patch }));
  }

  async function runAction(action: () => Promise<void>, done?: string) {
    setBusy(true);
    setError(null);
    setSavedNote(null);
    try {
      await action();
      await reload();
      onDataMutated?.();
      if (done) {
        successFeedback();
        setSavedNote(done);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function saveExtras(date: string, data: CycleExtras) {
    if (!user) return;
    try {
      await saveTrackerDayEntry(user.id, 'cycle', date, compactEntry(data));
    } catch (err) {
      if (err instanceof TrackerStoreUnavailableError) {
        setStoreAvailable(false);
        return;
      }
      throw err;
    }
  }

  function saveDay() {
    if (!user) return;
    void runAction(async () => {
      if (willStartPeriod) await startPeriod(user.id, selectedDate);
      await upsertCycleDayLog(user.id, selectedDate, {
        flow_level: flow || null,
        symptoms: isPeriodDay ? symptomsDuring : [],
        symptoms_pre: symptomsPre,
        symptoms_post: selectedLog?.symptoms_post ?? [],
        intercourse,
        notes,
      });
      await saveExtras(selectedDate, extras);
    }, willStartPeriod ? `Saved. Your ${word} start is set to ${shortDate(selectedDate)}.` : 'Saved ✓');
  }

  function confirmClearDay() {
    if (!user) return;
    const keepFlow = flow || selectedLog?.flow_level || null;
    Alert.alert('Clear this day?', 'Choose what to remove for this day.', [
      { text: 'Cancel', style: 'cancel' },
      ...(keepFlow
        ? [
            {
              text: 'Keep flow, clear the rest',
              onPress: () =>
                void runAction(async () => {
                  await softClearCycleDayLog(user.id, selectedDate, keepFlow);
                  await deleteTrackerDayEntry(user.id, 'cycle', selectedDate);
                }, 'Cleared'),
            },
          ]
        : []),
      {
        text: 'Delete everything',
        style: 'destructive' as const,
        onPress: () =>
          void runAction(async () => {
            await deleteCycleDayLog(user.id, selectedDate);
            await deleteTrackerDayEntry(user.id, 'cycle', selectedDate);
          }, 'Day cleared'),
      },
    ]);
  }

  const canMarkLate =
    Boolean(prediction?.nextStart) &&
    !openPeriod &&
    periods.length > 0 &&
    (prediction!.isLate || today >= prediction!.nextStart!);

  if (loading && !settings) {
    return <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />;
  }

  // ---- Hero summary -------------------------------------------------------
  const red = colors.accentRed;
  const anchor = openPeriod?.started_on ?? latestPeriod?.started_on ?? null;
  const cycleLen = effectiveCycle?.days ?? settings?.avg_cycle_length ?? 28;
  const cycleDay = anchor ? diffDays(anchor, today) + 1 : null;
  const phaseToday: CyclePhase | null =
    prediction?.currentPhase ??
    (anchor && settings ? estimatedPhaseForDate(today, anchor, settings, cycleLen) : null);
  const range2 =
    prefs.irregular || insights.regularity === 'irregular'
      ? predictionRange(anchor, insights.shortestCycle, insights.longestCycle)
      : null;
  const fw =
    prefs.showFertileWindow && !prefs.discreet && prediction?.nextStart ? fertileWindow(prediction.nextStart) : null;
  const showFw = fw && today <= fw.end;

  let heroTitle: string;
  let heroSubtitle: string | null = null;
  let center = cycleDay != null && cycleDay > 0 ? String(cycleDay) : '—';
  let caption = 'cycle day';
  if (!anchor) {
    heroTitle = `Log your first ${word}`;
    heroSubtitle = 'Pick the day it started on the strip below and tap the button. Predictions get smarter every cycle.';
  } else if (openPeriod) {
    const periodDay = diffDays(openPeriod.started_on, today) + 1;
    center = String(Math.max(1, periodDay));
    caption = `${word} day`;
    heroTitle = `Day ${Math.max(1, periodDay)} of your ${word}`;
    heroSubtitle = `Usually lasts about ${settings?.avg_period_length ?? 5} days for you. Be gentle with yourself.`;
  } else if (prefs.showPredictions && prediction?.nextStart) {
    if (prediction.isLate && prediction.daysLate > 0) {
      heroTitle = `${Word} is ${prediction.daysLate} day${prediction.daysLate === 1 ? '' : 's'} late`;
      heroSubtitle = 'Stress, illness, travel and sleep can all shift your cycle. If pregnancy is possible, a test can help.';
    } else if (range2) {
      heroTitle = `Next ${word} ${shortDate(range2.earliest)} – ${shortDate(range2.latest)}`;
      heroSubtitle = 'Shown as a range because your cycles vary.';
    } else {
      heroTitle = `Next ${word} ${relativeDayLabel(today, prediction.nextStart)}`;
      heroSubtitle = `Around ${longDate(prediction.nextStart)}, based on ${effectiveCycle ? cycleLengthSourceLabel(effectiveCycle.source) : 'your average'}.`;
    }
  } else {
    heroTitle = cycleDay != null ? `Cycle day ${cycleDay}` : 'Your cycle';
    heroSubtitle = phaseToday ? PHASE_HINTS[phaseToday] : null;
  }

  const pills: HeroPill[] = [];
  if (phaseToday) pills.push({ label: `${PHASE_EMOJI[phaseToday]} ${PHASE_LABELS[phaseToday]} phase`, color: colors.accentPurple });
  if (anchor) pills.push({ label: `~${cycleLen}-day cycle`, color: colors.accentBlue });
  if (showFw && fw) {
    pills.push({
      label: today >= fw.start ? '🌼 Fertile window now (est.)' : `🌼 Fertile ${shortDate(fw.start)}–${shortDate(fw.end)}`,
      color: colors.accentGreen,
    });
  }
  if (prefs.birthControl !== 'none') {
    const bc = BIRTH_CONTROL_OPTIONS.find((o) => o.value === prefs.birthControl);
    if (bc) pills.push({ label: `💊 ${bc.label}`, color: colors.accentAmber });
  }

  let heroAction: { label: string; run: () => void } | null = null;
  if (user && openPeriod) {
    const endOn =
      selectedDate >= openPeriod.started_on && selectedDate <= today ? selectedDate : today;
    heroAction = {
      label: `My ${word} ended${endOn !== today ? ` on ${shortDate(endOn)}` : ''}`,
      run: () => void runAction(() => endPeriod(user.id, endOn), `Marked as ended ${shortDate(endOn)}`),
    };
  } else if (user && canAutoStart) {
    heroAction = {
      label: `My ${word} started${selectedDate !== today ? ` on ${shortDate(selectedDate)}` : ' today'}`,
      run: () => void runAction(() => startPeriod(user.id, selectedDate), `${Word} started ${shortDate(selectedDate)}`),
    };
  }

  const show = (key: CycleSectionKey) => prefs.sections[key];
  const explain = prefs.explainers;
  const supportNote = extrasSupportNote(extras);
  const dischargeHint = DISCHARGE_OPTIONS.find((d) => d.value === extras.discharge)?.hint;
  const bcDaily = birthControlIsDaily(prefs.birthControl);

  const sectionCard = (key: CycleSectionKey, accent: string, summary: string | null, children: ReactNode, opts?: { title?: string; emoji?: string; defaultOpen?: boolean }) => {
    const meta = sectionMeta(key);
    return (
      <SectionCard
        key={key}
        emoji={opts?.emoji ?? meta.emoji}
        title={opts?.title ?? meta.label}
        accent={accent}
        summary={summary}
        explainer={meta.explainer}
        showExplainer={explain}
        defaultOpen={opts?.defaultOpen ?? true}
      >
        {children}
      </SectionCard>
    );
  };

  return (
    <View>
      <TrackerHero
        accent={red}
        eyebrow={anchor ? (openPeriod ? `${Word} in progress` : 'Your cycle') : 'Welcome'}
        title={heroTitle}
        subtitle={heroSubtitle}
        progress={cycleDay != null && cycleDay > 0 ? Math.min(1, cycleDay / cycleLen) : null}
        centerValue={center}
        centerCaption={caption}
        pills={pills}
        actionLabel={heroAction?.label}
        onAction={busy ? undefined : heroAction?.run}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={[trackingStyles.hint, { flex: 1, marginBottom: 0, fontSize: 13 }]}>
          🔒 Flow, symptoms, mood and notes are encrypted on your phone before they sync. Not for contraception or diagnosis.
        </Text>
        <Pressable
          onPress={() => {
            tapFeedback();
            setPersonalizeOpen(true);
          }}
          style={{ borderRadius: 999, borderWidth: 1, borderColor: red, paddingHorizontal: 12, paddingVertical: 7 }}
          accessibilityRole="button"
        >
          <Text style={{ color: red, fontWeight: '700', fontSize: 13 }}>✨ Make it yours</Text>
        </Pressable>
      </View>

      {!storeAvailable ? (
        <NoticeCard
          emoji="🛠️"
          title="Some new options can't save yet"
          body="Personalization and the new log fields need database migration 030. Your period dates, flow, symptoms and notes still save as usual."
          accent={colors.accentAmber}
        />
      ) : !prefs.configured ? (
        <NoticeCard
          emoji="✨"
          title="Make this tracker yours"
          body="Tell us what you're tracking for (just your period, symptoms, trying to conceive, perimenopause and more) and we'll show only what matters to you."
          accent={red}
        />
      ) : null}

      {error ? <Text style={trackingStyles.errorBanner}>{error}</Text> : null}

      <CycleDayStrip selectedDate={selectedDate} today={today} onSelectDate={onSelectDate} dayHasLog={dayHasLog} />

      <Text style={[ui.title, { fontSize: 18, marginBottom: 10 }]}>
        {selectedDate === today ? 'Today' : longDate(selectedDate)}
        {isPeriodDay ? `  ·  ${PHASE_EMOJI.menstrual} ${word} day` : ''}
      </Text>

      {isFutureDay ? (
        <NoticeCard
          emoji="🔮"
          body="This day is in the future. You can see predictions on the calendar; logging opens on the day."
          accent={colors.accentBlue}
        />
      ) : (
        <>
          {show('flow')
            ? sectionCard(
                'flow',
                red,
                flow ? FLOW_OPTIONS.find((f) => f.value === flow)?.label ?? null : isPeriodDay ? 'Tap to log flow' : 'No bleeding logged',
                <>
                  <Chips
                    options={FLOW_OPTIONS.map((f) => ({ value: f.value, label: f.label, emoji: f.emoji }))}
                    accent={red}
                    selected={flow || undefined}
                    onChange={(v) => setFlow((v as FlowLevel | undefined) ?? '')}
                  />
                  {willStartPeriod ? (
                    <Text style={[trackingStyles.hint, { fontSize: 13 }]}>
                      Saving will mark your {word} as started on {shortDate(selectedDate)}.
                    </Text>
                  ) : null}
                  {isPeriodDay || flow ? (
                    <>
                      <SubLabel>Products used</SubLabel>
                      <Chips
                        multiple
                        options={PERIOD_PRODUCT_OPTIONS}
                        accent={red}
                        selected={extras.products ?? []}
                        onChange={(next) => patchExtras({ products: next })}
                      />
                      <SubLabel>Changes today</SubLabel>
                      <Stepper
                        value={extras.productChanges ?? 0}
                        onChange={(n) => patchExtras({ productChanges: n || undefined })}
                        accent={red}
                      />
                    </>
                  ) : null}
                </>,
                { title: `${Word} flow` },
              )
            : null}

          {show('symptoms')
            ? sectionCard(
                'symptoms',
                colors.accentPurple,
                summarize([...(isPeriodDay ? symptomsDuring : symptomsPre), ...(extras.bodyExtras ?? [])]),
                <>
                  <SubLabel>{isPeriodDay ? `During your ${word}` : `Before your ${word} (PMS)`}</SubLabel>
                  <Chips
                    multiple
                    options={isPeriodDay ? duringOptions : preOptions}
                    accent={colors.accentPurple}
                    selected={isPeriodDay ? symptomsDuring : symptomsPre}
                    onChange={isPeriodDay ? setSymptomsDuring : setSymptomsPre}
                  />
                  <Pressable onPress={() => setEditSymptomsKind(isPeriodDay ? 'during' : 'pre')} hitSlop={6}>
                    <Text style={[ui.whatsThis, { color: colors.accentPurple }]}>＋ Add your own symptom</Text>
                  </Pressable>
                  <SubLabel>Skin, gut & more</SubLabel>
                  <Chips
                    multiple
                    options={BODY_EXTRA_OPTIONS}
                    accent={colors.accentPurple}
                    selected={extras.bodyExtras ?? []}
                    onChange={(next) => patchExtras({ bodyExtras: next })}
                  />
                </>,
                { title: 'Body', emoji: '🫶' },
              )
            : null}

          {show('pain')
            ? sectionCard(
                'pain',
                colors.accentAmber,
                extras.pain != null ? `${extras.pain}/10${extras.painAreas?.length ? ` · ${extras.painAreas.join(', ')}` : ''}` : null,
                <>
                  <ScaleRow
                    label="Pain level"
                    min={0}
                    max={10}
                    value={extras.pain}
                    onChange={(v) => patchExtras({ pain: v })}
                    accent={colors.accentAmber}
                    lowLabel="None"
                    highLabel="Worst ever"
                  />
                  <SubLabel>Where?</SubLabel>
                  <Chips
                    multiple
                    options={PAIN_AREA_OPTIONS}
                    accent={colors.accentAmber}
                    selected={extras.painAreas ?? []}
                    onChange={(next) => patchExtras({ painAreas: next })}
                  />
                </>,
              )
            : null}

          {show('mood')
            ? sectionCard(
                'mood',
                colors.accentBlue,
                summarize(extras.moods ?? []),
                <>
                  <Chips
                    multiple
                    options={MOOD_OPTIONS.map((m) => ({ value: m.value, emoji: m.emoji }))}
                    accent={colors.accentBlue}
                    selected={extras.moods ?? []}
                    onChange={(next) => patchExtras({ moods: next })}
                  />
                  <SubLabel>Energy</SubLabel>
                  <ScaleRow
                    label="Energy"
                    min={1}
                    max={5}
                    value={extras.energy}
                    onChange={(v) => patchExtras({ energy: v })}
                    accent={colors.accentBlue}
                    lowLabel="Drained"
                    highLabel="Buzzing"
                    emojis={['🪫', '😮‍💨', '🙂', '😊', '⚡']}
                  />
                  <SubLabel>Sleep</SubLabel>
                  <ScaleRow
                    label="Sleep quality"
                    min={1}
                    max={5}
                    value={extras.sleep}
                    onChange={(v) => patchExtras({ sleep: v })}
                    accent={colors.accentBlue}
                    lowLabel="Rough night"
                    highLabel="Slept great"
                    emojis={['😫', '😪', '😐', '🙂', '😴']}
                  />
                  <SubLabel>Stress</SubLabel>
                  <ScaleRow
                    label="Stress"
                    min={1}
                    max={5}
                    value={extras.stress}
                    onChange={(v) => patchExtras({ stress: v })}
                    accent={colors.accentBlue}
                    lowLabel="Chill"
                    highLabel="Very stressed"
                  />
                </>,
              )
            : null}

          {supportNote ? <NoticeCard emoji="💛" body={supportNote} accent={colors.accentAmber} /> : null}

          {show('discharge')
            ? sectionCard(
                'discharge',
                colors.accentBlue,
                extras.discharge ?? null,
                <>
                  <Chips
                    options={DISCHARGE_OPTIONS.map((d) => d.value)}
                    accent={colors.accentBlue}
                    selected={extras.discharge}
                    onChange={(v) => patchExtras({ discharge: v })}
                  />
                  {dischargeHint ? <Text style={[trackingStyles.hint, { fontSize: 13 }]}>{dischargeHint}</Text> : null}
                </>,
              )
            : null}

          {show('intimacy')
            ? sectionCard(
                'intimacy',
                colors.accentPurple,
                intercourse ? (prefs.discreet ? 'Logged' : extras.protection ?? 'Logged') : null,
                <>
                  <ToggleRow
                    label={prefs.discreet ? 'Log for today' : 'Had sex'}
                    value={intercourse}
                    onChange={setIntercourse}
                    accent={colors.accentPurple}
                  />
                  {intercourse ? (
                    <Chips
                      options={PROTECTION_OPTIONS}
                      accent={colors.accentPurple}
                      selected={extras.protection}
                      onChange={(v) => patchExtras({ protection: v })}
                    />
                  ) : null}
                  <SubLabel>{prefs.discreet ? 'Drive' : 'Sex drive'}</SubLabel>
                  <Chips
                    options={LIBIDO_OPTIONS}
                    accent={colors.accentPurple}
                    selected={extras.libido}
                    onChange={(v) => patchExtras({ libido: v })}
                  />
                </>,
                prefs.discreet ? { title: 'Private', emoji: '🔒', defaultOpen: false } : undefined,
              )
            : null}

          {show('fertility') && !prefs.discreet
            ? sectionCard(
                'fertility',
                colors.accentGreen,
                [extras.bbt ? `${extras.bbt}°${prefs.tempUnit}` : null, extras.ovulationTest ? `OPK ${extras.ovulationTest}` : null]
                  .filter(Boolean)
                  .join(' · ') || null,
                <>
                  <SubLabel>Basal body temperature (°{prefs.tempUnit})</SubLabel>
                  <TextInput
                    style={trackingStyles.input}
                    keyboardType="decimal-pad"
                    value={extras.bbt ?? ''}
                    onChangeText={(v) => patchExtras({ bbt: v.replace(/[^0-9.,]/g, '').replace(',', '.') || undefined })}
                    placeholder={prefs.tempUnit === 'F' ? 'e.g. 97.7' : 'e.g. 36.5'}
                    placeholderTextColor={colors.textMuted}
                  />
                  <SubLabel>Ovulation test</SubLabel>
                  <Chips
                    options={OVULATION_TEST_OPTIONS}
                    accent={colors.accentGreen}
                    selected={extras.ovulationTest}
                    onChange={(v) => patchExtras({ ovulationTest: v })}
                  />
                  <SubLabel>Pregnancy test</SubLabel>
                  <Chips
                    options={PREGNANCY_TEST_OPTIONS}
                    accent={colors.accentGreen}
                    selected={extras.pregnancyTest}
                    onChange={(v) => patchExtras({ pregnancyTest: v })}
                  />
                </>,
              )
            : null}

          {show('birthControl')
            ? sectionCard(
                'birthControl',
                colors.accentGreen,
                extras.birthControlTaken ? 'Taken ✓' : null,
                prefs.birthControl === 'none' ? (
                  <Text style={trackingStyles.hint}>Choose your method in ✨ Make it yours to get a daily check-off.</Text>
                ) : (
                  <ToggleRow
                    label={bcDaily ? 'Took my pill today' : 'Taken / applied / checked today'}
                    hint={BIRTH_CONTROL_OPTIONS.find((o) => o.value === prefs.birthControl)?.label}
                    value={Boolean(extras.birthControlTaken)}
                    onChange={(v) => patchExtras({ birthControlTaken: v || undefined })}
                    accent={colors.accentGreen}
                  />
                ),
              )
            : null}

          {show('menopause')
            ? sectionCard(
                'menopause',
                colors.accentPurple,
                summarize(extras.menopauseSymptoms ?? []),
                <Chips
                  multiple
                  options={MENOPAUSE_SYMPTOM_OPTIONS}
                  accent={colors.accentPurple}
                  selected={extras.menopauseSymptoms ?? []}
                  onChange={(next) => patchExtras({ menopauseSymptoms: next })}
                />,
              )
            : null}

          {show('postpartum')
            ? sectionCard(
                'postpartum',
                colors.accentAmber,
                summarize(extras.postpartum ?? []),
                <Chips
                  multiple
                  options={POSTPARTUM_OPTIONS}
                  accent={colors.accentAmber}
                  selected={extras.postpartum ?? []}
                  onChange={(next) => patchExtras({ postpartum: next })}
                />,
              )
            : null}

          {show('notes')
            ? sectionCard(
                'notes',
                colors.accentBlue,
                notes.trim() ? notes.trim() : null,
                <TextInput
                  style={[trackingStyles.input, trackingStyles.textarea]}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Stress, travel, what helped…"
                  placeholderTextColor={colors.textMuted}
                />,
              )
            : null}

          {savedNote ? <Text style={trackingStyles.successBanner}>{savedNote}</Text> : null}
          <Pressable
            style={[trackingStyles.primaryBtn, { backgroundColor: red }, busy && trackingStyles.disabled]}
            disabled={busy}
            onPress={saveDay}
            accessibilityRole="button"
          >
            <Text style={[trackingStyles.primaryBtnText, { color: '#fff' }]}>
              Save {selectedDate === today ? 'today' : shortDate(selectedDate)}
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Pressable style={trackingStyles.ghostBtn} disabled={busy} onPress={resetDrafts}>
              <Text style={trackingStyles.ghostBtnText}>Discard changes</Text>
            </Pressable>
            {cycleDayHasAnyData(selectedLog) || cycleExtrasHasData(savedExtras) ? (
              <Pressable style={trackingStyles.ghostBtn} disabled={busy} onPress={confirmClearDay}>
                <Text style={[trackingStyles.ghostBtnText, trackingStyles.dangerText]}>Clear this day…</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}

      <CycleInsightsCard insights={insights} word={word} />

      {prefs.explainers || prefs.goals.includes('learning') ? <CycleBasicsCard /> : null}

      {settings ? (
        <SectionCard
          emoji="⚙️"
          title={`${Word} dates & predictions`}
          accent={colors.accentBlue}
          summary={`Avg cycle ${settings.avg_cycle_length}d · ${word} ${settings.avg_period_length}d`}
          defaultOpen={false}
        >
          {openPeriod ? (
            <>
              <Text style={trackingStyles.label}>{Word} started (YYYY-MM-DD)</Text>
              <IsoDateInput
                style={trackingStyles.input}
                value={periodStartDraft}
                editable={!busy}
                onChangeText={setPeriodStartDraft}
                onBlur={() => {
                  const normalized = tryNormalizeIsoDate(periodStartDraft);
                  if (!normalized || normalized === openPeriod.started_on || !user) return;
                  void runAction(() => updatePeriodStart(user.id, openPeriod.id, normalized));
                }}
              />
              <Text style={trackingStyles.label}>{Word} end date</Text>
              <IsoDateInput
                style={trackingStyles.input}
                value={periodEndDraft}
                editable={!busy}
                onChangeText={setPeriodEndDraft}
              />
              <Pressable
                style={[trackingStyles.secondaryBtn, busy && trackingStyles.disabled]}
                disabled={busy || !periodEndDraft}
                onPress={() => user && void runAction(() => endPeriod(user.id, periodEndDraft), 'Marked as ended')}
              >
                <Text style={trackingStyles.secondaryBtnText}>Save end date</Text>
              </Pressable>
            </>
          ) : null}

          {!openPeriod && lastClosedPeriod?.ended_on ? (
            <>
              <Text style={trackingStyles.label}>Last {word} ended</Text>
              <IsoDateInput
                style={trackingStyles.input}
                value={lastEndedDraft}
                editable={!busy}
                onChangeText={setLastEndedDraft}
                onBlur={() => {
                  const normalized = tryNormalizeIsoDate(lastEndedDraft);
                  if (!normalized || !lastClosedPeriod.ended_on || normalized === lastClosedPeriod.ended_on || !user) {
                    return;
                  }
                  void runAction(() => updatePeriodEnd(user.id, lastClosedPeriod.id, normalized));
                }}
              />
            </>
          ) : null}

          {canMarkLate ? (
            <Pressable
              style={trackingStyles.secondaryBtn}
              disabled={busy}
              onPress={() => user && void runAction(async () => void (await markPeriodLate(user.id)))}
            >
              <Text style={trackingStyles.secondaryBtnText}>
                {prediction?.isLate ? 'Update late prediction' : `Mark ${word} late`}
              </Text>
            </Pressable>
          ) : null}
          {settings.period_late && !openPeriod ? (
            <Pressable style={trackingStyles.ghostBtn} disabled={busy} onPress={() => user && void runAction(() => clearPeriodLate(user.id))}>
              <Text style={trackingStyles.ghostBtnText}>Clear late flag</Text>
            </Pressable>
          ) : null}

          <SubLabel>Typical lengths</SubLabel>
          <Text style={trackingStyles.label}>Average cycle length (days)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={String(settings.avg_cycle_length)}
            onChangeText={(v) => setSettings({ ...settings, avg_cycle_length: Number(v) || 28 })}
            onBlur={() =>
              user &&
              void runAction(() =>
                updateCycleSettings(user.id, {
                  avg_cycle_length: settings.avg_cycle_length,
                  avg_period_length: settings.avg_period_length,
                }),
              )
            }
          />
          <Text style={trackingStyles.label}>Average {word} length (days)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={String(settings.avg_period_length)}
            onChangeText={(v) => setSettings({ ...settings, avg_period_length: Number(v) || 5 })}
            onBlur={() =>
              user &&
              void runAction(() =>
                updateCycleSettings(user.id, {
                  avg_cycle_length: settings.avg_cycle_length,
                  avg_period_length: settings.avg_period_length,
                }),
              )
            }
          />
          <Text style={trackingStyles.label}>Expected days until next {word} (this cycle only)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={settings.expected_next_cycle_days != null ? String(settings.expected_next_cycle_days) : ''}
            placeholder={`e.g. ${settings.avg_cycle_length}`}
            placeholderTextColor={colors.textMuted}
            onChangeText={(v) => setSettings({ ...settings, expected_next_cycle_days: v ? Number(v) : null })}
            onBlur={() =>
              user &&
              void runAction(() =>
                updateCycleSettings(user.id, { expected_next_cycle_days: settings.expected_next_cycle_days }),
              )
            }
          />
          {settings.expected_next_cycle_days != null ? (
            <Pressable
              style={trackingStyles.ghostBtn}
              disabled={busy}
              onPress={() => user && void runAction(() => updateCycleSettings(user.id, { expected_next_cycle_days: null }))}
            >
              <Text style={trackingStyles.ghostBtnText}>Clear upcoming-cycle override</Text>
            </Pressable>
          ) : null}

          <SubLabel>Fix a mistake</SubLabel>
          {!openPeriod && lastClosedPeriod ? (
            <Pressable
              style={trackingStyles.secondaryBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert(`Reopen last ${word}?`, 'Removes only the ended date so tracking continues.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reopen', onPress: () => user && void runAction(() => undoLastPeriodEnd(user.id)) },
                ])
              }
            >
              <Text style={trackingStyles.secondaryBtnText}>Reopen last {word}</Text>
            </Pressable>
          ) : null}
          {openPeriod ? (
            <Pressable
              style={trackingStyles.ghostBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert(`Delete current ${word}?`, 'Cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => user && void runAction(() => cancelOpenPeriod(user.id)) },
                ])
              }
            >
              <Text style={[trackingStyles.ghostBtnText, trackingStyles.dangerText]}>Delete current {word}</Text>
            </Pressable>
          ) : null}
          {periods.length > 0 && !openPeriod ? (
            <Pressable
              style={trackingStyles.ghostBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert(`Delete latest ${word}?`, 'Cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => user && void runAction(() => deleteMostRecentPeriod(user.id)) },
                ])
              }
            >
              <Text style={[trackingStyles.ghostBtnText, trackingStyles.dangerText]}>Delete latest {word}</Text>
            </Pressable>
          ) : null}
        </SectionCard>
      ) : null}

      <EditCustomSymptomsModal
        visible={editSymptomsKind != null}
        defaults={editSymptomsKind === 'during' ? CYCLE_SYMPTOMS_DURING : CYCLE_SYMPTOMS_PRE}
        custom={
          editSymptomsKind === 'during'
            ? (settings?.custom_symptoms_during ?? [])
            : (settings?.custom_symptoms_pre ?? [])
        }
        onCancel={() => setEditSymptomsKind(null)}
        onSave={(next) => {
          if (!user || !editSymptomsKind) return;
          const kind = editSymptomsKind;
          setEditSymptomsKind(null);
          void runAction(() =>
            updateCycleSettings(
              user.id,
              kind === 'during' ? { custom_symptoms_during: next } : { custom_symptoms_pre: next },
            ),
          );
        }}
      />

      <CyclePersonalizeSheet
        visible={personalizeOpen}
        prefs={prefs}
        busy={busy}
        onCancel={() => setPersonalizeOpen(false)}
        onSave={(next) => {
          setPersonalizeOpen(false);
          void savePrefs(next)
            .then(() => {
              successFeedback();
              setSavedNote('Your tracker is set up ✨');
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

function summarize(list: string[]): string | null {
  if (list.length === 0) return null;
  if (list.length <= 2) return list.join(', ');
  return `${list.slice(0, 2).join(', ')} +${list.length - 2}`;
}
