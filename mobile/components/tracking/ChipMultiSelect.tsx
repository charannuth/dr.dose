import { Text, View, Pressable } from 'react-native';
import { useTrackingStyles } from './trackingStyles';

type Props = {
  title: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Trailing "+" chip that opens the add-symptoms popup. */
  onAddPress?: () => void;
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function ChipMultiSelect({
  title,
  options,
  selected,
  onChange,
  disabled,
  onAddPress,
}: Props) {
  const trackingStyles = useTrackingStyles();
  return (
    <View style={disabled ? trackingStyles.disabled : undefined}>
      <Text style={trackingStyles.label}>{title}</Text>
      <View style={trackingStyles.chipWrap}>
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <Pressable
              key={opt}
              disabled={disabled}
              onPress={() => onChange(toggle(selected, opt))}
              style={[trackingStyles.chip, active && trackingStyles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[trackingStyles.chipText, active && trackingStyles.chipTextActive]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
        {onAddPress ? (
          <Pressable
            onPress={onAddPress}
            style={trackingStyles.chip}
            accessibilityRole="button"
            accessibilityLabel={`Add custom ${title.toLowerCase()}`}
          >
            <Text style={[trackingStyles.chipText, { fontWeight: '700' }]}>+</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
