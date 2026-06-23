# Dr. Dose — project paused (resume guide)

Last updated: **June 23, 2026, 4:19 PM ET**  
Code on GitHub: **up to date** (`main`)

Use this doc when you return to finish App Store shipping (or after the Mac wipe).

---

## Current status: build 17 SUBMITTED — 🟡 Waiting for Review

- **Build 17** (final icon + keyboard/dosage focus fix) is uploaded and the **1.0.0 version is "Waiting for Review"** in App Store Connect — confirmed via the version page status badge on June 23, 2026.
- Nothing left to do but wait for Apple. Typical review is **~24–48h**; emails arrive at each status change (In Review → Approved → Ready for Sale / Pending Developer Release).
- **Build 16** was the first fully-working TestFlight build; **build 17** added the production app icon (fixed App Store rejection 2.3.8) and the dosage-step keyboard focus fix.

### If Apple approves
- With auto-release, it goes live shortly after approval. If manual release was chosen, click **Release** on the version page.

### If Apple rejects
- Read the rejection in **App Review** / Resolution Center, fix, then rebuild + resubmit (see cheat sheet). Demo account must work: `testuser.drdose@gmail.com` / `TestUser@123`.

---

## What’s done

- **Web app** live at `https://medicine-tracker-one-eta.vercel.app` (privacy/terms routes included)
- **Mobile code** fixed for production: React pin, `expo-modules-core` override, drawer nav, display name updates, splash/boot screen
- **GitHub** `https://github.com/charannuth/dr.dose` — working tree clean, pushed (`main` @ `39a1a3e`)
- **Apple Developer** enrolled; signing on EAS (cert + profile valid through Jun 15, 2027)
- **App Store Connect** app created (Dr. Dose, bundle `com.charannuth.drdose`, app ID `6780679549`)
- **EAS project** `@charannuth/dr-dose`; production env vars set on Expo (Supabase + web URL)
- **`eas submit` now automated** — `mobile/eas.json` has `submit.production.ios.ascAppId = 6780679549`; EAS already holds an App Store Connect API key, so `eas submit` works non-interactively (no Transporter needed anymore).
- **Build 16 submitted to ASC** and confirmed live on TestFlight.
- **App Store metadata** set: subtitle, description, keywords, support URL, category (Health & Fitness + Lifestyle), age rating 12+, App Privacy (Email/Health/Photos/User ID, linked, no tracking), content rights (no third-party), DSA = not a trader (excludes EU), pricing = Free, export compliance auto-cleared (`ITSAppUsesNonExemptEncryption: false`).
- **App Review demo account:** `testuser.drdose@gmail.com` / `TestUser@123`
- **Screenshots:** iPhone 6.9" set uploaded; iPad 13" captured from local simulator (2064×2752).

---

## What’s left (in order)

1. **Wait for Apple review** (~24–48h). Watch email / the 1.0.0 status badge.
2. On approval: confirm it goes "Ready for Sale" (auto-release) or click **Release** (manual).
3. **After launch (1.0.1):** do an iPad layout pass — constrain content screens to a centered max-width (~700px) so cards/inputs/buttons don't stretch full-width on iPad. Login + modals already look good; content screens (My account, Today, Add medication) look stretched. Then cloud rebuild + submit as 1.0.1.

### Re-build from scratch if needed (e.g. after Mac wipe)
```bash
cd mobile
cp ~/Documents/dr-dose-backup/mobile.env .env   # restore secrets (NOT in git)
npm ci
npx eas-cli login
npm run build:ios:production    # cloud build, autoincrements build number
npm run submit:ios              # eas submit, now fully automated via ascAppId
```

---

## Accounts & IDs

| Item | Value |
|------|--------|
| GitHub | `charannuth/dr.dose` |
| Expo account | `charannuth` |
| EAS slug | `dr-dose` |
| Bundle ID | `com.charannuth.drdose` |
| App Store Connect app ID | `6780679549` |
| Supabase project | `zobosleiymqggwtaklch` |
| Web production | `https://medicine-tracker-one-eta.vercel.app` |
| Deep link scheme | `medicine-tracker://` |

---

## Secrets (not in Git)

- **`mobile/.env`** — local dev only; backup copy: `~/Documents/dr-dose-backup/mobile.env`
- **EAS production** — same `EXPO_PUBLIC_*` vars already on Expo servers for cloud builds
- Save before wiping Mac: `.env` backup, Apple ID + 2FA, Expo login, App Store Connect access

---

## Build history (iOS)

| Build | Status | Notes |
|-------|--------|--------|
| 9 | Finished | Black screen (React version mismatch) |
| 10 | Errored | `npm ci` peer deps |
| 11 | Finished + ASC | Crashes on launch (`expo-modules-core` ABI); no drawer fix |
| 12–14 | Canceled | Stuck in queue during Expo NPM-cache outage (Jun 16) |
| 15 | Not created | buildNumber bumped to 15 then upload blocked by sandbox; re-ran as 16 |
| 16 | Finished + ASC + TestFlight ✅ | First build with all fixes; verified working on real iPhone; commit `c006cf2` |
| **17** | **Finished + ASC + Submitted ✅** | Final app icon (fixes 2.3.8) + dosage keyboard focus fix; 1.0.0 Waiting for Review (Jun 23) |

---

## Key fixes in latest code (`8743fee`)

- `react@19.2.3` + overrides for `react`, `react-dom`, `expo-modules-core@56.0.17`
- `mobile/.npmrc` → `legacy-peer-deps=true`
- Drawer restored in `mobile/app/(drawer)/_layout.tsx`
- Session clone + immediate profile update in `mobile/context/AuthProvider.tsx`

---

## Commands cheat sheet

```bash
cd mobile
npm ci
npm run build:ios:production          # build only — wait for Expo health
npx eas-cli build:view <BUILD_ID>     # status
# Upload .ipa with Transporter (not npm run submit:ios)
```

---

## Docs

- [MOBILE_PRODUCTION.md](MOBILE_PRODUCTION.md) — full TestFlight / App Store guide
- [MOBILE.md](MOBILE.md) — local dev
- [DEPLOY.md](DEPLOY.md) — web / Vercel

---

## After Mac wipe — restore

```bash
git clone https://github.com/charannuth/dr.dose.git medicine-tracker
cd medicine-tracker/mobile
cp ~/Documents/dr-dose-backup/mobile.env .env
npm ci
npx eas-cli login
```

EAS retains signing credentials and project env vars; no need to re-run `eas init` if `app.json` already has `projectId`.
