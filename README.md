# Dr. Dose

A personal web app to manage medications, log daily doses, track adherence streaks, and check for known drug interactions. Built for private use (you and family) with cloud sync via Supabase.

> **Development log** (below) records what shipped each session. It updates automatically on every commit when [git hooks are installed](#development-log). Feature docs follow for reference.

## Development log

Newest first. Each line is added from the commit subject when you commit (with hooks enabled).

<!-- DEVLOG:START -->
- **2026-06-10** (`ee4649b`) — Add iOS production setup, EAS config, and legal pages.

- **2026-06-10** (`9014af3`) — Add signup password requirements and refine demo tour pointers.

- **2026-06-10** (`61049ee`) — Add mobile demo tour and signup rate-limit hint parity.

- **2026-06-10** (`9ac747e`) — Add web demo tour, signup UX fixes, and ESLint CI repair.

- **2026-06-03** (`22d17bf`) — Scale celebration bouquet tulips by streak milestone tier.

- **2026-06-03** (`c99b86e`) — Replay streak badge bloom on dose mark and undo.

- **2026-06-03** (`f1e1e15`) — Fix web streak badges updating at each milestone tier.

- **2026-05-29** (`4b74454`) — Add mobile doctor visits, local reminders, streak parity, and profile photos.

- **2026-05-29** (`34d135c`) — Add doctor visits calendar UI with split appointment and notes panels.

- **2026-05-29** (`bcacf8c`) — Add doctor visits tracking and daily streak bloom celebration on Today.

- **2026-05-29** (`8dd9958`) — Fix web streak badge animations and tiered Today badge display.

- **2026-05-27** (`166f195`) — Fix mobile 7-day streak tulip celebration animation

- **2026-05-27** (`2d65efb`) — Bring mobile app to full web parity with themed UI.

- **2026-05-27** (`1754395`) — Add Expo mobile app with web feature parity.

- **2026-05-26** (`009b8b5`) — Show missed doses on the med progress calendar.

- **2026-05-26** (`10dd8e1`) — Adjust med calendar labels for future dates.

- **2026-05-26** (`f42baa3`) — Add birds-eye tracking calendar with detailed day breakdowns.

- **2026-05-26** (`a7dcf06`) — Celebrate 7-day streaks with dual tulips and in-scene butterfly animation.

- **2026-05-26** (`04ed47b`) — Fix tracker tab/calendar source sync.

- **2026-05-26** (`8bd01e2`) — Show saved profile summary with Edit button.

- **2026-05-26** (`f767724`) — Improve weight plan form layout and calorie target display.

- **2026-05-26** (`b913b04`) — Document weight + HRT migrations

- **2026-05-26** (`3c4fd87`) — Add weight and HRT tracking calendars

- **2026-05-25** (`c55d718`) — Document full web app guide, migrations audit, and updated roadmap.

- **2026-05-25** (`c05f28a`) — Fix cycle calendar predictions and lock future-day logging.

- **2026-05-25** (`67cb786`) — Add Today button to cycle day logging strip.

- **2026-05-25** (`e8add4c`) — Add editable period end dates and database-backed body metric units.

- **2026-05-25** (`1134877`) — Add unified tracking calendar with adjustable ranges and tracker sources.

- **2026-05-25** (`31fd90f`) — Improve cycle tracking UX, predictions, and per-cycle length learning.

- **2026-05-25** (`a313f2c`) — Add menstrual cycle calendar with phases, predictions, and daily logs.

- **2026-05-25** (`53dced2`) — Add oral PRN amount dropdown with 1–10 and custom entry.

- **2026-05-25** (`33c7484`) — Add PRN dose check-ins, flexible dosing, and wellness trend insights.

- **2026-05-24** (`551f9c0`) — Add daily vs as-needed meds, profile stats, and Tracking hub.

- **2026-05-24** (`2001cdb`) — Keep the top navbar visible while scrolling.

- **2026-05-24** (`187ddba`) — Add drug name autocomplete to the interactions safety check.

- **2026-05-24** (`9a6eec6`) — Style minor interaction cards with a distinct blue tint.

- **2026-05-24** (`e13b145`) — Add minor albuterol and montelukast pairs and tidy beta-blocker warnings.

- **2026-05-23** (`e3fd93f`) — Fix drug interaction checks and polish streaks and mobile nav.

- **2026-05-23** (`4a2108c`) — Add streaks, medical records, history calendar, and maroon branding.

- **2026-05-23** (`6ec5c1d`) — Add streak celebrations, profile photos, and UI polish for deploy.

- **2026-05-23** (`f94e121`) — Add README development log with auto-update git hooks.

- **2026-05-23** (`17c3ebb`) — Update README for Dr. Dose rebrand and current features.

- **2026-05-23** (`e2d0257`) — Add in-app reminder banner and service worker notifications.

- **2026-05-23** (`40a9399`) — Show doctor report in-app instead of relying on pop-ups.

- **2026-05-23** (`73c10d6`) — Add wellness tracking with trends, med briefings, and doctor report.

- **2026-05-23** (`978fad8`) — Simplify medication name placeholder and hints.

- **2026-05-23** (`6429d6f`) — Fix ESLint errors so CI passes on push.

- **2026-05-23** (`6dc3007`) — Prioritize brand names in medication search with local list and RxNorm cleanup.

- **2026-05-23** (`f497651`) — Add RxNorm live search for medication name autocomplete.

- **2026-05-23** (`29f04c0`) — Add responsive layouts and mobile-friendly medication search.

- **2026-05-23** (`a7d16c4`) — Improve mobile dose time entry with mask and native picker.

- **2026-05-23** (`f0ce06c`) — Rebrand to Dr. Dose and add email OTP verification.

- **2026-05-23** (`00a3402`) — Point Vercel Git builds at the web app root directory.

- **2026-05-23** (`3b4b0d6`) — Add multi-step medication wizard, safety review, and UX fixes.

- **2026-05-23** (`68ba6d7`) — Move Vercel config to web/ and add deploy documentation.

- **2026-05-23** (`691829f`) — Add Medicine Tracker web v1 with Supabase backend.

- **2026-05-23** (`65835bf`) — Add repository scaffold for Medicine Tracker. README, roadmap, license, contributor docs, issue/PR templates, and CI skeleton.

<!-- DEVLOG:END -->

---

## Vision

Dr. Dose aims to be the central hub between patients, pharmacies, and healthcare providers — making it simple to know what to take, when to take it, and when to refill, while reducing accidental double-dosing.

## Current status

**Web v1** — in active use for daily adherence, wellness, safety checks, and optional health tracking (cycle, med progress). React + Vite frontend, Supabase Auth + PostgreSQL backend, deployed on Vercel.

| Target | Status |
|--------|--------|
| Web (v1) | **Available** (`web/`) — [deploy guide](docs/DEPLOY.md) |
| Database | Migrations **002–016** — see [docs/MIGRATIONS.md](docs/MIGRATIONS.md) |
| iOS / Android | In progress — [mobile production guide](docs/MOBILE_PRODUCTION.md) |
| Pharmacy integrations | Long-term |

**Stack:** [React](https://react.dev) · [Vite](https://vite.dev) · [Supabase](https://supabase.com) (Auth + PostgreSQL + Storage) · [RxNorm](https://www.nlm.nih.gov/research/umls/rxnorm/index.html) (drug name lookup)

### Documentation map

| Doc | Audience |
|-----|----------|
| **[docs/WEB_APP.md](docs/WEB_APP.md)** | **Complete web app guide** — every page, route, and feature |
| [docs/MIGRATIONS.md](docs/MIGRATIONS.md) | Database migrations 002–016 + verify SQL |
| [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) | Auth, env vars, first-time setup |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Vercel deploy |
| [docs/MOBILE_PRODUCTION.md](docs/MOBILE_PRODUCTION.md) | iOS TestFlight & App Store (EAS) |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Shipped vs planned (**including native mobile**) |

---

## Web app — pages

| Route | Page |
|-------|------|
| `/` | Today — doses, PRN, banners, wellness check-in |
| `/history` | History — calendar + dose list |
| `/wellness` | Wellness — logs, trends, doctor report |
| `/tracking` | Tracking — cycle, med progress, physical profile |
| `/account` | My account — meds list, settings, streak summary |
| `/streaks` | Streaks — badges and consistency calendar |
| `/interactions` | Drug safety check |
| `/medical-records` | Medical records |
| `/help` | Help & safety |

Full behavior per page: **[docs/WEB_APP.md](docs/WEB_APP.md)**.

---

## Features (summary)

The tables below summarize shipped web functionality. For exhaustive detail (PRN flow, cycle calendar, streak rules, reminders limits, etc.), use the [web app guide](docs/WEB_APP.md).

### Authentication

| Feature | Description |
|---------|-------------|
| **Email sign up / sign in** | Sign up with email + password, then **8-digit email verification**; sign in is password-only. |
| **Forgot password** | Email verification code → set new password (same OTP flow as sign up). |
| **Sign out** | From profile menu or Account page. |
| **Config guard** | App shows setup instructions if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing. |

### Today (home)

The main dashboard for logging doses.

| Feature | Description |
|---------|-------------|
| **Medication list** | All medications **active today** (respects start/end dates). |
| **Per-dose logging** | Each scheduled time is its own row — e.g. morning and evening are two separate “Mark taken” actions. |
| **Double-dose prevention** | Database enforces one log per medication + calendar day + schedule time. |
| **Undo** | Remove today’s log for a specific dose slot; pill count is restored if tracked. |
| **Daily summary** | “X of Y doses taken” for the current day. |
| **Scheduled / PRN tabs** | Separate lists; Add medication respects active tab. |
| **Add / edit / delete** | Full medication form from header “Add medication” or card actions. |
| **Schedule type switch** | Move med between scheduled and as-needed from Today. |
| **Streak snippet** | Short line linking current streak status to Account. |
| **Refill banner** | Warns when any medication has ≤ 7 pills remaining. |
| **Missed doses banner** | Shows yesterday’s missed slots and today’s past-due slots (by schedule time). |
| **Due now banner** | Always shows today’s past-due doses (not dismissable). |
| **Daily wellness check-in** | Log sleep, energy, symptoms at the bottom of Today. |
| **Interaction alert** | If active meds have known interaction warnings, a banner links to Drug safety check. |

### Medications (form & list)

| Feature | Description |
|---------|-------------|
| **Name with autocomplete** | Local brand list (~90 names) + live **RxNorm** search; brands prioritized with generic shown underneath. |
| **Medication type** | Optional route/form (e.g. inhaler, eye drops) for non-pill schedules. |
| **Scheduled vs as-needed** | **Scheduled** = fixed daily times; **as-needed (PRN)** = log when taken, optional daily max. |
| **PRN check-in** | Symptoms (med-specific chips), reason, notes, amount (oral 1–10 or custom). |
| **PRN insights** | Wellness report section correlating PRN use with daily wellness (non-diagnostic). |
| **Safety panel on add** | Side effects, alcohol/cannabis/tobacco notes, and interaction preview while adding a med. |
| **Dose amount** | Separate **pills/tablets** and **mg** fields; at least one required. |
| **Dose times** | One row per daily dose — 12-hour time + AM/PM; add/remove rows; duplicate times are normalized. |
| **Schedule dates** | **Start date** (required) and optional **end date** for short courses (e.g. antibiotics). |
| **Notes** | Free text (e.g. “take with food”). |
| **Pill inventory** | Optional “track pills remaining”; decrements on mark taken, increments on undo. |
| **Medications list** | **My account → Medications** — all meds with upcoming/ended status and date ranges. |

### History

| Feature | Description |
|---------|-------------|
| **14-day dose list** | Chronological log with medication name, dose label, schedule time, and taken time. |
| **42-day calendar** | Tap a day to filter the list; tap again to clear. Days with logs are highlighted. |
| **Weekly summary** | “This week: X of Y doses (Z%)” based on active meds per day. |
| **Stats** | Total doses logged and days with at least one dose (over the loaded window). |

### Adherence streaks (`/streaks` and Account)

| Feature | Description |
|---------|-------------|
| **Perfect day** | Every scheduled dose for every **active** medication logged that calendar day (PRN excluded). |
| **Current streak** | Consecutive perfect days; today in progress does not break the streak until the day ends. |
| **Longest streak** | Best run in the last year of data. |
| **7-day chart** | Visual bars for the last week. |
| **Tulip badges** | Milestones on `/streaks` by longest streak. |
| **Consistency calendar** | Perfect / partial / missed days on History and Streaks. |
| **Celebration** | Modal on milestone perfect days (Today). |

### Drug interaction check

Educational tool — **not medical advice**.

| Feature | Description |
|---------|-------------|
| **Automatic check** | On `/interactions`, checks all medications active today. |
| **RxNorm name mapping** | Brand names (e.g. Lexapro) resolved to generic names via NIH RxNorm. |
| **Curated database** | 60+ clinically significant pairs (major / moderate / minor) with descriptions and management tips. |
| **Pair results** | Sorted by severity; shows both display names and mapped generic names. |
| **“Check another drug”** | Add a hypothetical drug (with autocomplete) and re-run without saving it. |
| **Allergy cross-check** | Warns when med names overlap your allergy list. |
| **Today banner** | Surfaces count and top warning when interactions exist. |
| **Disclaimer** | Clear limits: incomplete database, not a substitute for pharmacist/clinician. |

> NIH’s public drug–drug interaction API was discontinued; this app uses a local reference set plus RxNorm, not a live DrugBank/FDA feed.

### Account & settings

| Feature | Description |
|---------|-------------|
| **Display name** | Saved to Supabase user metadata. |
| **Theme** | Light or dark mode; toggle in header (moon/sun) or Account dropdown; follows system preference on first visit. |
| **Timezone** | “Today”, streaks, and missed-dose logic use the selected IANA timezone. |
| **Browser reminders** | Optional dose alerts while the tab is open (permission required). |
| **In-app reminder banner** | Bottom banner when a reminder fires — works even when macOS hides system pop-ups. |
| **Reminder diagnostics** | Test notification + “Check dose reminders now” with per-slot status on Account. |
| **Sign-in details** | Email and account creation date. |

### Wellness

Track daily experiences to **discuss with your clinician** — not a diagnosis tool.

| Feature | Description |
|---------|-------------|
| **Baseline profile** | Usual sleep, eating notes, substance use frequency, symptoms to track. |
| **Daily log** | Sleep hours/quality, energy, appetite, exercise, symptom chips, notes. |
| **Today check-in** | Same log as Wellness, quick entry at the bottom of Today. |
| **7-day history** | Tap any day to view or edit logs. |
| **Trends** | Bar charts (sleep, energy) + week-over-week comparison text. |
| **Medication briefings** | Educational side effects and substance notes per active med. |
| **Doctor report** | Printable summary (baseline, 14 days of logs, briefings, PRN insights) — Save as PDF from print dialog. |

### Medical records

| Feature | Description |
|---------|-------------|
| **Allergies & conditions** | Tag lists; used for interaction and add-med safety hints. |
| **Blood type, surgeries, family history** | Optional self-reported fields. |
| **Demographics** | DOB, gender, height, weight — metric stored (cm/kg); **metric or US/imperial** input preference saved to your account. |

### Tracking (`/tracking`)

Optional modules; enable only what you need.

| Feature | Description |
|---------|-------------|
| **Physical profile** | Same demographics as medical records; editable on Tracking. |
| **Unified calendar** | Shared calendar with ranges (1 day → 12 months) and per-tracker “Show” dropdown. |
| **Cycle & period** | Period start/end (editable dates), phases, multi-month **predicted** periods (striped), day logs (flow, pre/during/post symptoms, intercourse, notes), late-period adjustment, variable cycle length learning, day strip + **Today** button, fix-mistake tools. |
| **Future days** | Calendar preview only — logging unlocks on that calendar day. |
| **Medication progress** | Adherence view from Today data. |
| **Coming soon** | HRT (partial sync from Today), weight, vitals, pain, migraine, respiratory, custom. |

### Onboarding & help

| Feature | Description |
|---------|-------------|
| **First-visit modal** | Short walkthrough; option to jump straight to adding a medication. |
| **Help & safety** | How to use each area, streak rules, double-dose prevention, medical disclaimer. |

### Navigation & layout

| Feature | Description |
|---------|-------------|
| **Profile menu** | Avatar dropdown: Today, History, Wellness, **Tracking**, My account, Drug safety check, Medical records, Help, Sign out. |
| **Sticky header** | Nav stays visible while scrolling. |
| **Responsive layout** | Centered column, mobile-friendly cards and forms (web browser; not a native app). |
| **Account page styling** | Purple gradient theme on streak and settings cards (distinct from teal “Today” accents). |

---

## Native mobile & long-term (planned)

The **web app is complete for browser use**; native iOS/Android is not released yet. Planned work (push when app is closed, offline dose queue, shared logic with web, widgets, more trackers) is in **[docs/ROADMAP.md](docs/ROADMAP.md)**. Web reminders require the tab to stay open or recently active — see [WEB_APP.md → Reminders](docs/WEB_APP.md#my-account-account).

---

## Data model (Supabase)

### `medications`

| Column | Description |
|--------|-------------|
| `name` | Medication name |
| `dose_pills`, `dose_mg` | Text dose labels (scheduled meds need at least one; PRN may use daily cap instead) |
| `schedule_type` | `scheduled` or `as_needed` |
| `schedule_times` | Array of 24h times, e.g. `["08:00","20:00"]` |
| `max_doses_per_day`, `prn_amount_hints`, `prn_symptom_hints` | PRN limits and UI presets |
| `medication_route`, `medication_form` | Route/form for safety copy and PRN defaults |
| `tracking_sync` | e.g. `hrt` to mirror doses into Tracking |
| `notes` | Optional |
| `pills_remaining` | Optional integer |
| `start_date`, `end_date` | Schedule window (`end_date` optional) |
| `user_id` | Owner (RLS) |

### `dose_logs`

| Column | Description |
|--------|-------------|
| `medication_id`, `user_id` | References |
| `taken_on` | Calendar date (user timezone) |
| `schedule_time` | Which daily slot was logged |
| `taken_at` | Timestamp |
| `logged_amount` | What was taken (especially PRN) |
| `prn_symptoms`, `prn_reason`, `prn_notes` | PRN check-in context |

**Unique constraint:** `(medication_id, taken_on, schedule_time)` — prevents duplicate logs for the same slot.

### `wellness_profiles` / `wellness_logs`

Per-user baseline (sleep habits, substance use, symptom focus) and one **daily log per calendar day** (sleep, energy, appetite, exercise, symptoms, notes). Migration `006_wellness.sql`.

### `medical_records`

One row per user: allergies, conditions, blood type, notes, demographics, `height_unit` / `weight_unit` preferences. Migrations `008`, `009`, `016`.

### Tracking tables

| Table | Purpose |
|-------|---------|
| `user_trackers` | Enabled module IDs per user |
| `cycle_settings`, `cycle_periods`, `cycle_day_logs` | Cycle tracking |
| `tracker_dose_events` | Dose logs mirrored into trackers (e.g. HRT) |

Migration `010_tracking.sql` (+ `014`, `015` for cycle enhancements).

### Migrations (run in order)

Full checklist, verification SQL, and troubleshooting: **[docs/MIGRATIONS.md](docs/MIGRATIONS.md)**.

Summary:

1. `supabase/schema.sql` — bootstrap `medications` + `dose_logs`
2. `supabase/migrations/002` … `016` — wellness, avatars, medical records, PRN, tracking, cycle, unit prefs

See [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) for Auth and API keys.

---

## Project structure

```
dr.dose/
├── web/                          # React + Vite app
│   ├── src/
│   │   ├── pages/                # Today, History, Wellness, Tracking, Account, Interactions, Medical records, Help
│   │   ├── components/           # UI (forms, cards, tracking, PRN, auth, wellness)
│   │   ├── lib/                  # medications, streaks, wellness, tracking/, interactions, notifications
│   │   └── data/                 # drug-interactions.json, drug-safety.json, brand-medications.json
│   ├── public/sw.js              # Service worker for more reliable browser notifications
│   └── .env                      # Supabase keys (not committed)
├── supabase/
│   ├── schema.sql
│   └── migrations/
├── docs/                         # WEB_APP, MIGRATIONS, SUPABASE_SETUP, DEPLOY, ROADMAP
├── vercel.json                   # Deploy root = web/
└── .github/workflows/ci.yml      # Lint + build on push
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project

### Setup

1. **Database & auth** — [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)
2. **Run migrations** — SQL Editor: `schema.sql` then `002` → `016` ([MIGRATIONS.md](docs/MIGRATIONS.md))
3. **Environment:**

```bash
cp web/.env.example web/.env
# VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. **Run locally:**

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173` (or the URL Vite prints).

### Deploy (Vercel)

Step-by-step: **[docs/DEPLOY.md](docs/DEPLOY.md)**

1. Import repo on [vercel.com](https://vercel.com) — set **Root Directory** to `web` (see `web/vercel.json`)
2. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Supabase → **Authentication** → add production URL to **Site URL** and **Redirect URLs**

### Resume later (local dev)

```bash
cd web && npm install && npm run dev
```

No need to run Supabase locally; keep `web/.env` with your API keys.

### Build

```bash
cd web
npm run build
npm run preview
```

---

## Scripts (`web/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Roadmap

Shipped features and planned phases (mobile push, shared logic, HRT/weight trackers, integrations): **[docs/ROADMAP.md](docs/ROADMAP.md)**.

**Live demo:** Deploy to Vercel with env vars from Supabase; add production URL to Supabase Auth redirect allowlist ([DEPLOY.md](docs/DEPLOY.md)).

---

## Development log (setup)

After cloning, run once:

```bash
./scripts/install-githooks.sh
```

Each `git commit` then appends its subject to the [Development log](#development-log) at the top of this file (same commit, via `post-commit` amend). To skip once: `SKIP_DEVLOG=1 git commit …`

Manual entry: `./scripts/append-dev-log.sh "Your summary"`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

## Security

See [SECURITY.md](SECURITY.md). Never commit `web/.env` or the Supabase **service_role** key.

## Medical disclaimer

Dr. Dose is for **personal organization only**. It does not provide medical advice, diagnosis, or treatment. Drug interaction information is incomplete and may be outdated. Always follow your prescriber and pharmacist. Call emergency services for urgent medical problems.
