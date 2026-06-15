import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  checkMedicationInteractions,
  type InteractionCheckResult,
} from '../../lib/drugInteractions';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useRouter } from 'expo-router';
import { routes } from '../../lib/routes';

function makeStyles(colors: ColorPalette) {
  return {
    banner: {
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      gap: 6,
    },
    warning: {
      backgroundColor: colors.partialBg,
      borderColor: colors.partialBorder,
    },
    error: {
      backgroundColor: colors.errorBg,
      borderColor: colors.errorBorder,
    },
    title: {
      fontWeight: '900' as const,
      color: colors.text,
    },
    body: {
      color: colors.text,
    },
    link: {
      color: colors.accent,
      fontWeight: '800' as const,
    },
  };
}

export function InteractionAlert({ medicationNames }: { medicationNames: string[] }) {
  const shouldCheck = medicationNames.length >= 2;
  const [result, setResult] = useState<InteractionCheckResult | null>(null);
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (!shouldCheck) return;
    let active = true;

    checkMedicationInteractions(medicationNames)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setResult(null);
      });

    return () => {
      active = false;
    };
  }, [medicationNames, shouldCheck]);

  if (!shouldCheck || !result || result.interactions.length === 0) return null;

  const major = result.interactions.filter((i) => i.severity === 'major').length;
  const top = result.interactions[0];

  return (
    <Pressable
      onPress={() => router.push(routes.interactions)}
      style={[
        styles.banner,
        major > 0 ? styles.error : styles.warning,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Review interaction safety check"
    >
      <Text style={styles.title}>
        {result.interactions.length} potential interaction
        {result.interactions.length === 1 ? '' : 's'}
      </Text>
      {top ? (
        <Text style={styles.body}>
          e.g. {top.displayA} + {top.displayB} ({top.severity})
        </Text>
      ) : null}
      <Text style={styles.link}>Review safety check</Text>
    </Pressable>
  );
}
