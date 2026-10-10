# Development roadmap and acceptance criteria

## Milestone 1 — Workout tracker and Supabase foundation
**Deliverable:** An app usable for an entire gym session without an account or internet.

Acceptance criteria:
- Launch app, choose or create routine, start workout.
- Add exercises from a seeded catalog; reorder routine exercises.
- Record weight, reps, optional RIR, optional notes for multiple sets.
- Display last comparable set values where available.
- Persist each change immediately; closing/reopening app does not lose session.
- Finish session and see saved history.
- Units are clear and never silently mixed.
- Basic unit tests and run instructions exist.
- Supabase-first architecture documented; cloud schema and owner-scoped RLS are version-controlled and prepared for local validation.
- Optional email/password Auth and explicit consent to one-way live upload; device writes remain durable if upload fails. Queues are account-bound and retries cannot overwrite newer revisions.
- Hosted writes default to disabled. No hosted migrations, commits or deployments without explicit approval.

## Milestone 2 — Training insights
- Per-exercise trends and basic progress visualization.
- Conservative double-progression rule with documented thresholds.
- Explain recommendation from structured evidence; don't claim precise muscle growth or injury diagnosis.
- Handle missing RIR, different exercise variants, and inconsistent sets.

## Milestone 3 — Optional Supabase accounts and sync
- Extend the optional Auth/live-upload foundation with cross-device restore and bidirectional sync; local data remains usable without account.
- Extend the Milestone 1 schema; executed isolation tests confirm users cannot read or mutate each other's records.
- Idempotent offline queue, retries, conflict strategy, and user export/delete.
- Verify synchronization across devices and after interrupted connections.

## Milestone 4 — AI coach
- Secure Edge Function proxy with auth, quotas, validation, and request logging.
- Explicit Ask Coach or opt-in workout review only.
- AI receives structured trends and minimal relevant notes.
- Results are bounded explanations; app works when AI is unavailable.
- Measure token use and cost per user.

## Milestone 5 — Guided beginner mode
- Choose goal, experience, schedule, equipment, and workout length.
- Vetted exercise-selection rules, editable generated routines, casual quick logging.
- No mandatory RIR or complex analytics.

## Milestone 6 — Wearable Energy Insights
- HealthKit on iOS; Health Connect on Android; WHOOP direct API if approved/available.
- Explicit permission, source attribution, data minimization.
- Normalize basal/resting, active/total energy, steps, workout timing.
- Deduplicate overlapping sources and avoid adding logged workout calories twice.
- Rolling 7-day wearable-based estimate with uncertainty and transparent TEF handling.
- No claim that sets/RIR precisely predict calories or that wearable data establishes true TDEE.

## Milestone 7 — Validate Pro offering
- Observe actual feature usage and retention before building payments.
- Preserve free core workout logging.
- Consider metered AI coaching and advanced energy insights.
- Review platform billing and health-data monetization restrictions.

## Definition of done for each milestone
- Runs on target device.
- User can complete the intended flow end-to-end.
- Typecheck/tests pass or failures are documented.
- No hard-coded secrets or fake production data.
- README updated with setup, limitations, and verification steps.
