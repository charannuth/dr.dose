# Mobile app (Expo)

The app lives in `mobile/`. It uses **Expo SDK 56** and **Expo Router** (file-based routes under `mobile/app/`). It shares the same Supabase project as the web app (`web/`).

## Run on iOS Simulator (recommended)

Expo Go on a physical device must match the SDK; if your Expo Go is outdated, use a **development build** in the Simulator instead of scanning a QR code.

```bash
cd mobile
npm install
npx expo start
```

In another terminal (or press `i` in the Expo CLI), open the simulator:

```bash
npx expo run:ios
```

`expo run:ios` builds a native dev client when `ios/` is missing or out of date. For **JavaScript-only** changes (screens, theme, Supabase logic), Metro reload is enough — no rebuild required.

## Run on a physical iPhone

You need a **dev build** installed (same `expo run:ios` with a device selected in Xcode, or EAS Build), not an old Expo Go client, unless Expo Go matches SDK 56.

### Free Apple ID (Personal Team) and signing

Dose reminders are **local notifications** only. A free Personal Team cannot use the **Push Notifications** capability (remote APNs). The repo config plugin `plugins/withLocalNotificationsOnly.js` strips `aps-environment` so Xcode can sign the app.

If Xcode still shows Push Notifications under **Signing & Capabilities**, remove it with the **−** button, set **Bundle Identifier** to `com.charannuth.drdose`, then run:

```bash
cd mobile
npx expo prebuild --clean --platform ios
open ios/mobile.xcworkspace
```

## Environment variables (Supabase)

Copy `mobile/.env.example` to `mobile/.env` and use the same project URL and anon key as the web app (`VITE_*` → `EXPO_PUBLIC_*`):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Restart Metro with `npx expo start --clear` after changing env vars.

## When you need a native rebuild

Rebuild (`npx expo run:ios`) only after:

- Adding or changing **native** packages (e.g. `expo-image-picker`, `expo-notifications`)
- Changing `app.json` plugins, bundle ID, or permissions
- First-time `ios/` generation

You do **not** need a rebuild for UI/theme work, new screens, or Supabase-only features.

If you see `AsyncStorageError: Native module is null` or `Cannot find native module 'ExponentImagePicker'`, run `npx expo run:ios` (not an outdated Expo Go build).

## Theme (light / dark / system)

**Account → Appearance** offers **Light**, **Dark**, and **System** (follows the device). The choice is stored in AsyncStorage and applied app-wide via `ThemeProvider` (`context/ThemeProvider.tsx`).

- Palette tokens live in `constants/theme.ts` (`lightColors` / `darkColors`).
- Screens and components should use `useTheme().colors` or `useThemedStyles(makeStyles)` — not the deprecated static `colors` export.
- Tracking panels share `useTrackingStyles()` from `components/tracking/trackingStyles.ts`.

Status bar style tracks the resolved theme (light content on dark backgrounds).

## Navigation

| Area | Route group | Notes |
|------|-------------|--------|
| Auth | `/(auth)/login` | Email/password, sign-up OTP, forgot password |
| Main shell | `/(drawer)/` | Hamburger menu: Today, History, Wellness, Streaks, Tracking, Medical records, Drug safety, Help, Account |
| Tabs (legacy) | `/(tabs)/` | Today, History, Tracking, Account — same features; drawer is the primary shell |
| Modals | `/(modals)/medications/` | Add / edit medication wizard |

Deep linking: `app.json` sets `scheme` to `medicine-tracker` (`medicine-tracker://`).

## Feature parity (vs web)

| Feature | Mobile |
|---------|--------|
| Today — mark doses, PRN log, banners | Yes |
| History — calendar, day detail, wellness | Yes |
| Tracking — cycle, HRT, weight, med progress, physical profile | Yes |
| Wellness — check-in, trends, baseline, briefings, export | Yes |
| Streaks — calendar, tulip badges, 7-day SVG celebration | Yes |
| Medical records | Yes |
| Drug safety / interactions | Yes |
| Account — profile, medications, timezone, **theme**, local dose reminders | Yes |
| Medication wizard — RxNorm name search + local brands | Yes |
| Help & safety | Yes |

## Project layout

