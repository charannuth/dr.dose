import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tapFeedback } from '../lib/haptics';

// Tuned to settle in ~150ms so the surface feels rigid rather than rubbery.
const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.5 };

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Depth of the sink on press. Small controls need less travel to read. */
  scaleTo?: number;
  /** Light tick on press down. Reserve for primary actions. */
  haptic?: boolean;
};

/**
 * Pressable that springs inward on touch. The visual style lands on an inner
 * Animated.View so the touch target keeps matching the rendered surface.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  haptic = false,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, PRESS_SPRING);
        if (haptic) tapFeedback();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, PRESS_SPRING);
        onPressOut?.(event);
      }}
      {...rest}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
