import { useMemo } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { IsoDateInput } from '../IsoDateInput';
import { todayLocalDate } from '../../lib/dates';
import { useRouter } from 'expo-router';
import type { ColorPalette } from '../../constants/theme';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeProvider';
import {
  BLOOD_TYPE_OPTIONS,
  COMMON_ALLERGY_SUGGESTIONS,
  COMMON_CONDITION_SUGGESTIONS,
} from '../../lib/allergyCheck';
import type { BodyMetricUnit } from '../../lib/bodyMetrics';
import type { MedicalRecordInput } from '../../lib/medicalRecords';
import { GENDER_OPTIONS, ageFromDateOfBirth } from '../../lib/profileStats';
import { HeightWeightFields } from '../tracking/HeightWeightFields';
import { SelectField } from '../tracking/SelectField';
import { useTrackingStyles } from '../tracking/trackingStyles';
import { TagListField } from './TagListField';

type Props = {
  value: MedicalRecordInput;
  onChange: (next: MedicalRecordInput) => void;
  onHeightUnitChange: (unit: BodyMetricUnit) => void;
  onWeightUnitChange: (unit: BodyMetricUnit) => void;
  onSubmit: () => void;
  busy?: boolean;
};

export function MedicalRecordsForm({
  value,
  onChange,
  onHeightUnitChange,
  onWeightUnitChange,
  onSubmit,
  busy = false,
}: Props) {
  const router = useRouter();
  const trackingStyles = useTrackingStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => makeFormStyles(colors), [colors]);

  function patch(partial: Partial<MedicalRecordInput>) {
    onChange({ ...value, ...partial });
  }

  const age = value.date_of_birth ? ageFromDateOfBirth(value.date_of_birth) : null;

  return (
    <View style={styles.form}>
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          <Text style={styles.disclaimerStrong}>Not certified medical records.</Text> This is
          self-reported information stored in your account to help flag possible allergy matches
          when you add medications. Always consult your physician or pharmacist.
        </Text>
      </View>

      <Text style={trackingStyles.sectionTitle}>About you</Text>
      <Text style={trackingStyles.hint}>
        Optional basics — also editable on Tracking. Update weight and height anytime.
      </Text>
      <Pressable onPress={() => router.push('/(drawer)/tracking')}>
        <Text style={[trackingStyles.ghostBtnText, { marginBottom: spacing.sm }]}>
          Open tracking →
        </Text>
      </Pressable>

      <Text style={trackingStyles.label}>Date of birth (YYYY-MM-DD)</Text>
      <IsoDateInput
        style={trackingStyles.input}
        value={value.date_of_birth}
        onChangeText={(date_of_birth) => patch({ date_of_birth })}
        maxDate={todayLocalDate()}
      />
      {age != null ? <Text style={trackingStyles.hint}>Age {age} years</Text> : null}

      <SelectField
        label="Gender"
        value={value.gender}
        options={GENDER_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
        onChange={(gender) => patch({ gender })}
      />

      <HeightWeightFields
        height_cm={value.height_cm}
        weight_kg={value.weight_kg}
        height_unit={value.height_unit}
        weight_unit={value.weight_unit}
        onHeightChange={(height_cm) => patch({ height_cm })}
        onWeightChange={(weight_kg) => patch({ weight_kg })}
        onHeightUnitChange={onHeightUnitChange}
        onWeightUnitChange={onWeightUnitChange}
      />
      <Text style={trackingStyles.hint}>
        Unit preference is saved to your account. Values are stored as cm and kg.
      </Text>

      <Text style={[trackingStyles.sectionTitle, { marginTop: spacing.lg }]}>
        Clinical history
      </Text>

      <SelectField
        label="Blood type"
        value={value.blood_type}
        options={BLOOD_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
        onChange={(blood_type) => patch({ blood_type })}
      />

      <Text style={styles.asthmaHint}>
        <Text style={styles.disclaimerStrong}>Asthma & pain relievers:</Text> If ibuprofen
        (Advil/Motrin) bothers your breathing, also list Ibuprofen / NSAIDs under allergies. Aleve
        (naproxen) is in the same class; acetaminophen (Tylenol) is often used when NSAIDs are
        avoided.
      </Text>

      <TagListField
        label="Known allergies"
        hint="Used to check new medications against your allergy list."
        value={value.known_allergies}
        onChange={(known_allergies) => patch({ known_allergies })}
        suggestions={COMMON_ALLERGY_SUGGESTIONS}
        placeholder="e.g. Penicillin"
      />

      <TagListField
        label="Known conditions / diagnoses"
        hint="e.g. Asthma — we flag NSAIDs (ibuprofen, naproxen/Aleve, aspirin) for review."
        value={value.known_conditions}
        onChange={(known_conditions) => patch({ known_conditions })}
        suggestions={COMMON_CONDITION_SUGGESTIONS}
        placeholder="e.g. Type 2 diabetes"
      />

      <Text style={trackingStyles.label}>Past surgeries or hospitalizations</Text>
      <TextInput
        style={[trackingStyles.input, styles.textArea]}
        value={value.past_surgeries}
        onChangeText={(past_surgeries) => patch({ past_surgeries })}
        placeholder="Optional — year and procedure if you remember"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={trackingStyles.label}>Family history</Text>
      <TextInput
        style={[trackingStyles.input, styles.textArea]}
        value={value.family_history}
        onChangeText={(family_history) => patch({ family_history })}
        placeholder="Optional — e.g. heart disease in parents"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={trackingStyles.label}>Emergency notes</Text>
      <TextInput
        style={[trackingStyles.input, styles.textArea]}
        value={value.emergency_notes}
        onChangeText={(emergency_notes) => patch({ emergency_notes })}
        placeholder="Optional — e.g. carries EpiPen, pacemaker"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text style={trackingStyles.label}>Other notes</Text>
      <TextInput
        style={[trackingStyles.input, styles.textArea]}
        value={value.other_notes}
        onChangeText={(other_notes) => patch({ other_notes })}
        placeholder="Anything else your care team should know"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Pressable
        style={[trackingStyles.primaryBtn, busy && trackingStyles.disabled, { marginTop: spacing.lg }]}
        disabled={busy}
        onPress={onSubmit}
      >
        <Text style={trackingStyles.primaryBtnText}>
          {busy ? 'Saving…' : 'Save medical record'}
        </Text>
      </Pressable>
    </View>
  );
}

function makeFormStyles(colors: ColorPalette) {
  return {
    form: { paddingBottom: spacing.xl },
    disclaimer: {
      backgroundColor: colors.partialBg,
      borderWidth: 1,
      borderColor: colors.partialBorder,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    disclaimerText: { color: colors.text, lineHeight: 20, fontSize: 14 },
    disclaimerStrong: { fontWeight: '800' as const },
    asthmaHint: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 19,
      marginTop: spacing.sm,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' as const },
  };
}