| Path | Role |
|------|------|
| `app/_layout.tsx` | Root stack, `ThemeProvider`, auth gate |
| `app/(drawer)/` | Drawer navigator (main app) |
| `app/(modals)/` | Medication add/edit modals |
| `context/ThemeProvider.tsx` | Light/dark/system theme |
| `hooks/useThemedStyles.ts` | Theme-aware StyleSheet helper |
| `lib/` | Supabase, doses, streaks, tracking, RxNorm, etc. |
| `babel.config.js` | `expo-router/babel` plugin (required) |
| `package.json` `main` | `expo-router/entry` |

After changing native config or plugins, run `npx expo prebuild` (or `expo run:ios`, which prebuilds when needed) so `ios/` / `android/` stay in sync.

## Production (TestFlight / App Store)

See **[MOBILE_PRODUCTION.md](../docs/MOBILE_PRODUCTION.md)** for EAS Build, Apple Developer setup, App Store Connect metadata, and Supabase redirect URLs for the native app.

## Doctor visits calendar and calendar copies

Doctor visits uses a month grid with event pills, a month agenda toggle, previous/next
month controls, Today, and a fixed top-right + button for the selected date. Select a
day, then tap + to open the separate New appointment screen. The calendar only shows a
short agenda below the grid; tap a saved visit (or follow-up) to edit the original
appointment. Returning refreshes the calendar. Other tracking calendars keep their existing views.

Doctor visits also offers 1-, 3-, 6-, and 12-month ranges. Multi-month views start with
the anchor month and show upcoming months; arrows page backward/forward by the selected
range, and Today returns to the current month. Grid and List both cover the full range.
Selecting a day inside the range preserves the visible months; + uses that selected day.

The appointment screen uses inset grouped fields, a compact type selector and a native
time picker. Save persists the appointment and any visit notes together. After saving,
calendar-copy options appear; Done returns to the calendar. Leaving unsaved edits prompts
before discarding, and failed saves keep the draft. Notes are available on or after the
appointment day. Existing notes remain intact when editing future appointments.

After saving an appointment, expand **Add to another calendar**. Apple/device calendar
opens the system event editor so the user can choose a calendar account on the phone.
Google, Outlook Personal, and Microsoft 365 open an HTTPS event composer (with provider
sign-in when required). The user must finish saving there. A web link opening does not
mean an event was saved, and canceling does not remove the Dr. Dose appointment.

This is an optional copy, not account linking or two-way synchronization. Edits and
removals must be made in both apps; adding again can create duplicates. Calendar copies
contain the provider name, date/time, and location, excluding clinical notes and reason.
Timed copies use the app's configured timezone and a selectable 30/60/90/120-minute
duration; appointments without times become all-day events.

