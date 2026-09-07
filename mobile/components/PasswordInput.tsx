import { useId, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Mask, Path, Rect } from 'react-native-svg';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  containerStyle?: StyleProp<ViewStyle>;
  /** Colour of the eye glyph; defaults to a muted slate. */
  iconColor?: string;
};

/** Solid opaque eye — shown while the password is visible. */
function EyeOpenIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 5C7.05 5 2.73 8.11 1 12c1.73 3.89 6.05 7 11 7s9.27-3.11 11-7c-1.73-3.89-6.05-7-11-7Zm0 9.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
      />
    </Svg>
  );
}

/**
 * Solid eye with slash — default while the password is censored. The pupil and
 * the gap around the slash are masked out rather than painted, so the input
 * background shows through and the icon works in both themes.
 */
function EyeSlashIcon({ color }: { color: string }) {
  const maskId = `eye-slash-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <Rect width="24" height="24" fill="#fff" />
        <Circle cx="12" cy="12" r="2.9" fill="#000" />
        <Line
          x1="20.5"
          y1="3.5"
          x2="3.5"
          y2="20.5"
          stroke="#000"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </Mask>
      <Path
        d="M12 5C7.05 5 2.73 8.11 1 12c1.73 3.89 6.05 7 11 7s9.27-3.11 11-7c-1.73-3.89-6.05-7-11-7Z"
        fill={color}
        mask={`url(#${maskId})`}
      />
      <Line
        x1="20.5"
        y1="3.5"
        x2="3.5"
        y2="20.5"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Outer-box styles belong on the wrapper so the absolutely positioned toggle
 * stays centred on the field itself rather than on the field plus its margins.
 */
const WRAPPER_STYLE_KEYS = [
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'alignSelf',
  'flex',
  'width',
] as const;

function splitStyle(style: StyleProp<TextStyle>): {
  wrapper: ViewStyle;
  field: TextStyle;
} {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const wrapper: Record<string, unknown> = {};
  const field: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if ((WRAPPER_STYLE_KEYS as readonly string[]).includes(key)) wrapper[key] = value;
    else field[key] = value;
  }
  return { wrapper: wrapper as ViewStyle, field: field as TextStyle };
}

export function PasswordInput({
  containerStyle,
  iconColor = '#94a3b8',
  style,
  ...props
}: Props) {
  const [visible, setVisible] = useState(false);
  const { wrapper, field } = splitStyle(style);

  return (
    <View style={[styles.wrapper, wrapper, containerStyle]}>
      <TextInput
        {...props}
        style={[field, styles.field]}
        secureTextEntry={!visible}
        autoCorrect={false}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        accessibilityState={{ selected: visible }}
        hitSlop={8}
        style={styles.toggle}
      >
        {visible ? <EyeOpenIcon color={iconColor} /> : <EyeSlashIcon color={iconColor} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  field: {
    paddingRight: 44,
  },
  toggle: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
