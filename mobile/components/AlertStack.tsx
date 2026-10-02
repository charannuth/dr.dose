import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import type { ColorPalette } from '../constants/theme';
import { fonts, spacing } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { PressableScale } from './PressableScale';
import { tapFeedback } from '../lib/haptics';

function makeStyles(colors: ColorPalette) {
  return {
    wrap: { gap: spacing.sm },
    toggle: {
      alignSelf: 'flex-start' as const,
      paddingVertical: 6,
      paddingHorizontal: 2,
    },
    toggleText: {
      fontFamily: fonts.bodySemibold,
      fontSize: 13,
      color: colors.textMuted,
    },
  };
}

export type AlertItem = { key: string; node: ReactNode };

/**
 * Shows the highest-priority alert and tucks the rest behind a toggle, so a bad
 * day can't push the actual medication list off the bottom of the screen.
 */
export function AlertStack({ items }: { items: AlertItem[] }) {
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, 1);
  const hidden = items.length - 1;

  return (
    <Animated.View layout={LinearTransition.springify().damping(22)} style={styles.wrap}>
      {visible.map((item) => (
        <Animated.View key={item.key} entering={FadeIn.duration(200)}>
          {item.node}
        </Animated.View>
      ))}
      {hidden > 0 ? (
        <PressableScale
          style={styles.toggle}
          scaleTo={0.97}
          onPress={() => {
            tapFeedback();
            setExpanded((v) => !v);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.toggleText}>
            {expanded ? 'Show less' : `${hidden} more alert${hidden === 1 ? '' : 's'}`}
          </Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}