**Native rebuild required:** `expo-calendar` was added. Existing development binaries
still load the screen and web links but show an explanatory message for the native
calendar action. Build and install an updated development client with
`npx eas build --platform ios --profile development` (or `npx expo run:ios --device` for
local signing), then reconnect to Metro. Expo Go does not support this module.
The native editor uses `expo-calendar/legacy` and does not request calendar read access.
See the [Expo Calendar reference](https://docs.expo.dev/versions/v56.0.0/sdk/calendar/).

Verification:

- `cd mobile && npx tsc --noEmit`
- `cd mobile && node --test tests/appointmentCalendar.test.cjs`
- On device, test month navigation, adding/editing visits, cancel/save in the native
  editor, an iCloud calendar and a Google/Exchange account added to iOS, and each web
  provider while signed in and signed out. Confirm the event's timezone and date.

## Customizable Quick view widgets

On Today, choose **Quick view → Edit** (or long-press a widget). The gallery has
17 widget types covering medications, progress, wellness, visits, available trackers,
medical records, and useful shortcuts. Add any number of instances, choose square or
expanded sizes, and use either the adaptive grid or a single column. Expanded widgets
show extra information. Adding a tracker widget does not silently enable that tracker.

The live preview supports hold-and-drag reordering. Tap a card to select it, then use
the pinned Compact/Detailed selector or Remove action above the preview. Detailed cards
show extra information alongside the summary when space permits, including medication-level
dose progress and a weekly status breakdown. The list below the
preview also offers accessible earlier/later controls, including moves beyond the visible
preview area. Save applies the layout; Cancel discards it. Layouts are stored per account
on the device, with no medical content persisted in the layout preferences.

Widget position/size changes use short, non-overshooting timing transitions, with
UI-thread gesture transforms and no zoom or lift effect. Reordering requires moving
inside a neighboring card and allows the previous transition to finish before reordering
again. The editor pauses scrolling during a drag;
release to scroll further, or use earlier/later controls. Reduce Motion disables layout
and settling animations. Large text and narrow screens switch to a single column. Live
summaries are loaded only for selected widget types and refresh on focus/pull-to-refresh;
existing values remain visible while reloading and are frozen during dragging.

Run `node --test mobile/tests/*.test.cjs` from the repo root for calendar and dashboard
configuration/reordering tests. Type-check with `npx tsc --noEmit` from `mobile/`.
On-device QA: add/remove/resize mixed widgets, drag across rows, Save and restart,
Cancel edits, switch accounts, and test VoiceOver, Reduce Motion, and larger text.

## Shared tracking calendar layout

All calendars in the Tracking pathway use `components/tracking/TrackingCalendar.tsx`:
cycle, HRT, weight, medication progress, and the combined overview. New calendar sources
should supply `TrackingCalendarData` and register with `calendarSources`, reusing this
component rather than adding their own calendar UI.

The shared view uses an open grid with week separators, a prominent month heading,
compact range/source menus, Today, and a collapsed Calendar key. Status colors appear as
small bands and event labels; predicted periods retain dashed indicators. Today and the
selected date remain distinct. Select a day to read full event labels below the grid and
use the tracker panel. Day, four-day, week, and multi-month ranges remain available;
multi-month layouts use full-width months to keep dates readable and tappable on phones.
The 3-, 6-, and 12-month views start with the anchor month and extend forward. Previous
and next arrows page through adjacent blocks of that length; Today restores the current
month as the start of the upcoming window.
Selecting a day within the visible range retains the current range without refetching it.

Device QA: switch between every enabled source and range, select dates, return to Today,
expand the key, and check logged/predicted cycle days, HRT dose/journal entries, and
medication statuses. Check light/dark mode and large text; confirm full event details are
readable even when grid labels truncate. Planned calendar sources remain disabled.

## Wellness overview and entry screens

Wellness uses the shared tracking calendar and its range navigation. Select a date and
use the header + or the day summary to add/edit that day's single check-in. Future days
remain browsable but cannot be logged early. Saved entries appear on the calendar; note
text is kept out of calendar pills. Returning from an editor refreshes the baseline,
calendar, trends, and report data.

Baseline editing and daily logging now live in separate stack screens using
`components/forms/EntryEditorScreen.tsx`. It provides loading/retry, header Save/Cancel,
keyboard handling, duplicate-save protection, and unsaved-change confirmation. Failed
saves retain the draft. Reusable grouped form styles also serve the appointment editor.
Both wellness editors use collapsible sections; sleep/energy ratings are tap controls,
and baseline times use the native picker. Existing per-account encrypted persistence
and one-log-per-date upserts are unchanged. Daily validation is shared with quick check-ins.

The overview keeps trends/PRN insights, doctor report export, medication guidance, and
sources in collapsible sections, with a compact disclaimer still visible. Device QA:
create a past-day entry, reopen/edit it, cancel changes, change baseline symptoms, and
confirm the calendar and report refresh after Save. Check keyboard, large text, and
screen-reader labels. No native rebuild is required.

## Refill management

Both the Today refill banner and Quick view refill widget open `/(modals)/refills`.
The page lists current medications with low supply first. Select one to set the total
remaining count, increment/decrement it, add a refill quantity, or turn supply tracking
off. A collapsed details section edits name, strength, and notes. Header Save applies
changes; Cancel protects unsaved edits. Inventory uses the medication's existing units.

The refill write is account-scoped, encrypts text fields, and updates only those details
and `pills_remaining`. It does not reconcile schedules or dose logs. A conditional update
checks the original supply and timestamp to avoid overwriting a dose or edit made while
the page was open. Saving reschedules reminders; list and Today refresh on return.
Existing global reminder preferences and the threshold of 7 remain in effect.

Device QA: open both refill entry points, add supply, correct a count to zero, disable
tracking, cancel edits, and check that logged doses still deduct supply. Test a concurrent
dose log while the editor is open and verify the stale-save message instead of an overwrite.
