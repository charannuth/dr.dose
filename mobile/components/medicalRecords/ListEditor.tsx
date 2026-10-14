import { Pressable, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { fonts, radii, spacing, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTrackingStyles } from '../tracking/trackingStyles';

export type ListField<T> = {
  key: keyof T & string;
  placeholder: string;
  /** Relative width in the row. */
  flex?: number;
  keyboardType?: KeyboardTypeOptions;
  /** Show as choice chips under the row instead of a text box. */
  options?: string[];
};

/** Small repeatable-row editor (surgeries, vaccines, care team, family history). */
export function ListEditor<T extends Record<string, string | undefined>>({
  label,
  hint,
  items,
  fields,
  onChange,
  addLabel,
  blank,
}: {
  label: string;
  hint?: string;
  items: T[];
  fields: ListField<T>[];
  onChange: (next: T[]) => void;
  addLabel: string;
  blank: T;
}) {
  const ts = useTrackingStyles();
  const s = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const textFields = fields.filter((f) => !f.options);
  const choiceFields = fields.filter((f) => f.options);

  function patch(index: number, key: keyof T, value: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value || undefined } : item)));
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={ts.label}>{label}</Text>
      {hint ? <Text style={ts.hint}>{hint}</Text> : null}
      {items.map((item, index) => (
        <View key={index} style={s.row}>
          <View style={s.fields}>
            {textFields.map((f) => (
              <TextInput
                key={f.key}
                style={[ts.input, { flex: f.flex ?? 1, marginBottom: 0 }]}
                value={item[f.key] ?? ''}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={f.keyboardType}
                onChangeText={(v) => patch(index, f.key, v)}
                accessibilityLabel={`${label} ${index + 1}: ${f.placeholder}`}
              />
            ))}
            <Pressable onPress={() => onChange(items.filter((_, i) => i !== index))} style={s.remove} accessibilityRole="button" accessibilityLabel={`Remove ${label} ${index + 1}`} hitSlop={6}>
              <Text style={s.removeText}>×</Text>
            </Pressable>
          </View>
          {choiceFields.map((f) => (
            <View key={f.key} style={s.chips}>
              {f.options!.map((opt) => {
                const on = item[f.key] === opt;
                return (
                  <Pressable key={opt} onPress={() => patch(index, f.key, on ? '' : opt)} style={[s.chip, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[s.chipText, on && s.chipTextOn]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ))}
      <Pressable onPress={() => onChange([...items, { ...blank }])} style={s.add} accessibilityRole="button">
        <Text style={s.addText}>+ {addLabel}</Text>
      </Pressable>
    </View>
  );
}

/** Single-choice chips (severity, status). */
export function ChoiceChips<V extends string>({
  options,
  value,
  onChange,
  tone,
}: {
  options: { id: V; label: string }[];
  value: V | undefined;
  onChange: (next: V | undefined) => void;
  tone?: (id: V) => string | undefined;
}) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const on = value === o.id;
        const color = tone?.(o.id);
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(on ? undefined : o.id)}
            style={[s.chip, on && s.chipOn, on && color ? { backgroundColor: color, borderColor: color } : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[s.chipText, on && s.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return {
    row: { gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: c.border },
    fields: { flexDirection: 'row' as const, gap: 8, alignItems: 'center' as const },
    remove: { width: 32, height: 32, alignItems: 'center' as const, justifyContent: 'center' as const },
    removeText: { fontSize: 22, color: c.textMuted },
    chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg },
    chipOn: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: c.text },
    chipTextOn: { color: c.onAccent },
    add: { alignSelf: 'flex-start' as const, minHeight: 40, justifyContent: 'center' as const, paddingHorizontal: spacing.sm, borderRadius: radii.md },
    addText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.accent },
  };
}
