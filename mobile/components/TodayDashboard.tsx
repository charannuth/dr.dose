import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions, type LayoutRectangle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { fonts, type ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useAuth } from '../hooks/useAuth';
import { useDashboardSummaries } from '../hooks/useDashboardSummaries';
import { todayLocalDate, scheduleTimeToMinutes } from '../lib/dates';
import { routes } from '../lib/routes';
import { getDisplayStreakDays } from '../lib/streakBadges';
import type { StreakStats } from '../lib/streaks';
import type { MedicationWithStatus } from '../lib/types';
import { isAsNeededMed, isSupplement } from '../lib/medicationSchedule';
import { todayDoseTotals } from '../lib/medications';
import { getRefillAlerts } from '../lib/refills';
import { REMOTE_WIDGETS } from '../lib/dashboardSummaries';
import { dashboardColumns, widgetDropTarget, moveWidgetTo, dashboardStorageKey, parseDashboardLayout, WIDGET_CATALOG, type DashboardLayout, type WidgetKind, type WidgetSummary } from '../lib/dashboardLayout';
import { WidgetMotion } from './dashboard/WidgetMotion';
import { DashboardEditor } from './dashboard/DashboardEditor';

type Props = {
  stats: StreakStats | null;
  medications: MedicationWithStatus[];
  refreshKey: number;
  onMedicationTab: (tab: 'scheduled' | 'as_needed' | 'supplement') => void;
};

