import { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeProvider';
import { listTimezones } from '../../lib/settings';
import { radii, spacing } from '../../constants/theme';

type Props = {
  value: string;
  onChange: (timezone: string) => void;
};

export function TimezonePickerField({ value, onChange }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const styles = makeStyles(colors);

  const zones = useMemo(() => listTimezones(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter((z) => z.toLowerCase().includes(q));
  }, [zones, query]);

  function closePicker() {
    Keyboard.dismiss();
    setOpen(false);
    setQuery('');
  }

  return (
    <View>
      <Text style={styles.label}>Timezone</Text>
      <Pressable style={styles.selectBtn} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Change timezone, currently ${value}`}>
        <Text style={styles.selectText} numberOfLines={2}>
          {value}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={closePicker}>
        <SafeAreaProvider>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} accessibilityRole="header">Choose timezone</Text>
            <Pressable style={styles.doneButton} onPress={closePicker} accessibilityRole="button" accessibilityLabel="Done choosing timezone">
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <KeyboardAvoidingView style={styles.listArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search timezones"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search timezones"
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={<Text style={styles.empty}>No matching timezones.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.zoneRow, item === value && styles.zoneRowActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: item === value }}
                onPress={() => {
                  onChange(item);
                  closePicker();
                }}
              >
                <Text style={[styles.zoneText, item === value && styles.zoneTextActive]}>
                  {item}
                </Text>
              </Pressable>
            )}
          />
          </KeyboardAvoidingView>
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    label: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
    selectBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      backgroundColor: colors.surface,
    },
    selectText: { color: colors.text, fontSize: 15 },
    modalSafe: { flex: 1, backgroundColor: colors.bg },
    listArea: { flex: 1 },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '900', color: colors.text },
    doneButton: { minWidth: 64, minHeight: 48, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    done: { color: colors.accent, fontWeight: '800', fontSize: 16 },
    empty: { color: colors.textMuted, padding: spacing.md },
    search: {
      margin: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    zoneRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    zoneRowActive: { backgroundColor: colors.pendingBg },
    zoneText: { color: colors.text, fontSize: 15 },
    zoneTextActive: { fontWeight: '800', color: colors.accent },
  });
}
