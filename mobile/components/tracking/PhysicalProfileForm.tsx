import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing } from '../../constants/theme';
import type { BodyMetricUnit } from '../../lib/bodyMetrics';
import type { PhysicalProfileInput } from '../../lib/physicalProfile';
import { routes } from '../../lib/routes';
import { HeightWeightFields } from './HeightWeightFields';
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


  return (
    <View>
      <Text style={trackingStyles.hint}>
        Update anytime. Your latest height and weight also appear in Medical records and the report for your doctor.
      </Text>
      <Pressable onPress={() => router.push(routes.medicalRecords)}>
        <Text style={[trackingStyles.ghostBtnText, { marginBottom: spacing.md }]}>
          Birth date and sex are in Medical records ›
        </Text>
      </Pressable>

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
        <Text style={trackingStyles.primaryBtnText}>{busy ? 'Saving…' : 'Save measurements'}</Text>
      </Pressable>
    </View>
  );
}
