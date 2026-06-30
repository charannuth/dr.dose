import { useEffect, useRef, type ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  /** Active tab index. */
  index: number;
  /** Total number of tabs. */
  count: number;
  /** Called with the next index when the user swipes left/right. */
  onIndexChange: (index: number) => void;
  /** Content for the currently active tab. */
  children: ReactNode;
};

const SWIPE_THRESHOLD = 48;

/**
 * Wraps the active tab's content and gives it two things:
 *  1. A quick directional slide+fade whenever `index` changes (tap or swipe).
 *  2. A horizontal pan gesture that switches tabs when the user swipes far
 *     enough. The gesture is biased horizontally so it never steals vertical
 *     scrolling from a parent ScrollView.
 */
export function SwipeTabView({ index, count, onIndexChange, children }: Props) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const prevIndex = useRef(index);

  useEffect(() => {
    const direction = index > prevIndex.current ? 1 : index < prevIndex.current ? -1 : 0;
    prevIndex.current = index;
    if (direction === 0) return;
    // Enter from the side the user is heading toward, then settle to center.
    translateX.value = direction * 44;
    opacity.value = 0.35;
    translateX.value = withTiming(0, { duration: 220 });
    opacity.value = withTiming(1, { duration: 220 });
  }, [index, opacity, translateX]);

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onEnd((event) => {
      'worklet';
      if (event.translationX <= -SWIPE_THRESHOLD && index < count - 1) {
        runOnJS(onIndexChange)(index + 1);
      } else if (event.translationX >= SWIPE_THRESHOLD && index > 0) {
        runOnJS(onIndexChange)(index - 1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
