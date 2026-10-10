# Gym Training Companion

An offline workout logger built with Expo, TypeScript and SQLite, with **Supabase confirmed as the backend** for optional accounts and synchronization. See [architecture](docs/ARCHITECTURE.md), [roadmap](ROADMAP.md) and [engineering instructions](AGENTS.md).

Milestone 1 includes 12 original exercise instructions, four editable Upper/Lower routines, start/pause/finish logging, unfinished input persistence, optional RIR/notes, previous comparable sets, a rest timer and workout history. A pure TypeScript rule explains conservative progression suggestions. Optional email/password Auth and consent-based live upload let you observe database updates after approved migrations are applied. Logging remains free, local and usable if cloud requests fail.

## Run on a physical iPhone from Windows

Install **Node 22 LTS, version 22.13 or later**, and an Expo Go version compatible with **Expo SDK 57**. This machine initially had Node 21; upgrade it before running these commands. Check [Expo's SDK compatibility table](https://docs.expo.dev/versions/latest/) and [Expo Go installation](https://expo.dev/go) if your device reports a version mismatch.

From PowerShell:

```powershell
cd C:\Users\AG777\Documents\PersonalProjects\gym-training-app
node --version
npm ci
npx expo login
npm start
```

Sign in to the same free Expo account in the CLI and Expo Go on your iPhone, put the phone and computer on the same Wi-Fi, then scan Metro's QR code with the iPhone Camera. Follow the [official physical iOS setup instructions](https://docs.expo.dev/get-started/set-up-your-environment/?device=physical&mode=expo-go&platform=ios). Allow the private-network firewall access Metro needs. If LAN access is unavailable, stop Metro and try `npm run start:tunnel`; Expo may prompt to install its tunnel helper.

No Supabase configuration is required for local workouts. The root launcher loads the existing root `.env.local` without copying or printing its values. Do not overwrite your existing file with the example.

Expo Go uses a prebuilt native container and is the simplest path for this slice: SQLite and Crypto are bundled modules. It needs Metro to initially load the development bundle. **A native development build is your own installed app binary**, needed for custom native modules and future health integrations. A local iPhone native build requires macOS/Xcode; Windows cannot compile it locally. EAS can build remotely, but it is not configured or invoked here. See [development-build setup](https://docs.expo.dev/develop/development-builds/introduction/). No release or deployment was created.

## Optional Supabase connection and live upload

See [database instructions](supabase/README.md). The migrations are source files awaiting review/application; the app does not deploy them. Keep service-role keys, database passwords and AI keys out of all `EXPO_PUBLIC_*` variables. Publishable keys identify the project; RLS and the signed-in user's JWT enforce ownership, following [Supabase's client security guidance](https://supabase.com/docs/guides/database/secure-data).

For public configuration, use these names in the root `.env.local`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key
EXPO_PUBLIC_ENABLE_CLOUD_WRITES=false
```

Run `npm run check:supabase` or tap **Settings & cloud → Test connection (read only)**. The script uses GET requests only. The app also checks schema version before each upload batch. Hosted writes default to off, including Auth signup/sign-in, until the flag is explicitly enabled. After approving and applying the hosted migrations, set the flag to `true`, restart Metro and reload the app. Sign up/confirm email/sign in, then explicitly enable live upload. Signing in alone does not enroll data for upload.

SQLite commits each input immediately. Upload coalesces typing for about 700 ms, writes parent/children atomically, and retries pending records every 30 seconds, on foregrounding or manually. Watch `workout_sessions` and `workout_sets` in Supabase Table Editor. This is **one-way upload from one device**; cloud restore and cross-device merging are not implemented.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run doctor
npm run export:ios
npm run check:supabase
```

- TypeScript checks mobile code, the pure engine and the tests.
- Tests use real file-backed SQLite for reopen persistence and PostgreSQL WASM (PGlite) for executing the exact SQL migrations with local Auth stubs; no Docker or hosted credentials are needed.
- Expo Doctor checks native dependencies/configuration. `export:ios` validates Metro and creates an ignored local JavaScript bundle; it does not compile/sign a native app or publish anything.
- Run [manual device tests](docs/MANUAL_TESTING.md) before considering this milestone device-validated.

## Implementation and limitations

```text
apps/mobile/src/app/        Expo Router screens
apps/mobile/src/data/       Catalog, validation, SQLite migration and repository
apps/mobile/src/cloud/      Public client config, Auth and persistent upload queue
packages/training-engine/  Pure progression rule and unit conversions
supabase/migrations/       Relational schema, RLS, atomic RPC and catalog
tests/                     Persistence, queue, validation and PostgreSQL security tests
scripts/                   Root Expo/environment launcher and read-only connection check
```

Targets are snapshotted at session start. Previous values require the same exercise, unit, set target, rep range and target RIR. Use total external load consistently (combined dumbbells, or bar plus plates); 0 represents unloaded/bodyweight work. Changing units affects only new sessions and never silently converts saved facts.

The progression rule considers +2.5 kg or +5 lb only after exactly the prescribed sets reach top reps at a consistent positive load, with reported RIR ≥1 and comfortable technique explicitly confirmed. Missing effort information holds the load with higher uncertainty. Pain/discomfort/dizziness flags interrupt increases. Thresholds are configurable product heuristics, not medical advice or universal rules. A single poor workout is not labeled a plateau. See [the engine](packages/training-engine/index.ts).

This installation is a single-person notebook: signing out keeps local data visible. Upload enrollment is bound to one account and prevents accidental enrollment into a second account. Device SQLite and stored Auth sessions are not application-encrypted. Deletion marks records as tombstones, including cloud rows after upload; it is not permanent erasure. Cloud export/erasure controls, restore, richer progress graphs and bidirectional sync are later increments. Routine-editor changes require Save; workout field edits persist immediately. Web SQLite is not configured; target iOS/Android.

AI API calls, billing, wearables and backend/AI deployments are absent. Notes never trigger AI calls.

## Verification from implementation

- 20 tests passed; mobile/engine/test TypeScript and ESLint passed.
- Expo Doctor passed 21/21 checks; iOS Metro export passed.
- Hosted read-only connection returned **HTTP 401** with the existing public configuration. Confirm the project URL and publishable key belong to the same project, update the ignored `.env.local` locally, and rerun the check. Credentials were not printed and no hosted changes were made.
- Docker was not running, so full local Supabase Auth/PostgREST testing was not performed. PostgreSQL migration/RLS tests ran in PGlite instead.
- Physical iPhone/Android, VoiceOver and native-build testing require a device and remain unverified.
- Targeted decoder/UUID fixes reduced `npm audit` from **31 findings to 22 high-severity findings**. The remaining findings come from unpatched `braces` and `node-forge` advisories. See [dependency security review](docs/DEPENDENCY_SECURITY.md) for the fixes, compatibility adapter, remaining exposure and follow-up. Do not use `npm audit fix --force`; its suggested SDK changes are incompatible. SDK peer overrides keep React/native peers aligned with Expo 57.

Next small increment: verify the main workflow on an iPhone, resolve the public connection configuration, and review/apply the Supabase migrations only after approval. Then validate live upload against a real local/hosted Auth/API stack before adding bidirectional sync.
