# Confirmed architecture

Supabase is the selected backend from the start: Auth, PostgreSQL and Row Level Security (RLS), with version-controlled SQL under `supabase/migrations`. There is no custom always-on API server. Mobile clients may use only a publishable key; service-role keys, database passwords and AI keys must never enter the app bundle.

Supabase-first describes the backend decision, not an online dependency for lifting. SQLite remains the durable device store. Milestone 1 implements the workout-tracker acceptance criteria plus optional email/password Auth and one-way live upload after explicit consent. Hosted writes default to disabled until migrations are approved and applied. No account or configuration is needed to log locally. Cross-device restore and bidirectional synchronization remain a separate increment.

## Boundaries

- `apps/mobile`: Expo Router screens, input validation, SQLite migrations and persistence adapters.
- `packages/training-engine`: pure TypeScript progression calculations, independent of React, storage, network and AI.
- `supabase/migrations`: PostgreSQL schema, constraints, least-privilege grants and owner-scoped RLS. Hosted changes require explicit approval.
- `tests/cloud-sql.test.ts`: local PostgreSQL isolation and integrity checks against the actual migrations.

Keep stable client-generated UUIDs. Workout exercises snapshot routine targets so template edits do not rewrite history. Store each set's explicit load unit; previous values and progression must compare compatible targets and units. Persist unfinished input too, so restarting does not discard an unfinished set.

SQLite stores bounded routine/workout aggregates as JSON with a kind, UUID and monotonic revision. JSON constraints plus runtime Zod schemas validate the persisted shape, exercise IDs, target ranges, unique nested IDs and completed values; the repository checks template references. This makes each local edit and its queue update one transaction while preserving unfinished text such as `42.`. PostgreSQL stores relational rows with explicit constraints, plus the source snapshot for future restore. A security-invoker RPC replaces parent/children atomically under the caller's RLS policies. Small synchronous SQLite writes avoid a debounce window in which input could be lost; only network uploads are coalesced.

## Security and future synchronization

Every private cloud row has an owner. Composite foreign keys enforce ownership across parent/child records as well as RLS; knowing another user's parent ID must not allow attaching a row to it. The catalog is readable, but mobile clients cannot edit it. No private anonymous access, privileged SQL functions or embedded credentials.

Live upload explicitly links this installation to one account with user consent. An atomic SQLite outbox coalesces the latest revision of each record. Requests run serially and retry every 30 seconds, on foregrounding or by explicit retry. Acknowledgements delete only the sent revision, preserving newer edits made while a request is in flight. Parent templates upload before referencing sessions. Deleted records remain tombstones. Server-side revision checks make retries idempotent and reject writes from a different device to an existing record. The current policy has one device as the writer; it does not merge concurrent devices.

Signing out stops upload and keeps the local notebook. A second account cannot enroll the first account's device data. This is a single-person installation, not an isolated multi-user device database: local workouts remain visible after sign-out. Auth sessions use the official SQLite key-value storage adapter and are not application-encrypted. An in-flight request may finish after stopping upload. Deletion clears workout notes/sets or routine entries and retains minimal tombstone metadata, so enabling upload later cannot send previously deleted details. Applying a cloud tombstone removes the corresponding children and replaces its snapshot; provider backups/retention are outside this mechanism. Cloud permanent erasure/export, cross-device restoration and account-isolated local notebooks belong to the next increment. Do not describe live upload as a complete backup/restore or full sync solution.

AI, billing, wearable APIs and medical/recovery claims are outside Milestone 1. Future AI calls occur only via an authenticated server-side function and explicit user action.

## Development and deployment

Local migration validation and review precede deployment. Do not run `supabase link`, `supabase db push`, hosted SQL, or deploy functions without approval. Public Expo variables are bundled into the app; `.env.local` is ignored and must contain only public client configuration. Use Node 22 LTS (22.13 or later) for Expo SDK 57.
