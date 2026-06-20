import { Pressable, Text, TextInput, View } from 'react-native';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  dosageStepHint,
  type DosageWizardValues,
  type InjectionLogStyle,
} from '../../lib/doseByRoute';
import type { MedicationRouteId } from '../../lib/medicationForms';
import type { MedicationScheduleType } from '../../lib/medicationSchedule';

const INJECTION_UNITS = ['units', 'mg', 'mL', 'dose'] as const;

type Props = {
  route: MedicationRouteId | null;
  scheduleType: MedicationScheduleType;
  values: DosageWizardValues;
  onChange: (patch: Partial<DosageWizardValues>) => void;
};

function makeDosagePanelStyles(colors: ColorPalette) {
  return {
    panel: { gap: spacing.sm },
    hint: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.xs },
    label: { fontWeight: '700' as const, color: colors.text, marginTop: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    textarea: { minHeight: 80, textAlignVertical: 'top' as const },
    radioGroup: { gap: spacing.sm },
    radioCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 4,
    },
    radioCardActive: { borderColor: colors.accent, backgroundColor: colors.typeCardActiveBg },
    radioTitle: { fontWeight: '800' as const, color: colors.text },
    radioSub: { color: colors.textMuted, fontSize: 13 },
    chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontWeight: '700' as const, color: colors.textMuted },
    chipTextActive: { color: colors.onAccent },
  };
}

function FieldLabel({ children }: { children: string }) {
  const styles = useThemedStyles(makeDosagePanelStyles);
  return <Text style={styles.label}>{children}</Text>;
}

function TextField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}) {
  const styles = useThemedStyles(makeDosagePanelStyles);
  const { colors } = useTheme();
  return (
    <TextInput
      style={[styles.input, multiline && styles.textarea]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
    />
  );
}

export function DosageStepPanel({ route, scheduleType, values, onChange }: Props) {
  const styles = useThemedStyles(makeDosagePanelStyles);
  const hint = dosageStepHint(route, scheduleType);

  if (scheduleType === 'as_needed') {
    return (
      <View style={styles.panel}>
        <Text style={styles.hint}>{hint}</Text>
        <FieldLabel>Max doses per day (optional)</FieldLabel>
        <TextField
          value={values.maxDosesPerDay}
          onChangeText={(maxDosesPerDay) => onChange({ maxDosesPerDay })}
          placeholder="e.g. 6"
          keyboardType="numeric"
        />
        <FieldLabel>Example amount (optional)</FieldLabel>
        <TextField
          value={values.prnTypicalAmount}
          onChangeText={(prnTypicalAmount) => onChange({ prnTypicalAmount })}
          placeholder="e.g. 2 puffs"
        />
        <FieldLabel>Strength (mg) — optional</FieldLabel>
        <TextField
          value={values.doseMg}
          onChangeText={(doseMg) => onChange({ doseMg })}
          placeholder="e.g. 10 mg"
        />
      </View>
    );
  }

  if (route === 'oral') {
    return (
      <View style={styles.panel}>
        <Text style={styles.hint}>{hint}</Text>
        <FieldLabel>How many per dose? *</FieldLabel>
        <TextField
          value={values.oralCount}
          onChangeText={(oralCount) => onChange({ oralCount })}
          placeholder="e.g. 1"
          keyboardType="decimal-pad"
        />
        <FieldLabel>Strength (mg) — optional</FieldLabel>
        <TextField
          value={values.doseMg}
          onChangeText={(doseMg) => onChange({ doseMg })}
          placeholder="e.g. 500 mg"
        />
      </View>
    );
  }

  if (route === 'dermal') {
    return (
      <View style={styles.panel}>
        <Text style={styles.hint}>{hint}</Text>
        <FieldLabel>How you apply it (optional)</FieldLabel>
        <TextField
          value={values.dermalDescription}
          onChangeText={(dermalDescription) => onChange({ dermalDescription })}
          placeholder="e.g. Thin layer to affected area"
          multiline
        />
        <FieldLabel>Strength (mg) — optional</FieldLabel>
        <TextField value={values.doseMg} onChangeText={(doseMg) => onChange({ doseMg })} />
      </View>
    );
  }

  if (route === 'injection') {
    return (
      <View style={styles.panel}>
        <Text style={styles.hint}>{hint}</Text>
        <View style={styles.radioGroup}>
          {(
            [
              ['simple', 'Injection taken', 'Log yes/no when you inject'],
              ['measured', 'Specific dose', 'Insulin units, mg, mL, etc.'],
            ] as const
          ).map(([style, title, sub]) => (
            <Pressable
              key={style}
              style={[
                styles.radioCard,
                values.injectionStyle === style && styles.radioCardActive,
              ]}
              onPress={() => onChange({ injectionStyle: style as InjectionLogStyle })}
            >
              <Text style={styles.radioTitle}>{title}</Text>
              <Text style={styles.radioSub}>{sub}</Text>
            </Pressable>
          ))}
        </View>
        {values.injectionStyle === 'measured' ? (
          <>
            <FieldLabel>Amount *</FieldLabel>
            <TextField
              value={values.injectionAmount}
              onChangeText={(injectionAmount) => onChange({ injectionAmount })}
              placeholder="e.g. 10"
            />
            <FieldLabel>Unit</FieldLabel>
            <View style={styles.chipRow}>
              {INJECTION_UNITS.map((u) => (
                <Pressable
                  key={u}
                  style={[styles.chip, values.injectionUnit === u && styles.chipActive]}
                  onPress={() => onChange({ injectionUnit: u })}
                >
                  <Text
                    style={[styles.chipText, values.injectionUnit === u && styles.chipTextActive]}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <FieldLabel>Strength (mg) — optional</FieldLabel>
        <TextField value={values.doseMg} onChangeText={(doseMg) => onChange({ doseMg })} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.hint}>{hint}</Text>
      <FieldLabel>Dose description *</FieldLabel>
      <TextField
        value={values.otherDescription}
        onChangeText={(otherDescription) => onChange({ otherDescription })}
        placeholder="e.g. 1 dropper, 2 sprays"
      />
      <FieldLabel>Strength (mg) — optional</FieldLabel>
      <TextField value={values.doseMg} onChangeText={(doseMg) => onChange({ doseMg })} />
    </View>
  );
}
