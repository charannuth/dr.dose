import type { ViewStyle } from 'react-native';

/**
 * Widest a screen's content column gets. On iPhone this never applies; on
 * iPad (and in landscape) it keeps cards and forms at a readable width,
 * centered, instead of stretching edge to edge.
 */
export const READABLE_MAX_WIDTH = 720;

/** Spread into a ScrollView's contentContainerStyle (or a wrapping View). */
export const READABLE_COLUMN: ViewStyle = {
  width: '100%',
  maxWidth: READABLE_MAX_WIDTH,
  alignSelf: 'center',
};
