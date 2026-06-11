import { Pressable, Text, View } from 'react-native';
import { IsoDateInput } from '../IsoDateInput';
import { todayLocalDate } from '../../lib/dates';
import { useRouter } from 'expo-router';
import { spacing } from '../../constants/theme';
import { GENDER_OPTIONS, ageFromDateOfBirth } from '../../lib/profileStats';
import type { BodyMetricUnit } from '../../lib/bodyMetrics';
import type { PhysicalProfileInput } from '../../lib/physicalProfile';
import { HeightWeightFields } from './HeightWeightFields';
import { SelectField } from './SelectField';
import { useTrackingStyles } from './trackingStyles';

type Props = {
  value: PhysicalProfileInput;
  onChange: (next: PhysicalProfileInput) => void;
  onHeightUnitChange: (unit: BodyMetricUnit) => void;
  onWeightUnitChange: (unit: BodyMetricUnit) => void;
  onSubmit: () => void;
  busy?: boolean;
};

export function PhysicalProfileForm({
  value,
  onChange,
  onHeightUnitChange,
  onWeightUnitChange,
  onSubmit,
  busy = false,
}: Props) {
  const router = useRouter();
  const trackingStyles = useTrackingStyles();

  function patch(partial: Partial<PhysicalProfileInput>) {
    onChange({ ...value, ...partial });
  }

  const age = value.date_of_birth ? ageFromDateOfBirth(value.date_of_birth) : null;

  return (
    <View>
      <Text style={trackingStyles.hint}>
        Update anytime — helpful for growing teens, weight changes, and tracking context.
        Also editable under Medical records.
      </Text>
      <Pressable onPress={() => router.push('/(drawer)/medical-records')}>
        <Text style={[trackingStyles.ghostBtnText, { marginBottom: spacing.md }]}>
          Open medical records →
        </Text>
      </Pressable>

      <Text style={trackingStyles.label}>Date of birth (YYYY-MM-DD)</Text>
      <IsoDateInput
        style={trackingStyles.input}
        value={value.date_of_birth}
        onChangeText={(date_of_birth) => patch({ date_of_birth })}
        maxDate={todayLocalDate()}
      />
      {age != null ? (
        <Text style={trackingStyles.hint}>Age {age} years</Text>
      ) : null}

      <SelectField
        label="Gender"
        value={value.gender}
        options={GENDER_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }))}
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
        Unit preference is saved to your account. Height and weight values are stored as cm and kg.
      </Text>

      <Pressable
        style={[trackingStyles.primaryBtn, busy && trackingStyles.disabled]}
        disabled={busy}
        onPress={onSubmit}
      >
        <Text style={trackingStyles.primaryBtnText}>{busy ? 'Saving…' : 'Save profile'}</Text>
      </Pressable>
    </View>
  );
}
