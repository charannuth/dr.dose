import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadWidgetSummary, REMOTE_WIDGETS } from '../lib/dashboardSummaries';
import type { DashboardWidget, WidgetKind, WidgetSummary } from '../lib/dashboardLayout';

export function useDashboardSummaries(userId: string | undefined, widgets: DashboardWidget[], today: string, refreshKey: number) {
  const signature = [...new Set(widgets.map((widget) => widget.kind).filter((kind) => REMOTE_WIDGETS.includes(kind)))].sort().join(',');
  const [snapshot, setSnapshot] = useState<{ owner: string; data: Partial<Record<WidgetKind, WidgetSummary>> }>({ owner: '', data: {} });
  const owner = `${userId}:${today}`;
  useFocusEffect(useCallback(() => {
    let active = true;
    // Keep current values while refreshing, so cards do not flash or resize.
    setSnapshot((current) => current.owner === owner ? current : { owner, data: {} });
    if (userId && signature) {
      void Promise.all(signature.split(',').map(async (value) => {
        const kind = value as WidgetKind;
        let summary: WidgetSummary;
        try { summary = await loadWidgetSummary(kind, userId, today); }
        catch { summary = { value: 'Unavailable', subtitle: 'Pull down to try again', details: ['This summary could not load. You can still open the feature.'] }; }
        if (active) setSnapshot((current) => ({ owner, data: { ...current.data, [kind]: summary } }));
      }));
    }
    return () => { active = false; };
  }, [userId, signature, today, owner, refreshKey]));
  return snapshot.owner === owner ? snapshot.data : {};
}
