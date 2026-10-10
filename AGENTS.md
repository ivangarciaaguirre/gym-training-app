# AGENTS.md — Gym Training Companion

## Mission
Build an approachable, offline-capable workout tracking mobile application that helps both experienced lifters and casual gym-goers log sessions, understand progress, and optionally obtain personalized coaching. This is a real learning project and GitHub portfolio piece, not a prototype that merely displays mock screens.

The developer wants to learn mobile/full-stack engineering by building and shipping small, testable increments. Favor simple, explainable choices over premature scale or expensive infrastructure. Explain important decisions in PR summaries and keep the app runnable after each phase.

## Product principles
1. Core workflow: **Open app → see today's workout → lift → log → leave.** Fast, distraction-free logging.
2. Free core: unlimited workout logging, templates, exercise history, basic progress and deterministic progression suggestions. Do not artificially restrict basic logging.
3. Casual users must not be forced into hypertrophy metrics. Offer goals such as stay active, build consistency, build strength/muscle, or balanced fitness. RIR and advanced details are optional.
4. AI is opt-in, never required for logging. Saving a note must NOT automatically trigger a paid API request. Offer explicit “Ask Coach” and optional post-workout review.
5. The app must function if the cloud or AI provider is unavailable.
6. Privacy-first: minimize personal/health data sent to servers and model providers. User permission, deletion, export, and clear disclosures matter.
7. Do not claim precise calorie expenditure, recovery, injury diagnosis, or medically validated coaching.

## Recommended stack (default unless strong reason to change)
Confirmed architecture update: Supabase is the selected backend from Milestone 1. Prepare version-controlled PostgreSQL migrations and RLS now, while preserving SQLite-based offline logging. See `docs/ARCHITECTURE.md` and the revised roadmap. This supersedes the earlier instruction to defer all Supabase artifacts. Hosted database changes require explicit user approval; do not commit, push, merge or release without explicit approval.

- React Native + Expo + TypeScript, Expo Router for navigation.
- SQLite via expo-sqlite for durable on-device workouts, templates, and an outbound sync queue.
- Shared pure TypeScript packages for `training-engine` and later `energy-engine`, with unit tests.
- Supabase Auth + PostgreSQL + Row Level Security for optional accounts and cloud synchronization; Edge Functions for secure AI proxy and server-side enforcement.
- OpenAI API **only from a server-side function**, never embedded keys in mobile app. Provider and model configurable by environment variables.
- Expo development builds for HealthKit/Health Connect integrations. Expo Go is fine for early screens but native health modules need appropriate builds and platform capabilities.
- Use inexpensive/free tiers while prototyping; avoid always-on infrastructure.

## Initial scope — MVP v0.1
Implement in this order:
1. Scaffold Expo/TypeScript app with clean navigation and accessible UI.
2. Exercise catalog with equipment, muscle groups, movement pattern and instructions (seed small, curated, locally). Do not scrape copyrighted assets.
3. Routine templates: create/edit/delete, reorder exercises, set target rep ranges and set counts. Include optional Upper A / Lower A / Upper B / Lower B starter templates.
4. Workout session: start/pause/finish; per-exercise sets with weight, reps, optional RIR, notes, rest timer; quick-fill previous performance; persist locally immediately.
5. Workout history and per-exercise progress (sets/reps/load, simple graphs).
6. Deterministic progression recommendations from prior comparable sessions; explain recommendation in plain language, including uncertainty.
7. Tests, error handling, local migration/versioning, and a clear README with run instructions.

**Not in v0.1:** AI API calls, billing, health integrations, complicated workout generation, social feed, recovery percentages, elaborate onboarding, custom backend deployment. Lay foundations but do not block MVP on them.

## Future phases
### v0.2 — Cloud accounts and sync
- Supabase Auth and per-user PostgreSQL records with RLS.
- Local-first sync, idempotent writes, stable client-generated IDs, tombstones/deletion strategy, retries, and clear conflict policy.
- No credentials in repository; document environment setup and database migrations.
- Exercise and workout history remain available offline.

### v0.3 — Optional AI coaching
- `ask-coach` backend endpoint with authentication, quotas, rate limiting, cost logging, input validation and privacy safeguards.
- Only invoke when user explicitly requests advice or opts into a review. Notes alone do not trigger calls.
- Send concise structured engine output + only necessary workout context and user note; do not send full history by default.
- Return structured explanation + disclaimers, not unvalidated numeric prescriptions.
- Avoid repetitive advice; save concise, user-visible coaching memory with deletion controls.
- Pain/discomfort flags should not generate push-through recommendations; encourage appropriate professional assessment when warranted.

### v0.4 — Guided routines and casual mode
- Beginner onboarding by goal, days/week, session length, equipment and experience.
- Deterministic, vetted workout generator with user override; optional AI for natural-language customization.
- Quick activity log for casual users; emphasize consistency and enjoyment, not forced overload.

