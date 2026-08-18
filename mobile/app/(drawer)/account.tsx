import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LegalLinks } from '../../components/LegalLinks';
import { AccountMedicationsSection } from '../../components/account/AccountMedicationsSection';
import { ProfilePictureEditor } from '../../components/account/ProfilePictureEditor';
import { ProfileStreakSummary } from '../../components/account/ProfileStreakSummary';
import { TimezonePickerField } from '../../components/account/TimezonePickerField';
import { StreakBadges } from '../../components/streaks/StreakBadges';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useVault } from '../../hooks/useVault';
import {
  PASSWORD_REQUIREMENTS_HINT,
  validatePassword,
  validatePasswordMatch,
} from '../../lib/passwordPolicy';
import { useStreakStats } from '../../hooks/useStreakStats';
import { getDisplayName } from '../../lib/profile';
import {
  getNotificationPermission,
  notificationPermissionHint,
  openNotificationSettings,
  requestNotificationPermission,
  scheduleTestReminder,
  scheduleTestNextDoseReminder,
  scheduleTestRefillReminder,
  previewReminderSound,
  simulatorReminderNote,
} from '../../lib/notifications';
import { cancelAllLocalReminders, rescheduleAllReminders } from '../../lib/reminders';
import { runReminderCheck, type ReminderCheckResult } from '../../lib/reminderDebug';
import {
  getReminders,
  getReminderSound,
  getSameTimeDoseMode,
  getTimezone,
  loadTimezone,
  REMINDER_SOUNDS,
  SAME_TIME_DOSE_MODES,
  setReminders,
  setReminderSound,
  setSameTimeDoseMode,
  setTimezone,
  type ReminderSound,
  type SameTimeDoseMode,
  type ThemeMode,
} from '../../lib/settings';
import { STREAK_CALENDAR_DAYS } from '../../lib/streaks';
import { routes } from '../../lib/routes';
import { radii, spacing } from '../../constants/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function AccountScreen() {
  const { user, signOut, updateDisplayName, deleteAccount, updatePassword } = useAuth();
  const vault = useVault();
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { stats: streakStats, loading: streakLoading, error: streakError } = useStreakStats(
    user?.id,
  );

  const [displayName, setDisplayName] = useState(
    () => (user?.user_metadata?.display_name as string) ?? '',
  );
  const [timezone, setTimezoneState] = useState(() => getTimezone());
  const [remindersOn, setRemindersOn] = useState(false);
  const [reminderSound, setReminderSoundState] = useState<ReminderSound>('default');
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'undetermined'
  >('undetermined');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [reminderDebug, setReminderDebug] = useState<ReminderCheckResult | null>(null);
  const [sameTimeDoseMode, setSameTimeDoseModeState] = useState<SameTimeDoseMode>('choose');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmNextPassword, setConfirmNextPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    setDisplayName((user?.user_metadata?.display_name as string) ?? '');
  }, [user?.user_metadata?.display_name]);

  useEffect(() => {
    void getReminders().then((r) => setRemindersOn(r.enabled));
    void getReminderSound().then(setReminderSoundState);
    void getNotificationPermission().then(setPermissionStatus);
    void loadTimezone().then(setTimezoneState);
    void getSameTimeDoseMode().then(setSameTimeDoseModeState);
  }, []);

  async function savePassword() {
    setSettingsError(null);
    setMessage(null);
    const policy = validatePassword(nextPassword);
    if (!policy.ok) {
      setSettingsError(policy.message);
      return;
    }
    const match = validatePasswordMatch(nextPassword, confirmNextPassword);
    if (!match.ok) {
      setSettingsError(match.message);
      return;
    }
    if (!currentPassword) {
      setSettingsError('Enter your current password.');
      return;
    }
    setPasswordBusy(true);
    try {
      await vault.changePassphrase(currentPassword, nextPassword);
      await updatePassword(nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmNextPassword('');
      setMessage('Password updated.');
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleSameTimeDoseModeChange(mode: SameTimeDoseMode) {
    setSameTimeDoseModeState(mode);
    try {
      await setSameTimeDoseMode(mode);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Could not save preference');
    }
  }

  async function handleReminderSoundChange(sound: ReminderSound) {
    setReminderSoundState(sound);
    try {
      await setReminderSound(sound);
      if (user && remindersOn) await rescheduleAllReminders(user.id);
      const result = await previewReminderSound(sound);
      if (!result.ok) setMessage(result.reason);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Could not update sound');
    }
  }

  const created = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const displayNameResolved =
    getDisplayName(user) ?? (user?.user_metadata?.display_name as string | undefined);

  async function saveDisplayName() {
    setProfileBusy(true);
    setSettingsError(null);
    setMessage(null);
    try {
      await updateDisplayName(displayName);
      setMessage('Profile updated.');
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleTimezoneChange(tz: string) {
    setTimezoneState(tz);
    await setTimezone(tz);
    if (user && remindersOn) {
      try {
        await rescheduleAllReminders(user.id);
        const check = await runReminderCheck(user.id);
        setReminderDebug(check);
      } catch {
        // ignore reschedule errors on timezone change
      }
    }
    setMessage('Timezone saved. Dose times and visit reminders use this zone.');
  }

  async function handleThemeChange(mode: ThemeMode) {
    await setThemeMode(mode);
    setMessage(`Theme set to ${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}.`);
  }

  async function handleRemindersToggle(enabled: boolean) {
    if (!user) return;
    setBusy(true);
    setSettingsError(null);
    try {
      if (enabled) {
        const ok = await requestNotificationPermission();
        const status = await getNotificationPermission();
        setPermissionStatus(status);
        if (!ok) {
          Alert.alert(
            'Notifications disabled',
            'Allow notifications for Dr. Dose in iPhone Settings to get dose reminders on your lock screen.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openNotificationSettings },
            ],
          );
          return;
        }
        await setReminders({ enabled: true });
        setRemindersOn(true);
        const summary = await rescheduleAllReminders(user.id);
        const check = await runReminderCheck(user.id);
        setReminderDebug(check);
        const totalScheduled =
          summary.dose.scheduled + summary.doctorVisits.scheduled + summary.refills.scheduled;
        setMessage(
          `${check.summary} · ${summary.refills.scheduled} refill reminder${summary.refills.scheduled === 1 ? '' : 's'}.`,
        );
        if (
          summary.dose.skippedOverLimit > 0 ||
          summary.doctorVisits.skippedOverLimit > 0 ||
          summary.refills.skippedOverLimit > 0
        ) {
          Alert.alert(
            'Reminder limit',
            `Scheduled ${totalScheduled} reminders (iOS allows up to 64 total). Fewer dose times, visits, or tracked meds may be needed.`,
          );
        }
      } else {
        await setReminders({ enabled: false });
        setRemindersOn(false);
        await cancelAllLocalReminders();
        setReminderDebug(null);
      }
    } catch (err) {
      Alert.alert(
        'Reminders',
        err instanceof Error ? err.message : 'Could not update reminders',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckRemindersNow() {
    if (!user) return;
    setBusy(true);
    setSettingsError(null);
    setMessage(null);
    try {
      if (remindersOn) {
        await rescheduleAllReminders(user.id);
      }
      const check = await runReminderCheck(user.id);
      setReminderDebug(check);
      setMessage(check.summary);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Reminder check failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await cancelAllLocalReminders();
      await signOut();
    } catch {
      /* ignore */
    }
  }

  async function runDeleteAccount() {
    setDeleting(true);
    try {
      await cancelAllLocalReminders();
      await deleteAccount();
      // deleteAccount signs out; the auth listener routes back to sign-in.
    } catch (err) {
      setDeleting(false);
      Alert.alert(
        'Could not delete account',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Permanently delete account?',
      'This erases your account and all of your data — medications, dose history, wellness logs, medical records, doctor visits, and tracking. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your account and all associated data will be permanently erased.',
              [
                { text: 'Keep my account', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: () => void runDeleteAccount(),
                },
              ],
            );
          },
        },
      ],
    );
  }

  const simNote = simulatorReminderNote();

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>My account</Text>
          <Text style={styles.subtitle}>Profile, badges, and sign-in</Text>
        </View>

        {streakError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{streakError}</Text>
          </View>
        ) : null}

        {!streakLoading && streakStats ? (
          <>
            <ProfileStreakSummary
              user={user}
              displayName={displayNameResolved}
              email={user?.email}
              stats={streakStats}
            />
            <View style={styles.card}>
              <StreakBadges longestStreak={streakStats.longestStreak} compact />
            </View>
            <View style={styles.teaserRow}>
              <Pressable style={styles.teaser} onPress={() => router.push(routes.streaks)}>
                <Text style={styles.teaserLabel}>Streaks</Text>
                <Text style={styles.teaserText}>
                  Current{' '}
                  <Text style={styles.strong}>
                    {streakStats.currentStreak} day{streakStats.currentStreak === 1 ? '' : 's'}
                  </Text>
                  {' '}
                  · badge milestones →
                </Text>
              </Pressable>
              <Pressable style={styles.teaser} onPress={() => router.push(routes.history)}>
                <Text style={styles.teaserLabel}>History</Text>
                <Text style={styles.teaserText}>
                  {STREAK_CALENDAR_DAYS}-day calendar · doses & notes →
                </Text>
              </Pressable>
            </View>
          </>
        ) : streakLoading ? (
          <Text style={styles.hint}>Loading streak stats…</Text>
        ) : null}

        <AccountMedicationsSection />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <ProfilePictureEditor />

          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={[styles.secondaryBtn, profileBusy && styles.btnDisabled]}
            disabled={profileBusy}
            onPress={() => void saveDisplayName()}
          >
            <Text style={styles.secondaryBtnText}>{profileBusy ? 'Saving…' : 'Save name'}</Text>
          </Pressable>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Change password</Text>
          <Text style={styles.hint}>{PASSWORD_REQUIREMENTS_HINT}</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={nextPassword}
            onChangeText={setNextPassword}
            placeholder="New password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={confirmNextPassword}
            onChangeText={setConfirmNextPassword}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.secondaryBtn, passwordBusy && styles.btnDisabled]}
            disabled={passwordBusy}
            onPress={() => void savePassword()}
          >
            <Text style={styles.secondaryBtnText}>
              {passwordBusy ? 'Updating…' : 'Update password'}
            </Text>
          </Pressable>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Appearance</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.themeChip, active && styles.themeChipActive]}
                  onPress={() => void handleThemeChange(opt.value)}
                >
                  <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TimezonePickerField value={timezone} onChange={(tz) => void handleTimezoneChange(tz)} />

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
            Same-time doses on Today
          </Text>
          <Text style={styles.hint}>
            When several medications share a dose time, choose how batch marking works. Each
            logged dose is identical to tapping Mark taken on that medication.
          </Text>
          <View style={styles.themeRow}>
            {SAME_TIME_DOSE_MODES.map((opt) => {
              const active = sameTimeDoseMode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.themeChip, active && styles.themeChipActive]}
                  onPress={() => void handleSameTimeDoseModeChange(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            {SAME_TIME_DOSE_MODES.find((o) => o.value === sameTimeDoseMode)?.hint}
          </Text>

          <View style={styles.reminderSection}>
            <Text style={styles.fieldLabel}>Reminders</Text>
            <Text style={styles.hint}>
              Lock-screen alerts for scheduled dose times, low supply refills (10:00 AM daily while
            at or below 7 remaining), and upcoming doctor visits (9:00 AM on visit and follow-up
            days).
            </Text>
            {simNote ? <Text style={styles.hint}>{simNote}</Text> : null}
            <Text style={styles.hint}>{notificationPermissionHint(permissionStatus)}</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable reminders</Text>
              <Switch
                value={remindersOn}
                disabled={busy}
                onValueChange={(v) => void handleRemindersToggle(v)}
              />
            </View>
            {permissionStatus === 'denied' ? (
              <Pressable onPress={openNotificationSettings}>
                <Text style={styles.link}>Open iPhone Settings</Text>
              </Pressable>
            ) : null}
            {remindersOn ? (
              <View style={styles.soundBlock}>
                <Text style={styles.switchLabel}>Reminder sound</Text>
                <Text style={styles.hint}>
                  Pick the chime for dose reminders. Tap one to hear it. Make sure your
                  ringer is on and Silent mode is off so alerts are audible.
                </Text>
                <View style={styles.themeRow}>
                  {REMINDER_SOUNDS.map((opt) => {
                    const active = reminderSound === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[styles.themeChip, active && styles.themeChipActive]}
                        onPress={() => void handleReminderSoundChange(opt.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text
                          style={[styles.themeChipText, active && styles.themeChipTextActive]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            {remindersOn ? (
              <Pressable
                style={styles.secondaryBtn}
                disabled={busy}
                onPress={() => void handleCheckRemindersNow()}
              >
                <Text style={styles.secondaryBtnText}>Check reminders now</Text>
              </Pressable>
            ) : null}
            {reminderDebug && remindersOn ? (
              <View style={styles.debugBox}>
                <Text style={styles.hint}>
                  App clock: <Text style={styles.strong}>{reminderDebug.nowLabel}</Text> (
                  {reminderDebug.timezone}) · Today: {reminderDebug.today}
                </Text>
                <Text style={styles.hint}>
                  Pending: {reminderDebug.doseNotificationCount} dose ·{' '}
                  {reminderDebug.visitNotificationCount} visit ·{' '}
                  {reminderDebug.refillNotificationCount} refill
                </Text>
                {reminderDebug.slots.length === 0 ? (
                  <Text style={styles.hint}>No dose slots for today.</Text>
                ) : (
                  reminderDebug.slots.map((slot) => (
                    <Text key={`${slot.medicationName}-${slot.scheduleTime}`} style={styles.hint}>
                      <Text style={styles.strong}>{slot.medicationName}</Text> {slot.scheduleLabel}
                      {slot.taken
                        ? ' — taken'
                        : slot.scheduledNotification
                          ? ' — notification scheduled'
                          : slot.skipReason
                            ? ` — ${slot.skipReason}`
                            : ''}
                    </Text>
                  ))
                )}
              </View>
            ) : null}
            {__DEV__ ? (
              <>
                <Pressable
                  style={styles.devButton}
                  onPress={() => {
                    void (async () => {
                      const result = await scheduleTestReminder(15);
                      if (result.ok) {
                        Alert.alert(
                          'Test scheduled',
                          'You should see an alert in about 15 seconds (Notification Center in the simulator).',
                        );
                      } else {
                        Alert.alert('Test failed', result.reason);
                      }
                    })();
                  }}
                >
                  <Text style={styles.devButtonText}>Send test reminder in 15s</Text>
                </Pressable>
                {user && remindersOn ? (
                  <Pressable
                    style={styles.devButton}
                    onPress={() => {
                      void (async () => {
                        const result = await scheduleTestNextDoseReminder(user.id, 60);
                        if (result.ok) {
                          Alert.alert(
                            'Dose test scheduled',
                            `Simulating your next dose (${result.label}) in 60 seconds.`,
                          );
                        } else {
                          Alert.alert('Dose test failed', result.reason);
                        }
                      })();
                    }}
                  >
                    <Text style={styles.devButtonText}>Test next dose in 60s</Text>
                  </Pressable>
                ) : null}
                {user && remindersOn ? (
                  <Pressable
                    style={styles.devButton}
                    onPress={() => {
                      void (async () => {
                        const result = await scheduleTestRefillReminder(user.id, 30);
                        if (result.ok) {
                          Alert.alert(
                            'Refill test scheduled',
                            `Simulating a refill alert for ${result.label} in 30 seconds.`,
                          );
                        } else {
                          Alert.alert('Refill test failed', result.reason);
                        }
                      })();
                    }}
                  >
                    <Text style={styles.devButtonText}>Test refill alert in 30s</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>

          {settingsError ? <Text style={styles.inlineError}>{settingsError}</Text> : null}
          {message ? <Text style={styles.inlineSuccess}>{message}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <LegalLinks
            colors={colors}
            styles={{
              legalRow: styles.legalRow,
              legalLink: styles.link,
              legalMuted: styles.legalMuted,
            }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sign-in</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>
          {created ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account created</Text>
              <Text style={styles.detailValue}>{created}</Text>
            </View>
          ) : null}
          <Pressable style={styles.signOutBtn} onPress={() => void handleSignOut()}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delete account</Text>
          <Text style={styles.hint}>
            Permanently delete your account and all associated data. This action cannot be
            undone.
          </Text>
          <Pressable
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            disabled={deleting}
            onPress={confirmDeleteAccount}
          >
            <Text style={styles.deleteText}>
              {deleting ? 'Deleting…' : 'Delete account'}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push(routes.today)}>
          <Text style={[styles.link, styles.footerLink]}>Go to Today</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
    header: { gap: spacing.xs },
    title: { fontSize: 24, fontWeight: '900', color: colors.text },
    subtitle: { color: colors.textMuted, fontSize: 15 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
    hint: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    fieldLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.bg,
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    secondaryBtnText: { fontWeight: '700', color: colors.text },
    btnDisabled: { opacity: 0.5 },
    themeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    themeChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.bg,
    },
    themeChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.pendingBg,
    },
    themeChipText: { fontWeight: '700', color: colors.textMuted },
    themeChipTextActive: { color: colors.accent },
    reminderSection: { marginTop: spacing.md, gap: spacing.sm },
    soundBlock: { gap: spacing.sm, marginTop: spacing.xs },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    switchLabel: { fontWeight: '800', color: colors.text, flex: 1 },
    link: { color: colors.accent, fontWeight: '700', fontSize: 15 },
    debugBox: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      gap: 4,
    },
    devButton: {
      marginTop: spacing.xs,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    devButtonText: { fontSize: 14, fontWeight: '700', color: colors.accent },
    inlineError: { color: colors.error, fontWeight: '600' },
    inlineSuccess: { color: colors.success, fontWeight: '600' },
    detailRow: { gap: 4, marginTop: spacing.sm },
    detailLabel: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
    detailValue: { fontSize: 15, color: colors.text },
    signOutBtn: {
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    signOutText: { fontWeight: '700', color: colors.error, fontSize: 16 },
    deleteBtn: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.errorBg,
    },
    deleteText: { fontWeight: '800', color: colors.error, fontSize: 16 },
    teaserRow: { gap: spacing.sm },
    teaser: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: 4,
    },
    teaserLabel: { fontWeight: '900', color: colors.text, fontSize: 15 },
    teaserText: { color: colors.textMuted, lineHeight: 20 },
    strong: { fontWeight: '900', color: colors.text },
    errorBanner: {
      backgroundColor: colors.errorBg,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.errorBorder,
    },
    errorBannerText: { color: colors.error, fontWeight: '700' },
    footerLink: { textAlign: 'center', marginTop: spacing.sm },
    legalRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 4,
    },
    legalMuted: { color: colors.textMuted, fontSize: 14 },
  });
}
