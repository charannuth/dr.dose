import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type SnoozeActivityProps = {
  medName: string;
  remindAtLabel: string;
  subtitle: string;
};

const SnoozeDoseActivity = (
  props: SnoozeActivityProps,
  environment: LiveActivityEnvironment,
) => {
  'widget';
  const accent = environment.colorScheme === 'dark' ? '#ab82c5' : '#7a4e96';

  return {
    banner: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'bold' }), foregroundStyle(accent)]}>
          {props.medName}
        </Text>
        <Text>{props.subtitle}</Text>
        <Text modifiers={[font({ size: 12 })]}>Reminder at {props.remindAtLabel}</Text>
      </VStack>
    ),
    compactLeading: <Image systemName="pills.fill" color={accent} />,
    compactTrailing: <Text>{props.remindAtLabel}</Text>,
    minimal: <Image systemName="pills.fill" color={accent} />,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Image systemName="pills.fill" color={accent} />
        <Text modifiers={[font({ size: 12 })]}>Snoozed</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 18 })]}>{props.remindAtLabel}</Text>
        <Text modifiers={[font({ size: 12 })]}>reminder</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'semibold' })]}>{props.medName}</Text>
        <Text>{props.subtitle}</Text>
      </VStack>
    ),
  };
};

export default createLiveActivity('SnoozeDoseActivity', SnoozeDoseActivity);
