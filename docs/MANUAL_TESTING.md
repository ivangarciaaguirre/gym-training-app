# Milestone 1 manual verification

Run on a physical iPhone using the README. Physical device testing has not been performed by Codex.

## Offline workflow

1. Open the app. Verify Upper A, Lower A, Upper B and Lower B appear with no fabricated workout history.
2. Create a routine, name it, choose a goal, add exercises and set targets. Move exercises up/down and remove one. Save, reopen and verify the saved ordering and targets. Try invalid rep ranges and blank names; saving should show a readable error.
3. Start a routine. Enter load and reps; leave RIR blank. Enter an incomplete load such as `42.` in another set and add a note. Force-close/reopen the app. Resume the session and verify every input, including unfinished text, survives.
4. Try completing a set with blank load, fractional reps, negative values and RIR above 10. Verify validation keeps the session usable. Log a valid set. Check the 90-second rest timer, including after backgrounding; clear it.
5. Pause. Verify logging is disabled. Reopen the app and resume. Finish after logging at least one set. Check history contains the logged sets and retained unfinished input.
6. Start the same routine again using the same unit. Check previous values and quick-fill. Change template targets, then check old history retains its original targets. A workout using different targets or units should not quick-fill incompatible previous values.
7. In Settings switch kg/lb. Verify only new sessions change unit, and displayed old values retain their labels. Loads mean total external load, including both dumbbells; use 0 for unloaded movements.
8. Complete exactly the prescribed sets at the top of the rep range using the same positive load and RIR of at least 1. Confirm comfortable technique. After finishing, expect a suggestion to consider +2.5 kg or +5 lb. Missing RIR, unconfirmed technique, mixed loads or missing sets should hold progression with an explanation.
9. Flag pain/discomfort/dizziness or include a safety word in a note. Verify guidance pauses progression. Safety-word matching is conservative and can produce false positives; it is not diagnosis.
10. Delete a routine and verify its workout history remains. Delete a finished workout and verify it leaves history. Remove all routines and check the create-routine empty state. Delete all starter routines, restart and verify they do not reappear.
11. With Metro's bundle already loaded, disconnect internet and repeat logging/restart. Expo Go itself needs a development bundle to initially load; a standalone/development build is the path for testing startup entirely without Metro.

## Supabase validation

Hosted changes require approval. Start with a disposable local Supabase stack if Docker is available; otherwise `npm test` runs the real migrations in an isolated PostgreSQL WASM database with local Auth stubs.

1. Run `npm run check:supabase`. Verify it only tests a REST GET and schema GET. No signup, token refresh or data mutation occurs in this script.
2. Keep `EXPO_PUBLIC_ENABLE_CLOUD_WRITES=false` for hosted connection checks before migration approval. Logging must work regardless of the connection result.
3. After approved migrations are applied, explicitly set the flag to `true`, restart Metro, and reload the app. Sign up using your own test email, confirm it if required, then sign in. Verify signing in alone does not upload workouts.
4. Enable live upload, review the disclosure and confirm. In Supabase Table Editor, inspect `routine_templates`, `routine_exercises`, `workout_sessions`, `workout_exercises` and `workout_sets`. Log a complete set and check its weight/reps/unit appear within a few seconds. Numeric columns for unfinished sets stay null; raw drafts live in the parent snapshot.
5. Disconnect internet, edit/log several sets and reopen the app. Verify local values persist and the queue remains pending. Reconnect, foreground the app or use Retry. Verify records update without duplicate rows.
6. Change data while an upload is running. Verify newer edits eventually appear in the cloud. Finish a workout; check its status and timestamp. Delete one; verify `deleted_at` is set. A tombstone is not permanent data erasure.
7. Stop uploading, change a local value, and verify cloud changes stop. Re-enable and verify the latest facts upload. An already in-flight request may still finish.
8. Sign out and sign in as another test account. Verify the first account's queued data cannot be uploaded to the second account. Local notebook visibility after sign-out is intentional in this single-person increment.
9. With two real local Auth users, repeat REST reads and mutation attempts using their JWTs: each user must see only their own private rows; anonymous access to private tables and writes to the catalog must fail. The automated SQL tests cover the database side, but do not emulate the hosted Auth/API gateway.

## Accessibility and platform checks

Use VoiceOver, large text, and the iOS keyboard on an actual phone. Verify button labels, target sizes, scrolling, error messages, back navigation and field focus while the keyboard is open. Repeat the main workflow on Android before claiming Android device validation.
