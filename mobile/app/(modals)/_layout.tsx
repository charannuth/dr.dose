import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeProvider';

export default function ModalLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="medications/new"
        options={{ title: 'Add medication', presentation: 'modal' }}
      />
      <Stack.Screen
        name="medications/[id]"
        options={{ title: 'Edit medication', presentation: 'modal' }}
      />
      <Stack.Screen
        name="supplements/new"
        options={{ title: 'Add supplement', presentation: 'modal' }}
      />
      <Stack.Screen
        name="supplements/[id]"
        options={{ title: 'Edit supplement', presentation: 'modal' }}
      />
      <Stack.Screen
        name="reorder"
        options={{ title: 'Reorder', presentation: 'modal' }}
      />
    </Stack>
  );
}
