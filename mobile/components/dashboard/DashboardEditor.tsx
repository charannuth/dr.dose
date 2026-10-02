import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { moveWidget, WIDGET_CATALOG, type DashboardLayout, type WidgetKind, type WidgetSize } from '../../lib/dashboardLayout';
import { newId } from '../../lib/uuid';
import { WidgetSizePicker } from './WidgetSizePicker';

type Props = {
  value: DashboardLayout;
  onChange: (value: DashboardLayout) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  dragging: boolean;
  error: string | null;
  preview: ReactNode;
  selectedId: string | null;
};

export function DashboardEditor({ value, onChange, onSave, onCancel, saving, dragging, error, preview, selectedId }: Props) {
  const s = useThemedStyles(makeStyles);
  const [showPreview, setShowPreview] = useState(true);
  const selected = value.widgets.find((widget) => widget.id === selectedId) ?? value.widgets[0];
  const selectedTitle = WIDGET_CATALOG.find((item) => item.kind === selected?.kind)?.title ?? '';
  const button = (label: string, action: () => void, selected = false, disabled = false, accessibilityLabel = label) => (
    <Pressable onPress={action} disabled={saving || dragging || disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled: saving || dragging || disabled }} style={[s.button, selected && s.selected, (saving || dragging || disabled) && { opacity: 0.4 }]}>
      <Text style={[s.buttonText, selected && s.selectedText]}>{label}</Text>
    </Pressable>
  );
  function add(kind: WidgetKind, size: WidgetSize) {
    onChange({ ...value, widgets: [...value.widgets, { id: newId(), kind, size }] });
  }
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!saving && !dragging) onCancel(); }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.headerAction} onPress={onCancel} disabled={saving || dragging} accessibilityRole="button"><Text style={s.headerActionText}>Cancel</Text></Pressable>
          <Text style={s.title}>Edit Quick view</Text>
          <Pressable style={s.headerAction} onPress={onSave} disabled={saving || dragging} accessibilityRole="button"><Text style={s.headerActionText}>{saving ? 'Saving…' : 'Save'}</Text></Pressable>
        </View>
        {selected ? <View style={s.inspector}>
          <View style={s.inspectorTitle}>
            <Text style={[s.widgetTitle, { flex: 1 }]}>{selectedTitle}</Text>
            <Pressable style={s.headerAction} disabled={saving || dragging} accessibilityRole="button" accessibilityLabel={`Remove ${selectedTitle}`}
              onPress={() => onChange({ ...value, widgets: value.widgets.filter((widget) => widget.id !== selected.id) })}><Text style={s.removeText}>Remove</Text></Pressable>
          </View>
          <WidgetSizePicker title={selectedTitle} value={selected.size} disabled={saving || dragging}
            onChange={(size) => onChange({ ...value, widgets: value.widgets.map((widget) => widget.id === selected.id ? { ...widget, size } : widget) })} />
        </View> : null}
        <ScrollView scrollEnabled={!dragging} contentContainerStyle={s.content}>
          <Text style={s.description}>Make room for what matters to you. Choose widgets, change their size, and arrange them in your preferred order.</Text>
          <Text style={s.label}>Layout</Text>
          <View style={s.row}>
            {button('Adaptive grid', () => onChange({ ...value, mode: 'adaptive' }), value.mode === 'adaptive')}
            {button('Single column', () => onChange({ ...value, mode: 'list' }), value.mode === 'list')}
          </View>
          <Text style={s.hint}>Tap a widget to select it, then choose Compact or Detailed above. Hold and drag to rearrange.</Text>
          {button(showPreview ? 'Hide preview' : 'Preview layout', () => setShowPreview((v) => !v))}
          {showPreview ? preview : null}
          {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
          <Text style={s.label}>Your widgets · {value.widgets.length}</Text>
          {!value.widgets.length ? <Text style={s.hint}>Your dashboard is empty. Add widgets from the gallery below.</Text> : null}
          {value.widgets.map((widget, index) => {
            const item = WIDGET_CATALOG.find((entry) => entry.kind === widget.kind)!;
            return (
              <View key={widget.id} style={s.card}>
                <Text style={s.widgetTitle}>{index + 1}. {item.title}</Text>
                <WidgetSizePicker title={item.title} value={widget.size} disabled={saving || dragging}
                  onChange={(size) => onChange({ ...value, widgets: value.widgets.map((w) => w.id === widget.id ? { ...w, size } : w) })} />
                <View style={s.row}>
                  {button('↑', () => onChange({ ...value, widgets: moveWidget(value.widgets, widget.id, -1) }), false, index === 0, `Move ${item.title} earlier`)}
                  {button('↓', () => onChange({ ...value, widgets: moveWidget(value.widgets, widget.id, 1) }), false, index === value.widgets.length - 1, `Move ${item.title} later`)}
                  {button('Remove', () => onChange({ ...value, widgets: value.widgets.filter((w) => w.id !== widget.id) }), false, false, `Remove ${item.title} widget ${index + 1}`)}
                </View>
              </View>
            );
          })}
          <Text style={s.label}>Widget gallery</Text>
          <Text style={s.hint}>Add as many as you like. You can add the same feature in more than one size.</Text>
          {[...new Set(WIDGET_CATALOG.map((item) => item.group))].map((group) => (
            <View key={group} style={s.group}>
              <Text style={s.groupTitle}>{group}</Text>
              {WIDGET_CATALOG.filter((item) => item.group === group).map((item) => (
                <View key={item.kind} style={s.card}>
                  <Text style={s.widgetTitle}>{item.symbol}  {item.title}</Text>
                  <Text style={s.description}>{item.description}</Text>
                  <View style={s.row}>
                    {button('+ Compact', () => add(item.kind, 'small'), false, false, `Add ${item.title} square widget`)}
                    {button('+ Detailed', () => add(item.kind, 'wide'), false, false, `Add ${item.title} expanded widget`)}
                  </View>
                </View>
              ))}
            </View>
          ))}
          <Text style={s.hint}>Your layout is saved for this account on this device.</Text>
        </ScrollView>
      </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: c.bg }, header: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, padding: 12, gap: 8, borderBottomWidth: 1, borderColor: c.border },
    title: { flex: 1, minWidth: 100, fontFamily: fonts.heading, fontSize: 17, color: c.text },
    headerAction: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' as const },
    headerActionText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.accent },
    inspector: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    inspectorTitle: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
    removeText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: c.textMuted },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    description: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 21, color: c.textMuted },
    hint: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 18, color: c.textMuted },
    label: { fontFamily: fonts.heading, fontSize: 20, color: c.text, marginTop: 8 },
    row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    button: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, alignItems: 'center' as const, justifyContent: 'center' as const },
    selected: { borderColor: c.accent, backgroundColor: c.accentPurpleBg },
    buttonText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.text }, selectedText: { color: c.accent },
    card: { padding: 16, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 12 },
    widgetTitle: { fontFamily: fonts.heading, fontSize: 16, color: c.text },
    error: { color: c.error, fontSize: 14, lineHeight: 20 }, group: { gap: 10 }, groupTitle: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.accent },
  };
}