### v0.5 — Wearable energy insights (potential Pro feature)
- iOS HealthKit first, Android Health Connect next; optional direct WHOOP API after verifying access, scopes and provider terms. Fitbit/Google direct integration only if developer API access is available.
- Obtain explicit platform permissions; health integrations are optional. Respect platform restrictions on monetizing/using health data.
- Normalize source records: date/time/timezone, provider, resting/basal energy, active/total energy, steps, workout sessions, quality flags.
- **Deduplicate** overlapping sources/workouts; never blindly sum WHOOP, Apple Watch and app-derived workout calories.
- Estimate daily and rolling 7-day expenditure using compatible source semantics; show provenance and uncertainty. Do not label it “true TDEE.”
- Thermic effect of food (TEF) may be omitted by some providers; add only with verified semantics, show as separate optional estimate, and do not promise a universally accurate correction.
- Logged sets, reps, RIR, duration and rest characterize training demand but are not a validated direct calorie equation. Do not multiply wearable calories by arbitrary intensity factors.
- Optional future calibration with user-consented intake and smoothed weight trends, not required for wearable-only mode.
- Keep raw high-frequency heart-rate data on device where practical; sync minimal daily aggregates by consent.

### v0.6 — Monetization only after validation
- Core logging remains free. Possible paid extras: expanded AI coaching allowances, adaptive energy dashboard, richer training insights.
- Never ship unlimited unmetered AI; server-enforced quotas and spending ceilings.
- Review Apple/Google billing rules and health-data restrictions before implementing paywalls.

## Architecture boundaries
- `apps/mobile`: screens, state, persistence adapters, navigation.
- `packages/training-engine`: pure functions and typed inputs/outputs; **no React, database, network or AI dependencies**.
- `packages/energy-engine` (future): source normalization, deduplication, energy calculations and confidence metadata; pure functions.
- `supabase/`: version-controlled migrations and RLS policies now; Edge Functions in later phases.
- The frontend displays structured engine results directly; GPT is an optional explanatory layer, not the source of truth for calculated values.
- Persist raw workout facts; derived stats can be recalculated or selectively cached. Version algorithm outputs.

## Data model sketch
- `exercises`: id, name, muscle groups, equipment, movement pattern, instructions.
- `routine_templates`: id, owner_id, name, goal, timestamps.
- `routine_exercises`: id, template_id, exercise_id, position, target_sets, rep_min, rep_max, optional target_rir.
- `workout_sessions`: id, owner_id, template_id nullable, started_at, finished_at, status, note.
- `workout_exercises`: id, session_id, exercise_id, position.
- `workout_sets`: id, workout_exercise_id, ordinal, load, load_unit, reps, rir nullable, completed_at, note nullable.
- Later: `recommendations`, `wearable_connections`, `daily_energy`, `coaching_requests`, `sync_operations`.
- Prefer stable client-generated UUIDs for offline-created records. Enforce relational integrity and ownership.
- Weight representation must be consistent and conversions tested; do not silently mix lb and kg.

## Training intelligence v1 — conservative, explainable
- Calculate per-exercise comparable-session trends, achieved rep ranges, load, estimated 1RM (with clear limitations), and basic hard-set counts.
- Simple double progression: consider a small load increase only after prescribed sets reach top of rep range with acceptable reported effort and technique. Do not infer technique from reps alone.
- A single unchanged weight or poor session is **not** a plateau. Look at multiple comparable sessions, rep improvements, RIR, volume and user notes.
- RIR is optional and subjective. If absent, give lower-confidence guidance rather than fabricating effort.
- Avoid using tonnage alone as a muscle-growth metric.
- Safety flags (pain, discomfort, dizziness) should interrupt automatic load-increase advice.
- Every recommendation includes `action`, `reason_codes`, `evidence`, `algorithm_version`, and uncertainty/limitations.
- All thresholds are configurable and documented as product heuristics, not universal scientific laws.

## Engineering standards
- TypeScript strict mode; small, typed modules; no `any` without justification.
- Use migrations and validation for persisted data. Never lose an in-progress workout on app restart.
- Test pure calculation modules with boundary cases, unit conversions, missing RIR, outliers, duplicate events, and regression fixtures.
- Accessibility: large tap targets, readable text, sensible defaults and minimal typing while lifting.
- Error and empty states; no fabricated metrics in production UI.
- Add only dependencies that clearly earn their maintenance cost.
- Keep `.env*` secrets out of git; provide `.env.example`.
- Use small commits and summarize what changed, how to run, what was tested, and known limitations.
- Ask before introducing paid services, irreversible migrations, new auth providers, or major architecture changes.

## Instructions to Codex for each task
1. Inspect repository, this file and README before editing.
2. State a short implementation plan and assumptions.
3. Implement the smallest end-to-end working slice; avoid broad speculative refactors.
4. Run available lint/typecheck/tests, or state why they could not run.
5. Explain files changed, decisions, manual verification steps, and suggested next small task.
6. When platform/API requirements are uncertain, consult current official documentation instead of inventing SDK methods or pricing.

## First assignment
Scaffold the Expo React Native TypeScript app and implement routine templates plus a working offline workout logger with SQLite persistence. Seed a small exercise catalog and four editable Upper/Lower templates. Show previous-set values and allow weight/reps/optional RIR entry. Include unit tests for the first deterministic progression rule. Prepare Supabase schema migrations, ownership constraints and RLS as the confirmed backend foundation. The user also approved optional Auth and consent-based one-way live upload so database updates can be observed after migration approval. Keep hosted writes disabled by default; no hosted changes without approval. Cross-device restore and bidirectional sync are later increments. Do not add GPT, billing, or wearable APIs yet. Provide exact commands to run on a physical iPhone and clearly distinguish Expo Go from native development builds.
