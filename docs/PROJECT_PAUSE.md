# Dr. Dose — project paused (resume guide)

Last updated: **May 29, 2026**  
Code on GitHub: **up to date** (`main` @ `8743fee`)

Use this doc when you return to finish TestFlight / App Store shipping.

---

## What’s done

- **Web app** live at `https://medicine-tracker-one-eta.vercel.app` (privacy/terms routes included)
- **Mobile code** fixed for production: React pin, `expo-modules-core` override, drawer nav, display name updates, splash/boot screen
- **GitHub** `https://github.com/charannuth/dr.dose` — working tree clean, pushed
- **Apple Developer** enrolled; signing on EAS
- **App Store Connect** app created (Dr. Dose, bundle `com.charannuth.drdose`, app ID `6780679549`)
- **EAS project** `@charannuth/dr-dose`; production env vars set on Expo (Supabase + web URL)
- **Build 11** uploaded to ASC via Transporter — **do not ship** (launch crash; pre-fix build)
- **Builds 12–14** canceled; no active EAS queue

---

## What’s left (in order)

1. Check [Expo status](https://status.expo.dev) — wait until EAS Build is healthy (NPM install issues were causing failures/cancels).
2. From a fresh clone or this repo:
   ```bash
   cd mobile
   cp ~/Documents/dr-dose-backup/mobile.env .env   # or recreate from EAS secrets
   npm ci
   npm run build:ios:production
   ```
3. Download `.ipa` from [expo.dev](https://expo.dev) build page (Application Archive URL). **Do not** rely on `eas submit` — it was stuck for hours; use **Transporter** instead.
4. Test on **TestFlight**: app opens (no black screen / crash), `≡` drawer works, login, display name updates.
5. App Store Connect → version **1.0.0** → attach new build → finish metadata → submit for review.

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
| 12–14 | Canceled | Pre-fix or user canceled |
| **15+** | **Not started** | First build with all fixes in `8743fee` |

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