export function TodayDashboard({ stats, medications, refreshKey, onMedicationTab }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const [expanded, setExpanded] = useState(true);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [draft, setDraft] = useState<DashboardLayout | null>(null);
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [boardWidth, setBoardWidth] = useState(0);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const lastReorderAt = useRef(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const latestRemote = useRef<Partial<Record<WidgetKind, WidgetSummary>>>({});
  const [dragSummaries, setDragSummaries] = useState<Partial<Record<WidgetKind, WidgetSummary>> | null>(null);
  const dragRects = useRef(new Map<string, LayoutRectangle>());
  const lastDragMove = useRef<{ x: number; y: number } | null>(null);
  const recordRect = useCallback((id: string, rect: LayoutRectangle) => { dragRects.current.set(id, rect); }, []);
  const startDrag = useCallback((id: string) => { setSelectedWidgetId(id); setDraggingId(id); lastReorderAt.current = 0; setDragSummaries(latestRemote.current); lastDragMove.current = null; }, []);
  const endDrag = useCallback(() => { setDraggingId(null); setDragSummaries(null); lastDragMove.current = null; }, []);
  const dragMove = useCallback((id: string, x: number, y: number) => {
    const last = lastDragMove.current;
    if (last && Math.hypot(x - last.x, y - last.y) < 28) return;
    const current = draftRef.current;
    if (!current) return;
    const target = widgetDropTarget(current.widgets, dragRects.current, id, x, y);
    const now = Date.now();
    if (!target || now - lastReorderAt.current < 220) return;
    lastReorderAt.current = now;
    lastDragMove.current = { x, y };
    const next = { ...current, widgets: moveWidgetTo(current.widgets, id, target) };
    draftRef.current = next;
    setDraft(next);
  }, []);
  const today = todayLocalDate();
  const remote = useDashboardSummaries(user?.id, (draft ?? layout)?.widgets ?? [], today, refreshKey);
  useEffect(() => { latestRemote.current = remote; }, [remote]);

  useEffect(() => {
    let active = true;
    setLayout(null);
    setDraft(null);
    setLoadError(false);
    if (!user?.id) return;
    AsyncStorage.getItem(dashboardStorageKey(user.id)).then((raw) => {
      if (active) setLayout(parseDashboardLayout(raw));
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [user?.id, retry]);

  function edit() {
    if (!layout) return;
    setError(null);
    setSelectedWidgetId(layout.widgets[0]?.id ?? null);
    dragRects.current.clear();
    setDraft({ ...layout, widgets: layout.widgets.map((widget) => ({ ...widget })) });
  }
  async function save() {
    if (!draft || !user || saving) return;
    setSaving(true);
    setError(null);
    try {
      await AsyncStorage.setItem(dashboardStorageKey(user.id), JSON.stringify(draft));
      setLayout(draft);
      setDraft(null);
    } catch { setError('Your layout could not be saved. Try again, or cancel to keep your previous layout.'); }
    finally { setSaving(false); }
  }

  const daily = medications.filter((med) => !isSupplement(med) && !isAsNeededMed(med));
  const prn = medications.filter((med) => !isSupplement(med) && isAsNeededMed(med));
  const supplements = medications.filter(isSupplement);
  const totals = todayDoseTotals(daily);
  const refills = getRefillAlerts(medications);
  const pending = daily.flatMap((med) => med.slots.filter((slot) => !slot.taken).map((slot) => ({ name: med.name, label: slot.label, minutes: scheduleTimeToMinutes(slot.time) })))
    .filter((slot) => Number.isFinite(slot.minutes)).sort((a, b) => a.minutes - b.minutes);
  const days = stats?.consistencyCalendar.slice(-7) ?? [];
  const completeDays = days.filter((day) => day.status === 'perfect').length;

  function summary(kind: WidgetKind): WidgetSummary {
    if (REMOTE_WIDGETS.includes(kind)) return (dragSummaries ?? remote)[kind] ?? { value: 'Loading…', subtitle: 'Fetching your summary', details: [] };
    switch (kind) {
      case 'doses': return { value: `${totals.taken} / ${totals.total}`, subtitle: 'Scheduled doses today', details: daily.length ? daily.map((med) => `${med.name} · ${med.dosesTakenToday}/${med.dosesTotalToday} logged`) : ['No daily medications added yet.'] };
      case 'next': return { value: pending[0]?.label ?? (totals.total ? 'All logged' : 'No doses'), subtitle: pending[0]?.name ?? 'Today’s schedule', details: pending.length ? pending.map((slot) => `${slot.label} · ${slot.name}`) : ['Open your medication list to manage your schedule.'] };
      case 'refills': return { value: String(refills.length), subtitle: 'Refill reminders', details: refills.length ? refills.slice(0, 3).map((alert) => `${alert.name} · ${alert.remainingLabel} remaining`) : ['No current low-supply alerts. Add inventory to track refills.'] };
      case 'prn': return { value: String(prn.reduce((sum, med) => sum + med.dosesTakenToday, 0)), subtitle: 'As-needed doses today', details: [`${prn.length} as-needed medications`, ...prn.slice(0, 2).map((med) => `${med.name} · ${med.dosesTakenToday} logged`)] };
      case 'supplements': return { value: String(supplements.reduce((sum, med) => sum + med.dosesTakenToday, 0)), subtitle: 'Supplement doses today', details: [`${supplements.length} supplements`, ...supplements.slice(0, 2).map((med) => `${med.name} · ${med.dosesTakenToday} logged`)] };
      case 'streak': return { value: stats ? `${getDisplayStreakDays(stats)} ${getDisplayStreakDays(stats) === 1 ? 'day' : 'days'}` : 'Unavailable', subtitle: 'Current medication streak', details: stats ? [`Personal best: ${stats.longestStreak} days`, stats.todayComplete ? 'All scheduled medications logged today.' : 'Today’s scheduled medications are still in progress.'] : ['Pull down to refresh your stats.'] };
      case 'week': return { value: stats ? `${completeDays} / 7` : 'Unavailable', subtitle: 'Complete days · last 7 days', details: [`${days.filter((day) => day.status === 'partial').length} partial / in progress · ${days.filter((day) => day.status === 'missed').length} not logged`, 'Scheduled medications · includes today and late logs.'] };
      case 'safety': return { value: 'Check interactions', subtitle: `${medications.length} items in your list`, details: ['Open Drug safety to review known interactions. A check cannot rule out all interactions.'] };
      case 'help': return { value: 'Need a hand?', subtitle: 'Help & resources', details: ['Find app guidance, medical sources, and support information.'] };
      default: return { value: 'Open feature', subtitle: '', details: [] };
    }
  }

  function openWidget(kind: WidgetKind) {
    switch (kind) {
      case 'doses': case 'next': onMedicationTab('scheduled'); return;
      case 'prn': onMedicationTab('as_needed'); return;
      case 'supplements': onMedicationTab('supplement'); return;
      case 'streak': router.push(routes.streaks); return;
      case 'week': router.push(routes.history); return;
      case 'refills': router.push(routes.refills); return;
      case 'account': router.push(routes.account); return;
      case 'wellness': router.push(routes.wellness); return;
      case 'visits': router.push(routes.doctorVisits); return;
      case 'records': router.push(routes.medicalRecords); return;
      case 'safety': router.push(routes.interactions); return;
      case 'help': router.push(routes.help); return;
      case 'weight': case 'cycle': case 'hrt': router.push({ pathname: routes.tracking, params: { widgetTracker: kind } }); return;
      default: router.push(routes.tracking);
    }
  }

  function board(config: DashboardLayout, preview = false) {
    const width = preview ? previewWidth : boardWidth;
    const columns = dashboardColumns(width, fontScale, config.mode);
    const smallWidth = Math.max(0, (width - (columns - 1) * 12) / columns);
    return (
      <View style={s.board} onLayout={(event) => (preview ? setPreviewWidth : setBoardWidth)(event.nativeEvent.layout.width)}>
        {!config.widgets.length ? <View style={s.empty}><Text style={s.widgetTitle}>Your space, your widgets</Text><Text style={s.caption}>Choose Edit to add your first widget.</Text></View> : null}
        {config.widgets.map((widget) => {
              const item = WIDGET_CATALOG.find((entry) => entry.kind === widget.kind)!;
              const content = summary(widget.kind);
              const wide = widget.size === 'wide';
              const sideBySide = wide && width >= 350 && fontScale < 1.3 && widget.kind !== 'week';
              const selected = preview && widget.id === (config.widgets.some((w) => w.id === selectedWidgetId) ? selectedWidgetId : config.widgets[0]?.id);
              return (
                <WidgetMotion key={widget.id} id={widget.id} editable={preview && !saving} active={preview && draggingId === widget.id}
                  onLayout={preview ? recordRect : () => {}} onStart={startDrag} onMove={dragMove} onEnd={endDrag}
                  style={{ width: width ? wide ? width : smallWidth : '100%', minHeight: wide ? 168 : smallWidth || 170 }}>
                <Pressable disabled={preview && (saving || draggingId !== null)} onPress={preview ? () => setSelectedWidgetId(widget.id) : () => openWidget(widget.kind)} onLongPress={preview ? undefined : () => { edit(); setSelectedWidgetId(widget.id); }}
                  accessibilityState={preview ? { selected } : undefined} accessibilityRole="button" accessibilityLabel={`${item.title}. ${content.value}. ${content.subtitle}${wide ? '. ' + content.details.join('. ') : ''}`}
                  accessibilityHint={preview ? 'Tap to select. Use the size controls above, or hold to drag.' : 'Tap to open. Long press to edit your widgets.'}
                  style={[s.widget, selected && s.selectedWidget]}>
                  <View style={s.widgetHeader}><Text style={s.symbol}>{item.symbol}</Text><Text style={s.widgetTitle}>{item.title}</Text><Text style={s.arrow}>{preview ? selected ? '✓' : '⋯' : '↗'}</Text></View>
                  <View style={[s.widgetBody, sideBySide && s.wideBody]}>
                    <View style={[s.summary, sideBySide && { flex: 0.85 }]}>
                      <Text numberOfLines={wide ? undefined : 2} style={s.value}>{content.value}</Text>
                      <Text style={s.caption}>{content.subtitle}</Text>
                      {wide && widget.kind === 'doses' && totals.total > 0 ? <View style={s.progressTrack} accessibilityLabel={`${totals.taken} of ${totals.total} doses logged`}>
                        <View style={[s.progressFill, { width: `${Math.min(100, totals.taken / totals.total * 100)}%` }]} />
                      </View> : null}
                    </View>
                    {wide && widget.kind !== 'week' ? <View style={[s.details, sideBySide && s.sideDetails]}>
                      {content.details.slice(0, 4).map((detail, index) => <Text key={index} style={s.detail}>{detail}</Text>)}
                      {content.details.length > 4 ? <Text style={s.caption}>+{content.details.length - 4} more in {item.title}</Text> : null}
                    </View> : null}
                  </View>
                  {wide && widget.kind === 'week' ? <>
                    {widget.kind === 'week' && days.length ? <View style={s.weekStrip}>{days.map((day) => <View key={day.date} style={s.weekDay} accessible accessibilityLabel={`${day.date}: ${day.status === 'perfect' ? 'complete' : day.status === 'none' ? 'no schedule' : day.status === 'partial' ? 'partial or in progress' : 'not logged'}`}>
                      <Text style={s.dayLabel}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
                      <Text style={[s.dayMark, { color: day.status === 'perfect' ? colors.successText : day.status === 'partial' ? colors.partialText : colors.textMuted }]}>{day.status === 'perfect' ? '✓' : day.status === 'partial' ? '◐' : day.status === 'missed' ? '○' : '–'}</Text>
                    </View>)}</View> : null}
                    <View style={s.details}>{content.details.slice(0, 3).map((detail, index) => <Text key={index} style={s.detail}>{detail}</Text>)}</View>
                  </> : null}
                </Pressable>
                </WidgetMotion>
              );
            })}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={{ flex: 1 }}><Text style={s.eyebrow}>YOUR HEALTH, YOUR WAY</Text><Text style={s.title}>Quick view</Text></View>
        <Pressable onPress={edit} disabled={!layout} accessibilityRole="button" accessibilityLabel="Edit quick view widgets" style={s.control}><Text style={s.link}>Edit</Text></Pressable>
        <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={expanded ? 'Hide quick view' : 'Show quick view'} style={s.control}><Text style={s.link}>{expanded ? 'Hide −' : 'Show +'}</Text></Pressable>
      </View>
      {expanded ? layout ? board(layout) : loadError ? <Pressable onPress={() => setRetry((v) => v + 1)} accessibilityRole="button" style={s.empty}><Text style={s.caption}>Could not load your layout. Tap to retry.</Text></Pressable> : <ActivityIndicator color={colors.accent} accessibilityLabel="Loading your widgets" /> : null}
      {draft ? <DashboardEditor value={draft} onChange={setDraft} selectedId={selectedWidgetId} saving={saving} dragging={draggingId !== null} error={error} onSave={() => void save()} onCancel={() => setDraft(null)} preview={board(draft, true)} /> : null}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    container: { gap: 12 }, header: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: 8 },
    eyebrow: { fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 1.2, color: c.textMuted },
    title: { fontFamily: fonts.heading, fontSize: 22, color: c.text, marginTop: 4 },
    control: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' as const }, link: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.accent },
    board: { width: '100%' as const, flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, alignItems: 'stretch' as const }, row: { flexDirection: 'row' as const, gap: 12, alignItems: 'stretch' as const },
    widget: { flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 16, gap: 14 },
    widgetHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    symbol: { fontSize: 20, color: c.accent }, widgetTitle: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 13, color: c.text },
    arrow: { color: c.textMuted, fontSize: 14 }, value: { fontFamily: fonts.heading, fontSize: 23, letterSpacing: -0.6, color: c.text },
    caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18, color: c.textMuted },
    details: { borderTopWidth: 1, borderColor: c.border, paddingTop: 10, gap: 5 }, detail: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
    empty: { padding: 20, gap: 10, backgroundColor: c.surface, borderRadius: 20 },
    selectedWidget: { borderColor: c.accent },
    widgetBody: { flex: 1, gap: 14, justifyContent: 'center' as const },
    wideBody: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 20 },
    summary: { gap: 8 },
    sideDetails: { flex: 1.15, borderTopWidth: 0, paddingTop: 0, borderLeftWidth: 1, paddingLeft: 16, gap: 10 },
    progressTrack: { height: 4, backgroundColor: c.border, borderRadius: 2, marginTop: 4, overflow: 'hidden' as const },
    progressFill: { height: 4, backgroundColor: c.accent, borderRadius: 2 },
    weekStrip: { flexDirection: 'row' as const, gap: 6 }, weekDay: { flex: 1, alignItems: 'center' as const, gap: 4 },
    dayLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: c.textMuted }, dayMark: { fontFamily: fonts.bodyBold, fontSize: 20 },
  };
}
