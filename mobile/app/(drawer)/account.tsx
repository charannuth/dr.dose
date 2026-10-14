import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { LegalLinks } from '../../components/LegalLinks';
import { PasswordInput } from '../../components/PasswordInput';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { AccountMedicationsSection } from '../../components/account/AccountMedicationsSection';
import { ProfilePictureEditor } from '../../components/account/ProfilePictureEditor';
import { Segmented, SettingsGroup, SettingsRow, SettingsSheet } from '../../components/account/SettingsList';
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
import { getEarnedStreakBadges } from '../../lib/streakBadges';
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
import { routes } from '../../lib/routes';
import { tapFeedback } from '../../lib/haptics';
import { fonts, radii, spacing, withAlpha } from '../../constants/theme';
import { AmbientScrollView } from '../../components/AmbientBackground';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
];

type Sheet = 'profile' | 'password' | 'medications' | 'badges' | 'timezone' | 'reminders' | 'dosing' | 'legal' | null;

/** "America/New_York" → "New York". */
function shortZone(tz: string) {
  const last = tz.split('/').pop() ?? tz;
  return last.replace(/_/g, ' ');
}

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
  const [sheet, setSheet] = useState<Sheet>(null);

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

  // Links inside a sheet (e.g. Add medication) navigate away; close the sheet so it isn't left on top.
  useFocusEffect(useCallback(() => () => setSheet(null), []));

  function openSheet(next: Sheet) {
    setMessage(null);
    setSettingsError(null);
    setSheet(next);
  }

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
    setMessage(
      'Timezone saved. Dose reminders follow this zone until your phone timezone changes, then they switch to the phone.',
    );
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
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;
  const badgeCount = streakStats ? getEarnedStreakBadges(streakStats.longestStreak).length : 0;
  const doseModeLabel = SAME_TIME_DOSE_MODES.find((o) => o.value === sameTimeDoseMode)?.label;
  const soundLabel = REMINDER_SOUNDS.find((o) => o.id === reminderSound)?.label;
  const version = Constants.expoConfig?.version;
  const tint = {
    health: colors.accentGreen,
    activity: colors.accentAmber,
    prefs: colors.accentBlue,
    account: colors.accentPurple,
  };

  const feedback = (
    <>
      {settingsError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{settingsError}</Text>
        </View>
      ) : null}
      {message ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      ) : null}
    </>
  );

  const stats = streakStats
    ? [
        { label: 'Day streak', value: String(streakStats.currentStreak) },
        { label: 'Best streak', value: String(streakStats.longestStreak) },
        {
          label: 'Today',
          value: streakStats.todayExpected > 0 ? `${streakStats.todayTaken}/${streakStats.todayExpected}` : '—',
        },
      ]
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AmbientScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Pressable
            style={styles.heroTop}
            onPress={() => {
              tapFeedback();
              openSheet('profile');
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <ProfileAvatar user={user} displayName={displayNameResolved} email={user?.email} size="lg" />
            <View style={styles.heroText}>
              <Text style={styles.name} numberOfLines={1}>
                {displayNameResolved?.trim() || 'Add your name'}
              </Text>
              {user?.email ? (
                <Text style={styles.email} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
              {memberSince ? <Text style={styles.since}>Member since {memberSince}</Text> : null}
            </View>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>

          {stats ? (
            <Pressable
              style={styles.statRow}
              onPress={() => {
                tapFeedback();
                router.push(routes.streaks);
              }}
              accessibilityRole="button"
              accessibilityLabel="Open streaks"
            >
              {stats.map((s, i) => (
                <View key={s.label} style={[styles.stat, i > 0 && styles.statDivider]}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </Pressable>
          ) : streakLoading ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: 12 }} />
          ) : streakError ? (
            <Text style={styles.heroError}>{streakError}</Text>
          ) : null}
        </View>

        {sheet === null ? feedback : null}

        <SettingsGroup title="Your health">
          <SettingsRow icon="today" tint={tint.health} title="Medications" onPress={() => openSheet('medications')} />
          <SettingsRow icon="refill" tint={tint.health} title="Refills" onPress={() => router.push(routes.refills)} />
          <SettingsRow icon="records" tint={tint.health} title="Medical records" onPress={() => router.push(routes.medicalRecords)} />
          <SettingsRow icon="safety" tint={tint.health} title="Drug safety check" onPress={() => router.push(routes.interactions)} />
        </SettingsGroup>

        <SettingsGroup title="Activity">
          <SettingsRow
            icon="streaks"
            tint={tint.activity}
            title="Badges"
            value={streakStats ? `${badgeCount} earned` : null}
            onPress={() => openSheet('badges')}
          />
          <SettingsRow icon="history" tint={tint.activity} title="History" onPress={() => router.push(routes.history)} />
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingsRow
            icon="bell"
            tint={tint.prefs}
            title="Reminders"
            value={remindersOn ? soundLabel ?? 'On' : 'Off'}
            onPress={() => openSheet('reminders')}
          />
          <SettingsRow
            icon="palette"
            tint={tint.prefs}
            title="Appearance"
            right={<Segmented options={THEME_OPTIONS} value={themeMode} onChange={(m) => void setThemeMode(m)} />}
          />
          <SettingsRow icon="globe" tint={tint.prefs} title="Time zone" value={shortZone(timezone)} onPress={() => openSheet('timezone')} />
          <SettingsRow icon="list" tint={tint.prefs} title="Same-time doses" value={doseModeLabel} onPress={() => openSheet('dosing')} />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <SettingsRow icon="account" tint={tint.account} title="Profile" value={displayNameResolved?.trim() || null} onPress={() => openSheet('profile')} />
          <SettingsRow icon="lock" tint={tint.account} title="Password" onPress={() => openSheet('password')} />
          <SettingsRow icon="help" tint={tint.account} title="Help & safety" onPress={() => router.push(routes.help)} />
          <SettingsRow icon="legal" tint={tint.account} title="Privacy & terms" onPress={() => openSheet('legal')} />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow title="Sign out" destructive chevron={false} onPress={() => void handleSignOut()} />
        </SettingsGroup>

        <View style={styles.footer}>
          <Pressable onPress={confirmDeleteAccount} disabled={deleting} hitSlop={8} accessibilityRole="button">
            <Text style={styles.deleteLink}>{deleting ? 'Deleting account…' : 'Delete account'}</Text>
          </Pressable>
          <Text style={styles.version}>Dr. Dose{version ? ` ${version}` : ''}</Text>
        </View>
      </AmbientScrollView>

      <SettingsSheet visible={sheet === 'profile'} title="Profile" onClose={() => setSheet(null)}>
        <ProfilePictureEditor />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="How should we greet you?"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={() => void saveDisplayName()}
          />
        </View>
        <View style={styles.infoCard}>
          <InfoLine label="Email" value={user?.email ?? '—'} styles={styles} />
          {created ? <InfoLine label="Joined" value={created} styles={styles} /> : null}
        </View>
        {feedback}
        <PrimaryButton label={profileBusy ? 'Saving…' : 'Save'} disabled={profileBusy} onPress={() => void saveDisplayName()} styles={styles} />
      </SettingsSheet>

      <SettingsSheet visible={sheet === 'password'} title="Password" onClose={() => setSheet(null)}>
        <Text style={styles.hint}>{PASSWORD_REQUIREMENTS_HINT}</Text>
        <PasswordInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor={colors.textMuted}
          iconColor={colors.textMuted}
          autoCapitalize="none"
        />
        <PasswordInput
          style={styles.input}
          value={nextPassword}
          onChangeText={setNextPassword}
          placeholder="New password"
          placeholderTextColor={colors.textMuted}
          iconColor={colors.textMuted}
          autoCapitalize="none"
        />
        <PasswordInput
          style={styles.input}
          value={confirmNextPassword}
          onChangeText={setConfirmNextPassword}
          placeholder="Confirm new password"
          placeholderTextColor={colors.textMuted}
          iconColor={colors.textMuted}
          autoCapitalize="none"
        />
        {feedback}
        <PrimaryButton label={passwordBusy ? 'Updating…' : 'Update password'} disabled={passwordBusy} onPress={() => void savePassword()} styles={styles} />
        <Text style={styles.hint}>Your password also unlocks your encrypted health data, so it's re-keyed when you change it.</Text>
      </SettingsSheet>

      <SettingsSheet visible={sheet === 'medications'} title="Medications" onClose={() => setSheet(null)}>
        <AccountMedicationsSection />
      </SettingsSheet>

      <SettingsSheet visible={sheet === 'badges'} title="Badges" onClose={() => setSheet(null)}>
        {streakStats ? <StreakBadges longestStreak={streakStats.longestStreak} compact /> : null}
        <SecondaryButton
          label="See streaks and milestones"
          onPress={() => {
            setSheet(null);
            router.push(routes.streaks);
          }}
          styles={styles}
        />
      </SettingsSheet>

      <SettingsSheet visible={sheet === 'timezone'} title="Time zone" onClose={() => setSheet(null)}>
        <TimezonePickerField value={timezone} onChange={(tz) => void handleTimezoneChange(tz)} />
        <Text style={styles.hint}>
          A dose at 10:00 PM rings at 10:00 PM on the phone clock. After a trip, open the app once so
          reminders move off the old time zone.
        </Text>
        {feedback}
      </SettingsSheet>

      <SettingsSheet visible={sheet === 'dosing'} title="Same-time doses" onClose={() => setSheet(null)}>
        <Text style={styles.hint}>
          When several medications share a dose time, choose how marking them works. Each logged dose
          is the same as tapping Mark taken on that medication.
        </Text>
        <View style={styles.optionList}>
          {SAME_TIME_DOSE_MODES.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              hint={opt.hint}
              selected={sameTimeDoseMode === opt.value}
              onPress={() => void handleSameTimeDoseModeChange(opt.value)}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
        {feedback}
      </SettingsSheet>

      <SettingsSheet visible={sheet === 'reminders'} title="Reminders" onClose={() => setSheet(null)}>
        <View style={styles.switchCard}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.switchLabel}>Reminders</Text>
            <Text style={styles.hint}>Doses, low supply and doctor visits</Text>
          </View>
          {busy ? <ActivityIndicator color={colors.accent} /> : null}
          <Switch value={remindersOn} disabled={busy} onValueChange={(v) => void handleRemindersToggle(v)} />
        </View>
        <Text style={styles.hint}>
          Lock-screen alerts at each dose time, at 10:00 AM while a refill is at 7 or fewer, and at
          9:00 AM on visit and follow-up days.
        </Text>
        {permissionStatus !== 'granted' ? <Text style={styles.hint}>{notificationPermissionHint(permissionStatus)}</Text> : null}
        {simNote ? <Text style={styles.hint}>{simNote}</Text> : null}
        {permissionStatus === 'denied' ? (
          <SecondaryButton label="Open iPhone Settings" onPress={openNotificationSettings} styles={styles} />
        ) : null}

        {remindersOn ? (
          <>
            <Text style={styles.fieldLabel}>Sound</Text>
            <View style={styles.optionList}>
              {REMINDER_SOUNDS.map((opt) => (
                <OptionRow
                  key={opt.id}
                  label={opt.label}
                  selected={reminderSound === opt.id}
                  onPress={() => void handleReminderSoundChange(opt.id)}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </View>
            <Text style={styles.hint}>Tap a sound to hear it. Keep your ringer on so alerts are audible.</Text>
            <SecondaryButton label="Check reminders now" disabled={busy} onPress={() => void handleCheckRemindersNow()} styles={styles} />
          </>
        ) : null}

        {feedback}

        {reminderDebug && remindersOn ? (
          <View style={styles.debugBox}>
            <Text style={styles.hint}>
              App clock: <Text style={styles.strong}>{reminderDebug.nowLabel}</Text> ({reminderDebug.timezone}) · Today:{' '}
              {reminderDebug.today}
            </Text>
            <Text style={styles.hint}>
              Pending: {reminderDebug.doseNotificationCount} dose · {reminderDebug.visitNotificationCount} visit ·{' '}
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
          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Developer tests</Text>
            <SecondaryButton
              label="Send test reminder in 15s"
              styles={styles}
              onPress={() => {
                void (async () => {
                  const result = await scheduleTestReminder(15);
                  if (result.ok) {
                    Alert.alert('Test scheduled', 'You should see an alert in about 15 seconds (Notification Center in the simulator).');
                  } else {
                    Alert.alert('Test failed', result.reason);
                  }
                })();
              }}
            />
            {user && remindersOn ? (
              <SecondaryButton
                label="Test next dose in 60s"
                styles={styles}
                onPress={() => {
                  void (async () => {
                    const result = await scheduleTestNextDoseReminder(user.id, 60);
                    if (result.ok) {
                      Alert.alert('Dose test scheduled', `Simulating your next dose (${result.label}) in 60 seconds.`);
                    } else {
                      Alert.alert('Dose test failed', result.reason);
                    }
                  })();
                }}
              />
            ) : null}
            {user && remindersOn ? (
              <SecondaryButton
                label="Test refill alert in 30s"
                styles={styles}
                onPress={() => {
                  void (async () => {
                    const result = await scheduleTestRefillReminder(user.id, 30);
                    if (result.ok) {
                      Alert.alert('Refill test scheduled', `Simulating a refill alert for ${result.label} in 30 seconds.`);
                    } else {
                      Alert.alert('Refill test failed', result.reason);
                    }
                  })();
                }}
              />
            ) : null}
          </View>
        ) : null}
      </SettingsSheet>

      <SettingsSheet visible={sheet === 'legal'} title="Privacy & terms" onClose={() => setSheet(null)}>
        <Text style={styles.hint}>
          Your health details are encrypted on your phone before they're saved, so only you can read them.
        </Text>
        <LegalLinks
          colors={colors}
          styles={{ legalRow: styles.legalRow, legalLink: styles.link, legalMuted: styles.legalMuted }}
        />
      </SettingsSheet>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function InfoLine({ label, value, styles }: { label: string; value: string; styles: Styles }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled, styles }: { label: string; onPress: () => void; disabled?: boolean; styles: Styles }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.primaryBtn, (disabled || pressed) && styles.btnDim]}
      disabled={disabled}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled, styles }: { label: string; onPress: () => void; disabled?: boolean; styles: Styles }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.secondaryBtn, (disabled || pressed) && styles.btnDim]}
      disabled={disabled}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
    >
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function OptionRow({
  label,
  hint,
  selected,
  onPress,
  styles,
  colors,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      style={[styles.option, selected && { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.08) }]}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={[styles.radio, selected && { borderColor: colors.accent }]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.optionLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20, paddingBottom: 48, gap: 22 },
    hero: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.lg },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    heroText: { flex: 1, gap: 2 },
    name: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
    email: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted },
    since: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
    editLink: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.accent },
    heroError: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.error },
    statRow: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radii.md, paddingVertical: 12 },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
    statValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
    statLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
    hint: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    field: { gap: 8 },
    fieldLabel: { fontFamily: fonts.bodySemibold, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textMuted },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: fonts.bodyRegular,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    infoCard: { backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: 14 },
    infoLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
    infoLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
    infoValue: { flexShrink: 1, fontFamily: fonts.bodyRegular, fontSize: 15, color: colors.textMuted },
    primaryBtn: { minHeight: 48, borderRadius: radii.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.onAccent },
    secondaryBtn: {
      minHeight: 46,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    secondaryBtnText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
    btnDim: { opacity: 0.6 },
    optionList: { gap: 8 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
    optionLabel: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
    switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radii.md, padding: 14 },
    switchLabel: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.text },
    link: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 15 },
    strong: { fontFamily: fonts.bodySemibold, color: colors.text },
    debugBox: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 4 },
    errorBanner: { backgroundColor: colors.errorBg, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.errorBorder },
    errorText: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: 14 },
    successBanner: { backgroundColor: colors.successBg, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.successBorder },
    successText: { color: colors.successText, fontFamily: fonts.bodyMedium, fontSize: 14 },
    footer: { alignItems: 'center', gap: 10, marginTop: 4 },
    deleteLink: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' },
    version: { fontFamily: fonts.bodyRegular, fontSize: 12, color: withAlpha(colors.textMuted, 0.7) },
    legalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
    legalMuted: { color: colors.textMuted, fontSize: 14 },
  });
}
