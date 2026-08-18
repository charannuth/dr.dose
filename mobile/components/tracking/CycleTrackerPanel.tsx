import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { todayLocalDate } from '../../lib/dates';
import {
  cancelOpenPeriod,
  clearPeriodLate,
  CYCLE_SYMPTOMS_DURING,
  cycleDayHasAnyData,
  cycleDayHasOptionalData,
  deleteCycleDayLog,
  deleteMostRecentPeriod,
  softClearCycleDayLog,
  CYCLE_SYMPTOMS_PRE,
  endPeriod,
  fetchCycleDayLogs,
  fetchCyclePeriods,
  fetchCycleSettings,
  fetchOpenPeriod,
  cycleDayInPeriod,
  cycleLengthSourceLabel,
  effectiveCycleLengthForPrediction,
  getCyclePrediction,
  markPeriodLate,
  mergeSymptomOptions,
  recentCycleLengths,
  undoLastPeriodEnd,
  updatePeriodStart,
  updatePeriodEnd,
  PHASE_HINTS,
  PHASE_LABELS,
  startPeriod,
  updateCycleSettings,
  upsertCycleDayLog,
  type CycleDayLog,
  type CyclePeriod,
  type CycleSettings,
  type FlowLevel,
} from '../../lib/tracking/cycle';
import { CycleDayStrip } from './CycleDayStrip';
import { IsoDateInput } from '../IsoDateInput';
import { tryNormalizeIsoDate } from '../../lib/isoDateInput';
import { ChipMultiSelect } from './ChipMultiSelect';
import { EditCustomSymptomsModal } from './EditCustomSymptomsModal';
import { useTrackingStyles } from './trackingStyles';

