# Mobile production — TestFlight & App Store

Step-by-step guide to ship **Dr. Dose** on iOS using [EAS Build](https://docs.expo.dev/build/introduction/). Android follows the same EAS flow with `--platform android` once you add a Play Console listing.

**Prerequisites:** Apple Developer Program membership ($99/year), Expo account (free), Supabase project already used by web.

---

## Phase 1 — One-time setup

### 1. Apple Developer Program

1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/).
2. Note your **Team ID** (Membership → Team ID).
3. In [App Store Connect](https://appstoreconnect.apple.com), create an app:
   - **Platform:** iOS
   - **Name:** Dr. Dose
   - **Bundle ID:** `com.charannuth.drdose` (must match `mobile/app.json`)
   - **SKU:** e.g. `dr-dose-ios`
   - **Primary language:** English

### 2. Privacy policy URL (required)

App Store Connect requires a public privacy policy URL.

1. Deploy the web app to Vercel (see [DEPLOY.md](DEPLOY.md)) if not already live.
2. Confirm `https://YOUR-VERCEL-URL.vercel.app/privacy` loads (no sign-in required).
3. Use that URL in App Store Connect → App Information → **Privacy Policy URL**.

Terms (optional but recommended): `https://YOUR-VERCEL-URL.vercel.app/terms`

### 3. Supabase auth URLs (web + mobile)

In Supabase → **Authentication** → **URL configuration**, add:

| Setting | Value |
|---------|--------|
| **Site URL** | Your Vercel production URL |
| **Redirect URLs** | `http://localhost:5173/**` |
| | `https://YOUR-VERCEL-URL.vercel.app/**` |
| | `medicine-tracker://**` |

The `medicine-tracker://` scheme is used by the native app for password-reset deep links.

**Password policy (recommended):** Authentication → **Policies** → set minimum length **8** and require uppercase, number, and special character to match the app.

### 4. EAS project

From the repo root:

```bash
cd mobile
npm install
npx eas-cli login
npx eas-cli init
```

`eas init` links the project to Expo and writes `extra.eas.projectId` into `app.json`.

### 5. EAS secrets (Supabase)

Set the same values as `mobile/.env` — never commit real keys:

```bash
cd mobile
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxx.supabase.co"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_WEB_APP_URL --value "https://YOUR-VERCEL-URL.vercel.app"
```

`EXPO_PUBLIC_WEB_APP_URL` powers in-app links to Privacy / Terms on the hosted web pages.

---

## Phase 2 — TestFlight (internal testing)

### Build for iOS

```bash
cd mobile
npx eas-cli build --platform ios --profile preview
```

- First build: EAS prompts for Apple credentials and can create distribution certificates/profiles.
- **preview** profile → internal distribution (TestFlight internal testers, up to 100).

When the build finishes, submit to App Store Connect:

```bash
npx eas-cli submit --platform ios --profile production --latest
```

Or download the `.ipa` from the Expo dashboard and upload with Transporter.

### TestFlight

1. App Store Connect → your app → **TestFlight**.
2. Wait for Apple processing (~5–30 minutes).
3. Add **Internal Testing** group and invite testers by email.
4. Install **TestFlight** on iPhone → accept invite → install Dr. Dose.

**Test checklist:**

- [ ] Sign up with email + OTP + strong password
- [ ] Sign in / sign out
- [ ] Forgot password flow
- [ ] Add medication, mark dose, undo
- [ ] Local dose reminder (grant notification permission)
- [ ] Profile photo upload
- [ ] Privacy / Terms links open in Safari

---

## Phase 3 — App Store submission

### Production build

```bash
cd mobile
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production --latest
```

`production` uses `autoIncrement` for iOS build numbers.

### App Store Connect metadata

Prepare before submission:

| Field | Suggestion |
|-------|------------|
| **Subtitle** | Medication & dose tracker |
| **Description** | Personal medication organizer: log doses, streaks, wellness check-ins, drug safety checks, and optional health tracking. Not medical advice. |
| **Keywords** | medication,reminder,dose,pill,tracker,adherence |
| **Support URL** | GitHub repo or a simple contact page |
| **Privacy Policy URL** | `https://YOUR-VERCEL-URL.vercel.app/privacy` |
| **Category** | Medical or Health & Fitness |
| **Age rating** | 12+ (medical/treatment information) |
| **Screenshots** | 6.7" and 6.5" iPhone — Today, History, Account, Tracking |

### App Privacy (nutrition labels)

Declare data you collect (all linked to user, not used for tracking ads):

- **Contact info** — email (account)
- **Health** — medications, dose logs, wellness logs, medical records user enters
- **Photos** — profile picture (optional)
- **Identifiers** — user ID (Supabase)

Purpose: app functionality. No data sold to third parties.

### Export compliance

`ITSAppUsesNonExemptEncryption: false` in `app.json` claims the usual mass-market exemption (standard crypto for protecting user data / HTTPS). This does **not** disable the zero-access vault — PHI is still encrypted on-device before sync. Only set this to `true` if you file matching export-compliance documentation in App Store Connect and put the issued code in Info.plist.

### Review notes

Tell reviewers:

- Test account email/password you create for them, OR
- Sign-up flow uses email verification code (8 digits)
- App requires Supabase backend; demo account credentials in review notes

---

## Build profiles (`eas.json`)

| Profile | Use |
|---------|-----|
| `development` | Dev client + iOS Simulator |
| `preview` | TestFlight internal builds |
| `production` | App Store / TestFlight external |

---

## Local development vs store builds

| Task | Command |
|------|---------|
| JS-only changes | `npx expo start` + reload |
| Native plugin / permission change | `npx expo run:ios` or new EAS build |
| Store build | `eas build` (cloud) |

Local notifications only — no APNs push. The config plugin `plugins/withLocalNotificationsOnly.js` removes push entitlement so free Personal Team signing works for dev; **paid Apple Developer** builds use the same local-notification model.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails: missing env | Run `eas secret:create` for all `EXPO_PUBLIC_*` vars |
| Auth redirect error | Add `medicine-tracker://**` to Supabase redirect URLs |
| “Supabase is not configured” in TestFlight | Rebuild after setting EAS secrets |
| Privacy URL 404 | Deploy web with `/privacy` route; check Vercel SPA rewrites |
| Push capability signing error (local dev) | See [MOBILE.md](MOBILE.md) — Personal Team + config plugin |
| Duplicate bundle ID | Bundle ID must match App Store Connect exactly |

---

## Quick reference

```bash
cd mobile
npm run build:ios:preview    # TestFlight internal
npm run build:ios:production # App Store
npm run submit:ios           # Submit latest production build
```

See also: [MOBILE.md](MOBILE.md) (local dev), [DEPLOY.md](DEPLOY.md) (web/Vercel), [SUPABASE_SETUP.md](SUPABASE_SETUP.md) (auth templates).
