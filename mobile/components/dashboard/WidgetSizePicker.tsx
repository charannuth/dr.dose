import { Pressable, Text, View } from 'react-native';
import { fonts, type ColorPalette } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { WidgetSize } from '../../lib/dashboardLayout';

/** Explicit sizes avoid a toggle whose label keeps changing beneath the finger. */
export function WidgetSizePicker({ value, onChange, disabled = false, title }: {
  value: WidgetSize;
  onChange: (size: WidgetSize) => void;
  disabled?: boolean;
  title: string;
}) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.group}>
      {(['small', 'wide'] as const).map((size) => (
        <Pressable key={size} onPress={() => onChange(size)} disabled={disabled}
          accessibilityRole="button" accessibilityLabel={`${title}: ${size === 'small' ? 'compact square' : 'detailed rectangle'}`}
          accessibilityState={{ selected: value === size, disabled }}
          style={[s.option, value === size && s.selected, disabled && { opacity: 0.5 }]}>
          <View style={[s.shape, size === 'wide' && { width: 19 }, value === size && s.selectedShape]} />
          <Text style={[s.text, value === size && s.selectedText]}>{size === 'small' ? 'Compact' : 'Detailed'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    group: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, padding: 3, gap: 3, borderRadius: 12, backgroundColor: c.bg },
    option: { minHeight: 44, flex: 1, minWidth: 106, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingHorizontal: 10, borderRadius: 9 },
    selected: { backgroundColor: c.surface },
    shape: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5, borderColor: c.textMuted },
    selectedShape: { borderColor: c.text },
    text: { fontFamily: fonts.bodyMedium, fontSize: 13, color: c.textMuted },
    selectedText: { color: c.text, fontFamily: fonts.bodySemibold },
  };
}