const FLOW_OPTIONS: { value: FlowLevel; label: string }[] = [
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEnd(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onDataMutated?: () => void;
};

export function CycleTrackerPanel({ selectedDate, onSelectDate, onDataMutated }: Props) {
  const trackingStyles = useTrackingStyles();
  const { colors } = useTheme();
  const { user } = useAuth();
  const today = todayLocalDate();
  const [settings, setSettings] = useState<CycleSettings | null>(null);
  const [periods, setPeriods] = useState<CyclePeriod[]>([]);
  const [openPeriod, setOpenPeriod] = useState<CyclePeriod | null>(null);
  const [dayLogs, setDayLogs] = useState<CycleDayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodEndDraft, setPeriodEndDraft] = useState(today);
  const [periodStartDraft, setPeriodStartDraft] = useState('');
  const [lastEndedDraft, setLastEndedDraft] = useState('');
  const [fixExpanded, setFixExpanded] = useState(false);

  const logMonth = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [selectedDate]);

  const reload = useCallback(async () => {
    if (!user) return;
    const from = monthStart(logMonth.year, logMonth.month);
    const to = monthEnd(logMonth.year, logMonth.month);
    const [s, p, open, logs] = await Promise.all([
      fetchCycleSettings(user.id),
      fetchCyclePeriods(user.id),
      fetchOpenPeriod(user.id),
      fetchCycleDayLogs(user.id, from, to),
    ]);
    setSettings(s);
    setPeriods(p);
    setOpenPeriod(open);
    setDayLogs(logs);
  }, [user, logMonth]);

  useEffect(() => {
    if (openPeriod) {
      setPeriodEndDraft(today);
      setPeriodStartDraft(openPeriod.started_on);
    }
  }, [openPeriod?.id, openPeriod?.started_on, today]);

  const lastClosedPeriod = useMemo(
    () => periods.find((p) => p.ended_on != null) ?? null,
    [periods],
  );

  useEffect(() => {
    if (lastClosedPeriod?.ended_on) {
      setLastEndedDraft(lastClosedPeriod.ended_on);
    }
  }, [lastClosedPeriod?.id, lastClosedPeriod?.ended_on]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    reload()
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load cycle data');
        }
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

  const recentLengths = useMemo(() => recentCycleLengths(periods), [periods]);
  const lastRecordedLength = recentLengths[0] ?? null;

  const dayHasLog = useCallback(
    (date: string) => {
      const log = dayLogs.find((l) => l.log_date === date);
      if (!log) return false;
      return Boolean(
        log.flow_level ||
          log.intercourse ||
          log.notes?.trim() ||
          log.symptoms.length > 0 ||
          log.symptoms_pre.length > 0,
      );
    },
    [dayLogs],
  );

  const isFutureDay = selectedDate > today;
  const selectedLog = dayLogs.find((l) => l.log_date === selectedDate);
  const [flow, setFlow] = useState<FlowLevel | ''>('');
  const [symptomsPre, setSymptomsPre] = useState<string[]>([]);
  const [symptomsDuring, setSymptomsDuring] = useState<string[]>([]);
  const [intercourse, setIntercourse] = useState(false);
  const [notes, setNotes] = useState('');
  const [editSymptomsKind, setEditSymptomsKind] = useState<'pre' | 'during' | null>(
    null,
  );

  const preOptions = useMemo(
    () =>
      mergeSymptomOptions(CYCLE_SYMPTOMS_PRE, [
        ...(settings?.custom_symptoms_pre ?? []),
        ...symptomsPre,
      ]),
    [settings?.custom_symptoms_pre, symptomsPre],
  );
  const duringOptions = useMemo(
    () =>
      mergeSymptomOptions(CYCLE_SYMPTOMS_DURING, [
        ...(settings?.custom_symptoms_during ?? []),
        ...symptomsDuring,
      ]),
    [settings?.custom_symptoms_during, symptomsDuring],
  );

  useEffect(() => {
    setFlow(selectedLog?.flow_level ?? '');
    setSymptomsPre(selectedLog?.symptoms_pre ?? []);
    setSymptomsDuring(selectedLog?.symptoms ?? []);
    setIntercourse(selectedLog?.intercourse ?? false);
    setNotes(selectedLog?.notes ?? '');
  }, [selectedLog, selectedDate]);

  const selectedInPeriod = useMemo(
    () => cycleDayInPeriod(selectedDate, periods) != null,
    [selectedDate, periods],
  );
  const flowEnabled = selectedInPeriod && !isFutureDay;

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
      onDataMutated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const selectedDayHasOptional =
    cycleDayHasOptionalData(selectedLog) ||
    symptomsPre.length > 0 ||
    symptomsDuring.length > 0 ||
    intercourse ||
    Boolean(notes.trim());
  const selectedDayHasSaved = cycleDayHasAnyData(selectedLog);

  const canMarkLate =
    Boolean(prediction?.nextStart) &&
    !openPeriod &&
    periods.length > 0 &&
    (prediction!.isLate || today >= prediction!.nextStart!);

  if (loading && !settings) {
    return <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />;
  }

  return (
    <View>
      <Text style={trackingStyles.hint}>
        For personal tracking only — not contraception or diagnosis. Share logs with your
        clinician.
      </Text>
      {error ? <Text style={trackingStyles.errorBanner}>{error}</Text> : null}

      {prediction?.currentPhase ? (
        <View style={trackingStyles.card}>
          <Text style={[trackingStyles.sectionTitle, { marginBottom: 0 }]}>
            Today: {PHASE_LABELS[prediction.currentPhase]} phase
            {prediction.cycleDay != null ? ` · Day ${prediction.cycleDay}` : ''}
          </Text>
          <Text style={trackingStyles.hint}>{PHASE_HINTS[prediction.currentPhase]}</Text>
        </View>
      ) : null}

      {openPeriod ? (
        <>
          <Text style={trackingStyles.label}>Period started (YYYY-MM-DD)</Text>
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
          <Text style={trackingStyles.label}>Period end date</Text>
          <IsoDateInput
            style={trackingStyles.input}
            value={periodEndDraft}
            editable={!busy}
            onChangeText={setPeriodEndDraft}
          />
          <Pressable
            style={[trackingStyles.primaryBtn, busy && trackingStyles.disabled]}
            disabled={busy || !periodEndDraft}
            onPress={() =>
              user && void runAction(() => endPeriod(user.id, periodEndDraft))
            }
          >
            <Text style={trackingStyles.primaryBtnText}>Period ended</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          style={[trackingStyles.primaryBtn, busy && trackingStyles.disabled]}
          disabled={busy || isFutureDay}
          onPress={() =>
            user &&
            void runAction(() =>
              startPeriod(user.id, selectedDate <= today ? selectedDate : today),
            )
          }
        >
          <Text style={trackingStyles.primaryBtnText}>
            Period started
            {selectedDate < today ? ` (${selectedDate})` : ''}
          </Text>
        </Pressable>
      )}

      {canMarkLate ? (
        <Pressable
          style={trackingStyles.secondaryBtn}
          disabled={busy}
          onPress={() =>
            user &&
            void runAction(async () => {
              await markPeriodLate(user.id);
            })
          }
        >
          <Text style={trackingStyles.secondaryBtnText}>
            {prediction?.isLate ? 'Update late prediction' : 'Mark period late'}
          </Text>
        </Pressable>
      ) : null}

      {settings?.period_late && !openPeriod ? (
        <Pressable
          style={trackingStyles.ghostBtn}
          disabled={busy}
          onPress={() => user && void runAction(() => clearPeriodLate(user.id))}
        >
          <Text style={trackingStyles.ghostBtnText}>Clear late flag</Text>
        </Pressable>
      ) : null}

      {!openPeriod && lastClosedPeriod?.ended_on ? (
        <>
          <Text style={trackingStyles.label}>Last period ended</Text>
          <IsoDateInput
            style={trackingStyles.input}
            value={lastEndedDraft}
            editable={!busy}
            onChangeText={setLastEndedDraft}
            onBlur={() => {
              const normalized = tryNormalizeIsoDate(lastEndedDraft);
              if (
                !normalized ||
                !lastClosedPeriod.ended_on ||
                normalized === lastClosedPeriod.ended_on ||
                !user
              ) {
                return;
              }
              void runAction(() =>
                updatePeriodEnd(user.id, lastClosedPeriod.id, normalized),
              );
            }}
          />
        </>
      ) : null}

      <Pressable onPress={() => setFixExpanded((v) => !v)} style={{ marginVertical: 8 }}>
        <Text style={trackingStyles.ghostBtnText}>
          {fixExpanded ? '▼' : '▶'} Fix a mistake
        </Text>
      </Pressable>
      {fixExpanded ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={trackingStyles.hint}>
            Soft = adjust extras; period structure stays. Hard = permanent delete.
          </Text>
          {!openPeriod && lastClosedPeriod ? (
            <Pressable
              style={trackingStyles.secondaryBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  'Reopen last period?',
                  'Removes only the ended date so tracking continues.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reopen',
                      onPress: () =>
                        user && void runAction(() => undoLastPeriodEnd(user.id)),
                    },
                  ],
                )
              }
            >
              <Text style={trackingStyles.secondaryBtnText}>Reopen last period</Text>
            </Pressable>
          ) : null}
          {openPeriod ? (
            <Pressable
              style={trackingStyles.ghostBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  'Delete current period?',
                  'Cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () =>
                        user && void runAction(() => cancelOpenPeriod(user.id)),
                    },
                  ],
                )
              }
            >
              <Text style={[trackingStyles.ghostBtnText, trackingStyles.dangerText]}>
                Delete current period
              </Text>
            </Pressable>
          ) : null}
          {periods.length > 0 && !openPeriod ? (
            <Pressable
              style={trackingStyles.ghostBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert('Delete latest period?', 'Cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      user && void runAction(() => deleteMostRecentPeriod(user.id)),
                  },
                ])
              }
            >
              <Text style={[trackingStyles.ghostBtnText, trackingStyles.dangerText]}>
                Delete latest period
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {prediction?.nextStart && effectiveCycle ? (
        <View style={trackingStyles.card}>
          <Text style={trackingStyles.hint}>
            {prediction.isLate
              ? `Period is ${prediction.daysLate} day(s) late. Next estimated start `
              : 'Next period estimated '}
            <Text style={{ fontWeight: '700' }}>{prediction.nextStart}</Text>
          </Text>
          <Text style={trackingStyles.hint}>
            Based on {cycleLengthSourceLabel(effectiveCycle.source)} ({effectiveCycle.days}{' '}
            days).
          </Text>
        </View>
      ) : null}

      {settings ? (
        <View style={{ marginVertical: 12 }}>
          <Text style={trackingStyles.sectionTitle}>Cycle length & predictions</Text>
          {lastRecordedLength != null ? (
            <Text style={trackingStyles.hint}>
              Last completed cycle: {lastRecordedLength} days (average{' '}
              {settings.avg_cycle_length})
            </Text>
          ) : null}
          <Text style={trackingStyles.label}>Average cycle length (days)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={String(settings.avg_cycle_length)}
            onChangeText={(v) =>
              setSettings({
                ...settings,
                avg_cycle_length: Number(v) || 28,
              })
            }
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
          <Text style={trackingStyles.label}>Average period length (days)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={String(settings.avg_period_length)}
            onChangeText={(v) =>
              setSettings({
                ...settings,
                avg_period_length: Number(v) || 5,
              })
            }
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
          <Text style={trackingStyles.label}>Expected days until next period (this cycle only)</Text>
          <TextInput
            style={trackingStyles.input}
            keyboardType="number-pad"
            value={
              settings.expected_next_cycle_days != null
                ? String(settings.expected_next_cycle_days)
                : ''
            }
            placeholder={`e.g. ${settings.avg_cycle_length}`}
            onChangeText={(v) =>
              setSettings({
                ...settings,
                expected_next_cycle_days: v ? Number(v) : null,
              })
            }
            onBlur={() =>
              user &&
              void runAction(() =>
                updateCycleSettings(user.id, {
                  expected_next_cycle_days: settings.expected_next_cycle_days,
                }),
              )
            }
          />
          {settings.expected_next_cycle_days != null ? (
            <Pressable
              style={trackingStyles.ghostBtn}
              disabled={busy}
              onPress={() =>
                user &&
                void runAction(() =>
                  updateCycleSettings(user.id, { expected_next_cycle_days: null }),
                )
              }
            >
              <Text style={trackingStyles.ghostBtnText}>Clear upcoming-cycle override</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <CycleDayStrip
        selectedDate={selectedDate}
        today={today}
        onSelectDate={onSelectDate}
        dayHasLog={dayHasLog}
      />

      {isFutureDay ? (
        <Text style={trackingStyles.hint}>
          Future day — preview on calendar; logging unlocks on that date.
        </Text>
      ) : null}

      <View style={[trackingStyles.row, { alignItems: 'center', marginVertical: 8 }]}>
        <Switch
          value={intercourse}
          onValueChange={setIntercourse}
          disabled={isFutureDay}
        />
        <Text style={trackingStyles.label}>♥ Sexual intercourse</Text>
      </View>

      <Text style={trackingStyles.label}>Flow (menstruation)</Text>
      {flowEnabled ? (
        <View style={trackingStyles.chipWrap}>
          {FLOW_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              disabled={isFutureDay}
              onPress={() => setFlow(opt.value)}
              style={[trackingStyles.chip, flow === opt.value && trackingStyles.chipActive]}
            >
              <Text
                style={[
                  trackingStyles.chipText,
                  flow === opt.value && trackingStyles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            disabled={isFutureDay}
            onPress={() => setFlow('')}
            style={[trackingStyles.chip, flow === '' && trackingStyles.chipActive]}
          >
            <Text
              style={[trackingStyles.chipText, flow === '' && trackingStyles.chipTextActive]}
            >
              None
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text style={trackingStyles.hint}>
          {isFutureDay
            ? 'Flow unlocks on that date.'
            : 'Mark Period started first — flow is only logged during an active period.'}
        </Text>
      )}

      <ChipMultiSelect
        title="Pre-menstrual symptoms"
        options={preOptions}
        selected={symptomsPre}
        onChange={setSymptomsPre}
        disabled={isFutureDay}
        onAddPress={() => setEditSymptomsKind('pre')}
      />
      <ChipMultiSelect
        title="During period symptoms"
        options={duringOptions}
        selected={symptomsDuring}
        onChange={setSymptomsDuring}
        disabled={isFutureDay || !selectedInPeriod}
        onAddPress={() => setEditSymptomsKind('during')}
      />
      {!selectedInPeriod && !isFutureDay ? (
        <Text style={trackingStyles.hint}>
          During-period toggles unlock once this day is covered by a period.
        </Text>
      ) : null}

      <EditCustomSymptomsModal
        visible={editSymptomsKind != null}
        defaults={
          editSymptomsKind === 'during' ? CYCLE_SYMPTOMS_DURING : CYCLE_SYMPTOMS_PRE
        }
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
              kind === 'during'
                ? { custom_symptoms_during: next }
                : { custom_symptoms_pre: next },
            ),
          );
        }}
      />

      <Text style={trackingStyles.label}>Notes</Text>
      <TextInput
        style={[trackingStyles.input, trackingStyles.textarea]}
        multiline
        value={notes}
        onChangeText={setNotes}
        editable={!isFutureDay}
        placeholder="Stress, diet, sleep…"
      />

      {!isFutureDay ? (
        <>
          <Pressable
            style={[trackingStyles.primaryBtn, busy && trackingStyles.disabled]}
            disabled={busy}
            onPress={() =>
              user &&
              void runAction(() =>
                upsertCycleDayLog(user.id, selectedDate, {
                  flow_level: flowEnabled ? flow || null : null,
                  symptoms: selectedInPeriod ? symptomsDuring : [],
                  symptoms_pre: symptomsPre,
                  symptoms_post: [],
                  intercourse,
                  notes,
                }),
              )
            }
          >
            <Text style={trackingStyles.primaryBtnText}>Save day</Text>
          </Pressable>
          <Pressable
            style={trackingStyles.ghostBtn}
            disabled={busy}
            onPress={() => {
              if (selectedLog) {
                setFlow(selectedLog.flow_level ?? '');
                setSymptomsPre(selectedLog.symptoms_pre ?? []);
                setSymptomsDuring(selectedLog.symptoms ?? []);
                setIntercourse(selectedLog.intercourse ?? false);
                setNotes(selectedLog.notes ?? '');
              } else {
                setFlow('');
                setSymptomsPre([]);
                setSymptomsDuring([]);
                setIntercourse(false);
                setNotes('');
              }
            }}
          >
            <Text style={trackingStyles.ghostBtnText}>Discard edits</Text>
          </Pressable>
          {(selectedDayHasOptional || selectedDayHasSaved) && (
            <Pressable
              style={trackingStyles.secondaryBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  'Soft clear this day?',
                  'Removes symptoms, intercourse, and notes. Flow is kept.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Soft clear',
                      onPress: () => {
                        if (!user) return;
                        const keepFlow = flowEnabled
                          ? flow || selectedLog?.flow_level || null
                          : null;
                        void runAction(async () => {
                          if (selectedLog || keepFlow) {
                            await softClearCycleDayLog(user.id, selectedDate, keepFlow);
                          }
                          setSymptomsPre([]);
                          setSymptomsDuring([]);
                          setIntercourse(false);
                          setNotes('');
                        });
                      },
                    },
                  ],
                )
              }
            >
              <Text style={trackingStyles.secondaryBtnText}>Soft clear</Text>
            </Pressable>
          )}
          {selectedDayHasSaved ? (
            <Pressable
              style={trackingStyles.ghostBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  'Hard clear this day?',
                  'Permanently deletes all data for this day.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () =>
                        user &&
                        void runAction(async () => {
                          await deleteCycleDayLog(user.id, selectedDate);
                          setFlow('');
                          setSymptomsPre([]);
                          setSymptomsDuring([]);
                          setIntercourse(false);
                          setNotes('');
                        }),
                    },
                  ],
                )
              }
            >
              <Text style={[trackingStyles.ghostBtnText, trackingStyles.dangerText]}>
                Hard clear
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Pressable style={trackingStyles.secondaryBtn} onPress={() => onSelectDate(today)}>
          <Text style={trackingStyles.secondaryBtnText}>Go to today to log</Text>
        </Pressable>
      )}
    </View>
  );
}
