export const WIDGET_CATALOG = [
  { kind: 'doses', title: 'Daily doses', description: 'Today’s progress and remaining scheduled doses.', symbol: '✓', group: 'Medications' },
  { kind: 'next', title: 'Next dose', description: 'The earliest outstanding dose and medication.', symbol: '◷', group: 'Medications' },
  { kind: 'refills', title: 'Refill watch', description: 'Low supplies and remaining inventory.', symbol: '↻', group: 'Medications' },
  { kind: 'prn', title: 'As needed', description: 'As-needed doses logged today.', symbol: '+', group: 'Medications' },
  { kind: 'supplements', title: 'Supplements', description: 'Your supplements and today’s logs.', symbol: '✦', group: 'Medications' },
  { kind: 'streak', title: 'Streak', description: 'Your current streak and personal best.', symbol: '✧', group: 'Progress' },
  { kind: 'week', title: 'Weekly history', description: 'Seven-day completion and daily activity.', symbol: '▥', group: 'Progress' },
  { kind: 'wellness', title: 'Wellness', description: 'Today’s check-in, sleep, and energy.', symbol: '♡', group: 'Health' },
  { kind: 'visits', title: 'Doctor visits', description: 'Upcoming appointments, times, and locations.', symbol: '▦', group: 'Health' },
  { kind: 'weight', title: 'Weight', description: 'Latest weight and recent change.', symbol: '↗', group: 'Trackers' },
  { kind: 'cycle', title: 'Cycle & period', description: 'Your latest logged period and today’s flow.', symbol: '◒', group: 'Trackers' },
  { kind: 'hrt', title: 'HRT journal', description: 'Today’s journal and logged changes.', symbol: '≋', group: 'Trackers' },
  { kind: 'tracking', title: 'All trackers', description: 'Your enabled trackers in one place.', symbol: '▤', group: 'Trackers' },
  { kind: 'records', title: 'Medical records', description: 'Saved allergies, conditions, and blood type.', symbol: '▧', group: 'Health' },
  { kind: 'safety', title: 'Drug safety', description: 'A shortcut to check your medication list.', symbol: '◇', group: 'Shortcuts' },
  { kind: 'account', title: 'Account & reminders', description: 'Reminder status and account preferences.', symbol: '⚙', group: 'Shortcuts' },
  { kind: 'help', title: 'Help & resources', description: 'App guidance and medical information sources.', symbol: '?', group: 'Shortcuts' },
] as const;

export type WidgetKind = (typeof WIDGET_CATALOG)[number]['kind'];
export type WidgetSize = 'small' | 'wide';
export type DashboardWidget = { id: string; kind: WidgetKind; size: WidgetSize };
export type DashboardLayout = { version: 1; mode: 'adaptive' | 'list'; widgets: DashboardWidget[] };
export type WidgetSummary = { value: string; subtitle: string; details: string[] };

export function defaultDashboardLayout(): DashboardLayout {
  return { version: 1, mode: 'adaptive', widgets: [
    { id: 'initial-streak', kind: 'streak', size: 'small' },
    { id: 'initial-doses', kind: 'doses', size: 'small' },
    { id: 'initial-week', kind: 'week', size: 'wide' },
  ] };
}

/** Ignore obsolete widget types and malformed storage without losing valid choices. */
export function parseDashboardLayout(raw: string | null): DashboardLayout {
  if (!raw) return defaultDashboardLayout();
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.widgets)) return defaultDashboardLayout();
    const ids = new Set<string>();
    const widgets: DashboardWidget[] = [];
    for (const widget of value.widgets) {
      if (!widget || typeof widget.id !== 'string' || !widget.id || ids.has(widget.id)
        || !WIDGET_CATALOG.some((item) => item.kind === widget.kind)
        || !['small', 'wide'].includes(widget.size)) continue;
      ids.add(widget.id);
      widgets.push({ id: widget.id, kind: widget.kind, size: widget.size });
    }
    return { version: 1, mode: value.mode === 'list' ? 'list' : 'adaptive', widgets };
  } catch { return defaultDashboardLayout(); }
}

export function moveWidget(widgets: DashboardWidget[], id: string, direction: -1 | 1): DashboardWidget[] {
  const index = widgets.findIndex((widget) => widget.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= widgets.length) return widgets;
  const next = [...widgets];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function moveWidgetTo(widgets: DashboardWidget[], id: string, targetId: string): DashboardWidget[] {
  const source = widgets.findIndex((widget) => widget.id === id);
  const target = widgets.findIndex((widget) => widget.id === targetId);
  if (source < 0 || target < 0 || source === target) return widgets;
  const next = [...widgets];
  next.splice(target, 0, next.splice(source, 1)[0]);
  return next;
}

export function dashboardColumns(width: number, fontScale: number, mode: DashboardLayout['mode']): number {
  if (mode === 'list' || fontScale >= 1.5 || width < 330) return 1;
  return width >= 760 ? 4 : width >= 540 ? 3 : 2;
}

export type WidgetRect = { x: number; y: number; width: number; height: number };

export function widgetDropTarget(widgets: DashboardWidget[], rects: Map<string, WidgetRect>, id: string, x: number, y: number): string | null {
  // Only current instances are targets; removed widgets can still have stale measurements.
  return widgets.find((widget) => {
    const rect = rects.get(widget.id);
    if (!rect || widget.id === id) return false;
    // Crossing a card edge should not shuffle the board. Enter its interior first.
    const insetX = Math.min(32, rect.width * 0.18);
    const insetY = Math.min(32, rect.height * 0.18);
    return x >= rect.x + insetX && x <= rect.x + rect.width - insetX
      && y >= rect.y + insetY && y <= rect.y + rect.height - insetY;
  })?.id ?? null;
}

export function dashboardStorageKey(userId: string): string {
  return `mt-dashboard-v1:${userId}`;
}
