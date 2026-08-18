import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type {
  MedicationCategory,
  MedicationScheduleType,
} from '../../../lib/medicationSchedule';
import type { ColorPalette } from '../../../constants/theme';
import { fonts, radii, spacing, typography } from '../../../constants/theme';
import { useAuth } from '../../../hooks/useAuth';
import { createMedication, fetchMedicationsWithStatus } from '../../../lib/medications';
import { rescheduleAllReminders } from '../../../lib/reminders';
import { MedicationFormWizard } from '../../../components/medication/MedicationFormWizard';
import { ScanReviewScreen } from '../../../components/medication/ScanReviewScreen';
import type { LabelScanPrefill } from '../../../lib/labelScanPrefill';
import {
  hasUsefulPrefill,
  isLabelAiAvailable,
  recognizePrescription,
  type PrescriptionPrefill,
} from '../../../lib/prescriptionScan';
import type { MedicationInput } from '../../../lib/types';
import { useTheme } from '../../../context/ThemeProvider';
import { useThemedStyles } from '../../../hooks/useThemedStyles';

type AddMode = 'choose' | 'review' | 'form';

function makeStyles(colors: ColorPalette) {
  return {
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.md, gap: spacing.md },
    title: { ...typography.display, fontSize: 26, color: colors.text },
    subtitle: { ...typography.body, fontSize: 15, color: colors.textMuted, lineHeight: 22 },
    card: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      gap: 6,
    },
    cardScan: {
      borderColor: colors.accentBlue,
      backgroundColor: colors.accentBlueBg,
      borderLeftWidth: 5,
    },
    cardManual: {
      borderColor: colors.accentPurple,
      borderLeftWidth: 5,
    },
    cardTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
    cardTitleScan: { color: colors.accentBlue },
    cardTitleManual: { color: colors.accentPurple },
    cardDesc: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    note: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    scanningWrap: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.md,
      backgroundColor: colors.bg,
      padding: spacing.lg,
    },
    scanningText: { ...typography.body, fontSize: 16, color: colors.text, textAlign: 'center' as const },
    scanningHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' as const },
  };
}

export default function AddMedicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scheduleType?: string; category?: string }>();
  const defaultScheduleType: MedicationScheduleType =
    params.scheduleType === 'as_needed' ? 'as_needed' : 'scheduled';
  const defaultCategory: MedicationCategory =
    params.category === 'supplement' ? 'supplement' : 'medication';
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [mode, setMode] = useState<AddMode>('choose');
  const [scanResult, setScanResult] = useState<PrescriptionPrefill | null>(null);
  const [prefill, setPrefill] = useState<LabelScanPrefill | null>(null);
  const [scanConfirmed, setScanConfirmed] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!user) return;
    void fetchMedicationsWithStatus(user.id).then((meds) =>
      setExistingNames(meds.map((m) => m.name)),
    );
  }, [user]);

  async function runScan(source: 'camera' | 'library') {
    setScanning(true);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      };
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Camera access needed',
            'Allow camera access in Settings to scan a label, or enter the details manually.',
          );
          setScanning(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (result.canceled || !result.assets[0]?.uri) {
        setScanning(false);
        return;
      }

      // Cloud AI is opt-in per scan: OCR text (not the photo) would leave the device.
      let useCloudAi = false;
      if (isLabelAiAvailable()) {
        useCloudAi = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Enhance with AI?',
            'On-device OCR always runs. Optionally send the scanned label text (not the photo) to Google to fill more fields. Skip to keep everything on this device.',
            [
              { text: 'On-device only', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Enhance with AI', onPress: () => resolve(true) },
            ],
          );
        });
      }

      const parsed = await recognizePrescription(result.assets[0].uri, { useCloudAi });
      setScanResult(parsed);
      setMode('review');
      if (!hasUsefulPrefill(parsed)) {
        Alert.alert(
          'Limited details detected',
          "We couldn't read much from this photo. Review what we found, edit any fields, or tap Rescan with a clearer picture.",
        );
      }
    } catch (err) {
      Alert.alert(
        'Scan failed',
        err instanceof Error ? err.message : 'Could not scan the label. Please enter details manually.',
      );
      setPrefill(null);
      setMode('form');
    } finally {
      setScanning(false);
    }
  }

  function startScan() {
    Alert.alert('Scan a pharmacy label', 'Take a clear photo of the prescription label.', [
      { text: 'Take photo', onPress: () => void runScan('camera') },
      { text: 'Choose from library', onPress: () => void runScan('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSave(input: MedicationInput) {
    if (!user) return;
    await createMedication(user.id, input);
    try {
      await rescheduleAllReminders(user.id);
    } catch {
      // ignore reminder scheduling errors; medication was saved
    }
    router.back();
  }

  if (!user) return null;

  if (scanning) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.scanningWrap}>
          <ActivityIndicator size="large" color={colors.accentBlue} />
          <Text style={styles.scanningText}>Reading your label…</Text>
          <Text style={styles.scanningHint}>
            OCR runs on your device.
            {isLabelAiAvailable()
              ? ' Optional AI may analyze the text to fill more fields — never the photo itself.'
              : ''}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'review' && scanResult) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScanReviewScreen
          scan={scanResult}
          onConfirm={(next) => {
            setPrefill(next);
            setScanConfirmed(true);
            setMode('form');
          }}
          onRescan={() => {
            setScanConfirmed(false);
            startScan();
          }}
          onCancel={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (mode === 'choose') {
    const isSupplement = defaultCategory === 'supplement';
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{isSupplement ? 'Add supplement' : 'Add medication'}</Text>
          <Text style={styles.subtitle}>
            Scan your CVS or pharmacy label to auto-fill details, or type them in yourself.
          </Text>

          {!isSupplement ? (
            <Pressable
              style={[styles.card, styles.cardScan]}
              onPress={startScan}
              accessibilityRole="button"
            >
              <Text style={[styles.cardTitle, styles.cardTitleScan]}>Scan pharmacy label</Text>
              <Text style={styles.cardDesc}>
                Point your camera at the prescription sticker. We'll read the drug name, strength,
                directions, and more — then you review everything before saving.
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.card, styles.cardManual]}
            onPress={() => {
              setPrefill(null);
              setScanResult(null);
              setScanConfirmed(false);
              setMode('form');
            }}
            accessibilityRole="button"
          >
            <Text style={[styles.cardTitle, styles.cardTitleManual]}>Enter manually</Text>
            <Text style={styles.cardDesc}>
              Type the details yourself. You can add a name, dose, schedule, and reminders step by
              step.
            </Text>
          </Pressable>

          <Text style={styles.note}>
            Scanned details are only suggestions — you'll review them on the next screen, then
            confirm every step in the wizard before saving.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <MedicationFormWizard
        userId={user.id}
        existingMedicationNames={existingNames}
        defaultScheduleType={defaultScheduleType}
        defaultCategory={defaultCategory}
        prefill={prefill}
        skipBasicsAfterScan={scanConfirmed}
        onSave={handleSave}
        onCancel={() => {
          if (scanConfirmed && scanResult) {
            setMode('review');
            return;
          }
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
