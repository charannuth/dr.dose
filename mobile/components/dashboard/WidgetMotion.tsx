import type { ReactNode } from 'react';
import type { LayoutRectangle, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, LinearTransition, runOnJS, useAnimatedStyle, useSharedValue, withTiming, useReducedMotion } from 'react-native-reanimated';

type Props = {
  id: string;
  editable: boolean;
  active: boolean;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
  onLayout: (id: string, rect: LayoutRectangle) => void;
  onStart: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onEnd: () => void;
};

const SETTLE = { duration: 160, easing: Easing.out(Easing.cubic) };
const REFLOW = LinearTransition.duration(180).easing(Easing.out(Easing.cubic));

/** Finger tracking stays on the UI thread; only reorder decisions cross to JS. */
export function WidgetMotion({ id, editable, active, style, children, onLayout, onStart, onMove, onEnd }: Props) {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const dragging = useSharedValue(false);
  const lastTick = useSharedValue(0);
  const gesture = Gesture.Pan().enabled(editable).activateAfterLongPress(220)
    .onStart(() => {
      startX.value = x.value; startY.value = y.value;
      dx.value = 0; dy.value = 0; dragging.value = true;
      runOnJS(onStart)(id);
    })
    .onUpdate((event) => {
      dx.value = event.translationX; dy.value = event.translationY;
      const now = Date.now();
      if (now - lastTick.value > 70) {
        lastTick.value = now;
        runOnJS(onMove)(id, startX.value + width.value / 2 + event.translationX, startY.value + height.value / 2 + event.translationY);
      }
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      // Keep the current visual offset when switching from drag to settle.
      const offsetX = dx.value + startX.value - x.value;
      const offsetY = dy.value + startY.value - y.value;
      dragging.value = false;
      dx.value = offsetX;
      dy.value = offsetY;
      dx.value = reducedMotion ? 0 : withTiming(0, SETTLE);
      dy.value = reducedMotion ? 0 : withTiming(0, SETTLE);
      runOnJS(onEnd)();
    });
  const motion = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragging.value ? dx.value + startX.value - x.value : dx.value },
      { translateY: dragging.value ? dy.value + startY.value - y.value : dy.value },
    ],
  }));
  return (
    <Animated.View
      layout={!active && !reducedMotion ? REFLOW : undefined}
      style={[style, { zIndex: active ? 20 : 0 }]}
      onLayout={(event) => {
        const rect = event.nativeEvent.layout;
        x.value = rect.x; y.value = rect.y; width.value = rect.width; height.value = rect.height;
        onLayout(id, rect);
      }}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ flex: 1 }, motion]}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
