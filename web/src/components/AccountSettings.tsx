import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useVault } from '../hooks/useVault'
import {
  PASSWORD_REQUIREMENTS_HINT,
  validatePassword,
  validatePasswordMatch,
} from '../lib/passwordPolicy'
import { getLastReminderCheck, runReminderCheck } from '../lib/reminders'
import {
  canUseNotifications,
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../lib/notifications'
import { ProfilePictureEditor } from './ProfilePictureEditor'
import {
  getReminders,
  getSameTimeDoseMode,
  getTheme,
  getTimezone,
  setReminders,
  setSameTimeDoseMode,
  setTheme,
  setTimezone,
  SAME_TIME_DOSE_MODES,
  THEME_CHANGE_EVENT,
  type SameTimeDoseMode,
  type Theme,
} from '../lib/settings'

export function AccountSettings() {
  const { user, updateDisplayName, updatePassword } = useAuth()
  const vault = useVault()
  const [displayName, setDisplayName] = useState(
    () => (user?.user_metadata?.display_name as string) ?? '',
  )
  const [theme, setThemeState] = useState<Theme>(() => getTheme())
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmNextPassword, setConfirmNextPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)

  useEffect(() => {
    function onThemeChange(e: Event) {
      setThemeState((e as CustomEvent<Theme>).detail)
    }
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange)
  }, [])
  const [timezone, setTimezoneState] = useState(() => getTimezone())
  const [remindersOn, setRemindersOn] = useState(() => getReminders().enabled)
  const [sameTimeDoseMode, setSameTimeDoseModeState] = useState<SameTimeDoseMode>(() =>
    getSameTimeDoseMode(),
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reminderDebug, setReminderDebug] = useState(
    () => getLastReminderCheck(),
  )

  async function saveProfile() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await updateDisplayName(displayName)
      setMessage('Profile updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setBusy(false)
    }
  }

  async function savePassword() {
    setError(null)
    setMessage(null)
    const policy = validatePassword(nextPassword)
    if (!policy.ok) {
      setError(policy.message)
      return
    }
    const match = validatePasswordMatch(nextPassword, confirmNextPassword)
    if (!match.ok) {
      setError(match.message)
      return
    }
    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    setPasswordBusy(true)
    try {
      await vault.changePassphrase(currentPassword, nextPassword)
      await updatePassword(nextPassword)
      setCurrentPassword('')
      setNextPassword('')
      setConfirmNextPassword('')
      setMessage('Password updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setPasswordBusy(false)
    }
  }

  function handleThemeChange(next: Theme) {
    setThemeState(next)
    setTheme(next)
  }

  function handleTimezoneChange(tz: string) {
    setTimezoneState(tz)
    setTimezone(tz)
    setMessage('Timezone saved. “Today” uses this zone.')
  }

  async function toggleReminders(enabled: boolean) {
    setError(null)
    setMessage(null)
    if (enabled) {
      if (!isNotificationSupported()) {
        setError(
          'This browser does not support reminders. Try Chrome or Edge on desktop, or the mobile app later.',
        )
        return
      }
      const ok = await requestNotificationPermission()
      if (!ok) {
        setError(
          'Notifications are blocked. Click the lock icon in the address bar → Notifications → Allow, then try again.',
        )
        return
      }
    }
    setRemindersOn(enabled)
    setReminders({ enabled })
    if (enabled && user?.id) {
      const result = await runReminderCheck(user.id)
      setReminderDebug(result)
      setMessage(result.summary)
    } else if (enabled) {
      setMessage('Reminders on. Keep this tab open; alerts fire after each scheduled dose time.')
    } else {
      setMessage('Reminders off.')
      setReminderDebug(null)
    }
  }

  async function handleCheckRemindersNow() {
    if (!user?.id) return
    setError(null)
    setMessage(null)
    try {
      const result = await runReminderCheck(user.id)
      setReminderDebug(result)
      setMessage(result.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reminder check failed')
    }
  }

  const permission = getNotificationPermission()
  const permissionHint =
    permission === 'unsupported'
      ? 'Not supported in this browser.'
      : permission === 'granted'
        ? 'Allowed'
        : permission === 'denied'
          ? 'Blocked — change in browser site settings'
          : 'Not asked yet — turn on reminders to allow'

  const tzOptions = Intl.supportedValuesOf('timeZone')

  return (
    <section className="account-card account-settings">
      <h3 className="account-section-title">Settings</h3>

      <div className="account-settings-fields">
        <ProfilePictureEditor />

        <label className="account-field">
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          disabled={busy}
          onClick={() => void saveProfile()}
        >
          Save name
        </button>

        <fieldset className="account-field">
          <legend>Change password</legend>
          <p className="muted">{PASSWORD_REQUIREMENTS_HINT}</p>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
          />
          <input
            type="password"
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmNextPassword}
            onChange={(e) => setConfirmNextPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
          <button
            type="button"
            className="btn btn-secondary btn-block"
            disabled={passwordBusy}
            onClick={() => void savePassword()}
          >
            {passwordBusy ? 'Updating…' : 'Update password'}
          </button>
        </fieldset>

        <label className="account-field">
          Theme
          <select
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value as Theme)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="account-field">
          Timezone
          <select
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
          >
            {tzOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="account-field account-same-time-doses">
          <legend>Same-time doses on Today</legend>
          <p className="field-hint">
            When several medications share a dose time, choose how batch marking works. Each
            logged dose is identical to Mark taken on that medication.
          </p>
          {SAME_TIME_DOSE_MODES.map((opt) => (
            <label key={opt.value} className="account-field-radio">
              <input
                type="radio"
                name="same-time-dose-mode"
                value={opt.value}
                checked={sameTimeDoseMode === opt.value}
                onChange={() => {
                  setSameTimeDoseModeState(opt.value)
                  setSameTimeDoseMode(opt.value)
                }}
              />
              <span>
                <strong>{opt.label}</strong>
                <span className="field-hint"> — {opt.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="account-field account-field-checkbox">
          <input
            type="checkbox"
            checked={remindersOn}
            onChange={(e) => void toggleReminders(e.target.checked)}
          />
          <span>
            Browser reminders (while app is open)
            {!canUseNotifications() && remindersOn && (
              <span className="field-hint"> — permission required</span>
            )}
          </span>
        </label>

        <p className="field-hint account-notification-status">
          Notification permission: <strong>{permissionHint}</strong>
        </p>

        {remindersOn && (
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => void handleCheckRemindersNow()}
          >
            Check dose reminders now
          </button>
        )}

        {reminderDebug && remindersOn && (
          <div className="reminder-debug">
            <p>
              App clock: <strong>{reminderDebug.nowLabel}</strong> ({reminderDebug.timezone}
              ) · Today: {reminderDebug.today}
            </p>
            {reminderDebug.slots.length === 0 ? (
              <p className="field-hint">No dose slots for today.</p>
            ) : (
              <ul>
                {reminderDebug.slots.map((slot) => (
                  <li key={`${slot.medicationName}-${slot.scheduleTime}`}>
                    <strong>{slot.medicationName}</strong> {slot.scheduleLabel}
                    {slot.taken
                      ? ' — taken'
                      : slot.notifiedNow
                        ? ' — reminder sent'
                        : slot.skipReason
                          ? ` — ${slot.skipReason}`
                          : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="field-hint">
          Dose reminders fire after each scheduled time passes (if not marked taken). On Mac,
          switch to another app or check Notification Center if no banner appears. Use{' '}
          <strong>Check dose reminders now</strong> to verify your schedule.
        </p>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
      </div>
    </section>
  )
}
