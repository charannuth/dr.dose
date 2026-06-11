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
