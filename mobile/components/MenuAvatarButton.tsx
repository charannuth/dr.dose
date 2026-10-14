import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { User } from '@supabase/supabase-js';
import { useTheme } from '../context/ThemeProvider';
import { spacing } from '../constants/theme';
import { tapFeedback } from '../lib/haptics';
import { ProfileAvatar } from './ProfileAvatar';

const BADGE = 17;

/**
 * Header button that opens the side menu. The photo says "you", and the small
 * three-line badge says "menu", so it reads as both at a glance.
 */
export function MenuAvatarButton({ user, onPress }: { user: User | null; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View>
        <ProfileAvatar user={user} size="sm" />
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Svg width={10} height={10} viewBox="0 0 10 10">
            <Path
              d="M1.5 2.5h7M1.5 5h7M1.5 7.5h4.5"
              stroke={colors.text}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -3,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
