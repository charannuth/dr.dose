import type { ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, spacing, withAlpha, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { tapFeedback } from '../../lib/haptics';
import { DrawerIcon, type DrawerIconName } from '../navigation/DrawerIcon';

/** A titled card of rows with hairline dividers, like iOS Settings. */
export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const s = useThemedStyles(makeStyles);
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={s.groupTitle}>{title}</Text> : null}
      <View style={s.group}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={s.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={s.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

export function SettingsRow({
  icon,
  tint,
  title,
  value,
  onPress,
  right,
  destructive,
  chevron = true,
}: {
  icon?: DrawerIconName;
  tint?: string;
  title: string;
  value?: string | null;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  chevron?: boolean;
}) {
  const s = useThemedStyles(makeStyles);
  const { colors, isDark } = useTheme();
  const color = destructive ? colors.error : tint ?? colors.accent;
  const body = (
    <>
      {icon ? (
        <View style={[s.iconTile, { backgroundColor: withAlpha(color, isDark ? 0.2 : 0.13) }]}>
          <DrawerIcon name={icon} color={color} size={17} />
        </View>
      ) : null}
      <Text style={[s.rowTitle, destructive && { color: colors.error }]} numberOfLines={1}>{title}</Text>
      {value ? <Text style={s.rowValue} numberOfLines={1}>{value}</Text> : null}
      {right}
      {onPress && chevron && !right ? <DrawerIcon name="chevron" color={withAlpha(colors.textMuted, 0.7)} size={16} /> : null}
    </>
  );
  if (!onPress) return <View style={s.row}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: withAlpha(colors.text, 0.05) }]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
    >
      {body}
    </Pressable>
  );
}

/** Small inline segmented control for 2–4 short options. */
export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => { tapFeedback(); onChange(o.value); }} style={[s.segment, on && s.segmentOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Text style={[s.segmentText, on && s.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Page sheet for a setting's details, so the main page stays a clean list. */
export function SettingsSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.sheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <Text style={s.done}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[s.sheetContent, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    groupTitle: { fontFamily: fonts.bodySemibold, fontSize: 13, letterSpacing: 0.4, color: c.textMuted, paddingHorizontal: 4, textTransform: 'uppercase' as const },
    groupFooter: { fontFamily: fonts.bodyRegular, fontSize: 12, lineHeight: 17, color: c.textMuted, paddingHorizontal: 4 },
    group: { backgroundColor: c.surface, borderRadius: radii.lg, overflow: 'hidden' as const },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 58 },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 54, paddingHorizontal: 14, paddingVertical: 10 },
    iconTile: { width: 32, height: 32, borderRadius: 9, alignItems: 'center' as const, justifyContent: 'center' as const },
    rowTitle: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: c.text },
    rowValue: { fontFamily: fonts.bodyRegular, fontSize: 15, color: c.textMuted, maxWidth: '45%' as const },
    segmented: { flexDirection: 'row' as const, backgroundColor: c.bg, borderRadius: 9, padding: 2 },
    segment: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 },
    segmentOn: { backgroundColor: c.accent },
    segmentText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: c.textMuted },
    segmentTextOn: { color: c.onAccent },
    sheet: { flex: 1, backgroundColor: c.bg },
    sheetHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
    sheetTitle: { flex: 1, fontFamily: fonts.heading, fontSize: 22, color: c.text },
    done: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.accent },
    sheetContent: { padding: spacing.lg, gap: 14 },
  };
}
