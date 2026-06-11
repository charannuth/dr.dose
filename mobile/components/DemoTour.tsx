import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  DEMO_TOUR_STEPS,
  setDemoTourDone,
  type DemoTourPlacement,
  type DemoTourStep,
} from '../lib/demoTour';
import type { ColorPalette } from '../constants/theme';
import { radii, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeProvider';
import { useDemoTourTargets, type TourRect } from '../context/DemoTourTargetsContext';
import { DemoTourArrow } from './DemoTourArrow';

type DemoTourProps = {
  active: boolean;
  userId: string;
  onComplete: () => void;
};

const TOOLTIP_GAP = 14;
const VIEWPORT_PAD = 12;
const SPOTLIGHT_PAD = 6;

function tooltipPosition(
  target: TourRect,
  placement: DemoTourPlacement,
  tooltipWidth: number,
  tooltipHeight: number,
): { top: number; left: number } {
  const { width: vw, height: vh } = Dimensions.get('window');

  let top: number;
  let left: number;

  switch (placement) {
    case 'top':
      top = target.top - tooltipHeight - TOOLTIP_GAP;
      left = target.left + target.width / 2 - tooltipWidth / 2;
      break;
    case 'left':
      top = target.top + target.height / 2 - tooltipHeight / 2;
      left = target.left - tooltipWidth - TOOLTIP_GAP;
      break;
    case 'right':
      top = target.top + target.height / 2 - tooltipHeight / 2;
      left = target.left + target.width + TOOLTIP_GAP;
      break;
    case 'bottom':
    default:
      top = target.top + target.height + TOOLTIP_GAP;
      left = target.left + target.width / 2 - tooltipWidth / 2;
      break;
  }

  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tooltipWidth - VIEWPORT_PAD));
  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - tooltipHeight - VIEWPORT_PAD));
  return { top, left };
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
    },
    scrimBlock: {
      position: 'absolute',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
    },
    spotlightRing: {
      position: 'absolute',
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: 'transparent',
    },
    tooltip: {
      position: 'absolute',
      maxWidth: 320,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    stepLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    ghostBtn: {
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
    },
    ghostText: {
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 15,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
    },
    primaryText: {
      color: colors.onAccent,
      fontWeight: '900',
      fontSize: 15,
    },
  });
}

function arrowStyle(placement: DemoTourPlacement) {
  switch (placement) {
    case 'top':
      return { position: 'absolute' as const, bottom: -72, left: 28 };
    case 'left':
      return { position: 'absolute' as const, right: -56, top: 20 };
    case 'right':
      return { position: 'absolute' as const, left: -56, top: 20 };
    case 'bottom':
    default:
      return { position: 'absolute' as const, top: -72, left: 28 };
  }
}

export function DemoTour({ active, userId, onComplete }: DemoTourProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { measureTarget, scrollToTarget } = useDemoTourTargets();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TourRect | null>(null);
  const [tooltipBox, setTooltipBox] = useState({ width: 300, height: 160 });

  const step: DemoTourStep | undefined = DEMO_TOUR_STEPS[stepIndex];
  const total = DEMO_TOUR_STEPS.length;
  const windowSize = Dimensions.get('window');

  const finish = useCallback(() => {
    void setDemoTourDone(userId);
    setStepIndex(0);
    setTargetRect(null);
    onComplete();
  }, [userId, onComplete]);

  const refreshTarget = useCallback(async () => {
    if (!active || !step) return;
    scrollToTarget(step.target);
    await new Promise((r) => setTimeout(r, 350));
    const rect = await measureTarget(step.target);
    setTargetRect(rect);
  }, [active, step, scrollToTarget, measureTarget]);

  useEffect(() => {
    if (!active) {
      setTargetRect(null);
      return;
    }
    void refreshTarget();
  }, [active, stepIndex, refreshTarget]);

  function handleNext() {
    if (!step) return;
    if (stepIndex >= total - 1) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function onTooltipLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (
      Math.abs(width - tooltipBox.width) > 2 ||
      Math.abs(height - tooltipBox.height) > 2
    ) {
      setTooltipBox({ width, height });
    }
  }

  if (!active || !step) return null;

  const hole = targetRect
    ? {
        top: targetRect.top - SPOTLIGHT_PAD,
        left: targetRect.left - SPOTLIGHT_PAD,
        width: targetRect.width + SPOTLIGHT_PAD * 2,
        height: targetRect.height + SPOTLIGHT_PAD * 2,
      }
    : null;

  const tooltipPos = targetRect
    ? tooltipPosition(targetRect, step.placement, tooltipBox.width, tooltipBox.height)
    : {
        top: windowSize.height / 2 - tooltipBox.height / 2,
        left: windowSize.width / 2 - tooltipBox.width / 2,
      };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finish}>
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        {hole ? (
          <>
            <Pressable
              style={[styles.scrimBlock, { top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }]}
              onPress={finish}
              accessibilityLabel="Skip tour"
            />
            <Pressable
              style={[
                styles.scrimBlock,
                {
                  top: hole.top,
                  left: 0,
                  width: Math.max(0, hole.left),
                  height: hole.height,
                },
              ]}
              onPress={finish}
            />
            <Pressable
              style={[
                styles.scrimBlock,
                {
                  top: hole.top,
                  left: hole.left + hole.width,
                  right: 0,
                  height: hole.height,
                },
              ]}
              onPress={finish}
            />
            <Pressable
              style={[
                styles.scrimBlock,
                {
                  top: hole.top + hole.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
              onPress={finish}
            />
            <View
              style={[
                styles.spotlightRing,
                {
                  top: hole.top,
                  left: hole.left,
                  width: hole.width,
                  height: hole.height,
                },
              ]}
              pointerEvents="none"
            />
          </>
        ) : (
          <Pressable style={styles.scrim} onPress={finish} accessibilityLabel="Skip tour" />
        )}

        <View
          style={[styles.tooltip, { top: tooltipPos.top, left: tooltipPos.left }]}
          onLayout={onTooltipLayout}
        >
          <DemoTourArrow
            variant={step.arrow}
            color={colors.accent}
            style={arrowStyle(step.placement)}
          />
          <Text style={styles.stepLabel}>
            Step {stepIndex + 1} of {total}
          </Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.ghostBtn} onPress={finish}>
              <Text style={styles.ghostText}>Skip tour</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={handleNext}>
              <Text style={styles.primaryText}>
                {stepIndex >= total - 1 ? 'Get started' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
