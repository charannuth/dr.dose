# Dr. Dose on Android

The Expo app in `mobile/` already runs on Android: reminders use Android
notification channels, the time picker and photo picker have Android paths,
and the encrypted vault uses `expo-secure-store` (Android Keystore). This page
covers what is configured and what still has to be done by hand to ship on
Google Play.

## What is configured

| Item | Value |
| --- | --- |
| Package name (`android.package`) | `com.drdose.app` (matches the iOS bundle ID) |
| Version | `expo.version` is shared with iOS; `android.versionCode` is bumped by the `production` profile (`autoIncrement`) |
| Preview / development builds | `.apk`, installable directly on a phone |
| Production build | `.aab` (App Bundle) for Google Play |
| Submit | `eas submit` to the **internal** testing track as a **draft** release |
| Permissions removed | `RECORD_AUDIO` (unused; Play asks you to justify it), `SYSTEM_ALERT_WINDOW` |
| Permissions added | `SCHEDULE_EXACT_ALARM`, so dose alarms fire on time instead of being batched |
| Dark mode | `expo-system-ui` installed so `userInterfaceStyle: automatic` works on Android |

> The package name can never change once an app is uploaded to Google Play.
> Decide it before the first upload.

## Commands (run in `mobile/`)

```bash
npm run build:android:preview      # APK for testing on your own phone
npm run build:android:production   # AAB for Google Play
npm run submit:android             # upload the latest AAB to the internal track
npx expo run:android               # local build on an emulator or USB device (needs Android Studio)
```

EAS creates and stores the Android upload keystore on the first build. Answer
"yes" when it asks to generate one.

## What you have to do by hand

1. **Google Play Console account.** Sign up at
   <https://play.google.com/console/signup> (one-time $25 fee). Personal
   accounts created after Nov 2023 must run a **closed test with at least 12
   testers for 14 days** before they can publish to production.
2. **Create the app** in Play Console (name "Dr. Dose", app, free).
3. **Build the AAB:** `npm run build:android:production`.
4. **Upload the first AAB by hand.** Google requires the very first upload to
   go through the Play Console website (Testing → Internal testing → Create
   release). `eas submit` only works after that.
5. **Service account for `eas submit`.** Follow
   <https://docs.expo.dev/submit/android/> to create a Google Cloud service
   account with Play access, download its JSON key, and save it as
   `mobile/google-play-service-account.json` (git-ignored), or upload it to
   EAS with `eas credentials`.
6. **Store listing and policy forms:** short and full description,
   screenshots (phone at least), 512×512 icon, 1024×500 feature graphic,
   privacy policy URL, Data safety form, content rating questionnaire, target
   audience, and the **Health apps** declaration (medication reminders count).
7. **Exact alarms.** On Android 14+ `SCHEDULE_EXACT_ALARM` is off by default
   for new installs; testers can turn it on under Settings → Apps → Dr. Dose →
   Alarms & reminders. An in-app prompt is a planned follow-up.

## Android gaps compared with iOS

| Feature | iOS | Android today |
| --- | --- | --- |
| Snooze Lock Screen card (Live Activity) | Yes | Not shown; snoozed reminders still fire as notifications |
| Home screen widget | Live Activity only | None |
| "Update available" banner | App Store lookup | Skipped (could use Play in-app updates) |
| Vault and recovery phrase | Keychain | Android Keystore via `expo-secure-store`; same recovery phrase |
| Dose alarms | Time Sensitive notifications | Max-priority "Dose alarms" channel, sticky until taken or snoozed |
| Label scanning (ML Kit OCR) | Yes | Yes |
| Add to calendar | Apple Calendar | Device calendar (Google Calendar) |
