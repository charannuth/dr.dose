import type { StyleProp, TextStyle } from 'react-native';
import { TextInput } from 'react-native';
import { useTheme } from '../context/ThemeProvider';
import {
  clampIsoDateMax,
  extractDateDigits,
  formatIsoDateMaskFromDigits,
  normalizeIsoDateDisplay,
} from '../lib/isoDateInput';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  style?: StyleProp<TextStyle>;
  placeholder?: string;
  editable?: boolean;
  /** YYYY-MM-DD — dates after this are clamped down (e.g. today for birthdates). */
  maxDate?: string;
};

export function IsoDateInput({
  value,
  onChangeText,
  onBlur,
  style,
  placeholder = 'YYYY-MM-DD',
  editable = true,
  maxDate,
}: Props) {
  const { colors } = useTheme();

  function handleChange(raw: string) {
    const digits = extractDateDigits(raw);
    onChangeText(formatIsoDateMaskFromDigits(digits));
  }

  function handleBlur() {
    if (value.trim()) {
      try {
        let normalized = normalizeIsoDateDisplay(value);
        if (maxDate) normalized = clampIsoDateMax(normalized, maxDate);
        if (normalized !== value) onChangeText(normalized);
      } catch {
        // keep partial until user fixes or submits
      }
    }
    onBlur?.();
  }

  return (
    <TextInput
      style={style}
      value={value}
      onChangeText={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType="number-pad"
      inputMode="numeric"
      autoCapitalize="none"
      autoComplete="birthdate-full"
      editable={editable}
      maxLength={10}
    />
  );
}
