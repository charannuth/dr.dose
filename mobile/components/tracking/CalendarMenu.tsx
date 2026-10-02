import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';

/** Shared, scrollable calendar picker; works with any number of future trackers. */
export function CalendarMenu({ title, value, options, onChange }: {
  title: string; value: string; options: { value: string; label: string; disabled?: boolean }[]; onChange: (value: string) => void;
}) {
  const s = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  return <>
    <Pressable style={s.trigger} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${title}: ${options.find((o) => o.value === value)?.label ?? 'Choose'}`} accessibilityState={{ expanded: open }}>
      <Text style={s.triggerText}>{options.find((o) => o.value === value)?.label ?? title} ⌄</Text>
    </Pressable>
    <Modal visible={open} presentationStyle="pageSheet" animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Text style={s.title}>{title}</Text><Pressable style={s.done} onPress={() => setOpen(false)} accessibilityRole="button"><Text style={s.triggerText}>Done</Text></Pressable></View>
        <ScrollView contentContainerStyle={s.content}>{options.map((option) => <Pressable key={option.value} disabled={option.disabled} style={[s.option, option.disabled && { opacity: 0.5 }]}
          accessibilityRole="button" accessibilityState={{ selected: value === option.value, disabled: !!option.disabled }}
          onPress={() => { onChange(option.value); setOpen(false); }}>
          <Text style={s.label}>{option.label}</Text>{option.value === value ? <Text style={s.triggerText}>✓</Text> : null}
        </Pressable>)}</ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}
function makeStyles(c: ColorPalette) {
  return {
    trigger: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' as const, borderRadius: 24, backgroundColor: c.surface, flexShrink: 1 },
    triggerText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.accent },
    safe: { flex: 1, backgroundColor: c.bg }, header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
    title: { flex: 1, fontFamily: fonts.heading, fontSize: 20, color: c.text }, done: { minHeight: 44, minWidth: 44, justifyContent: 'center' as const },
    content: { padding: 20 }, option: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 56, paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border },
    label: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 16, color: c.text },
  };
}
