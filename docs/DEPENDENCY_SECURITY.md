# Dependency security review — October 9, 2026

The original audit flagged 31 affected packages (22 high, 9 moderate) from four underlying advisories. The targeted fixes preserve Expo 57 and React Native 0.86.3. Audit counts include parent packages whose dependencies are affected; they are not a count of distinct exploitable bugs in this app.

## Applied fixes

- **URL decoder:** query-string 7.1.3 now resolves to a private compatibility adapter backed by upstream `decode-uri-component@0.5.0`. A plain version override would break query-string's CommonJS function import because the patched upstream package is ESM-only. The adapter retains the existing API and `+` handling. No decoder algorithm was copied or locally patched. See [adapter rationale](../packages/uri-decoder-compat/README.md) and the [decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).
- **UUID:** an override limited to `xcode@3.0.1` selects `uuid@11.1.1`, a patched release that still provides CommonJS exports. Xcode uses `uuid.v4()` to generate 24-character project identifiers. Regression tests exercise that actual caller. Workout IDs continue to use Expo Crypto. See the [UUID fix release](https://github.com/uuidjs/uuid/releases/tag/v11.1.1).

The root manifest, lockfile, adapter and regression tests make the fixes reproducible with `npm ci`. npm initially retained old override resolutions; the installed tree was refreshed and a clean install is part of verification. Do not hand-edit installed files or run `npm audit fix --force` to reproduce these changes.

## Remaining advisories

The audit now flags **22 affected packages, all high severity**, from these two advisories. They are unresolved, not suppressed or cleared by passing functional tests.

| Package | Current exposure assessment | Patch status |
| --- | --- | --- |
| `braces` | Loaded through Metro's file-matching dependencies. We have not established exploitability through the app, but untrusted brace patterns can crash affected processing. | [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. |
| `node-forge` | Loaded through Expo certificate/signing tooling. The vulnerable signature-verification operation requires a separate review before relying on those signing paths. It is not used by our workout calculations or Supabase client code. | [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) lists no patched version. |

Continue local development while tracking the upstream fixes. Review both issues before production distribution. A lower audit count does not prove absence of exploitable vulnerabilities. Suggested automatic remediation includes downgrading Expo to 44, which is incompatible with this application's supported SDK and is not a suitable fix.

## Verification and follow-up

```powershell
node --version # Node 22 LTS, at least 22.13
npm ci
npm audit
npm test
npm run typecheck
npm run lint
npm run doctor
npm run export:ios
```

`npm audit` will still return a nonzero status while the remaining advisories are present. Preserve that signal. Tests cover query decoding/serialization and Xcode project ID generation in addition to the existing workout/SQLite/PostgreSQL tests. Check Expo Go navigation and workout logging on an actual iPhone after installing these changes; physical-device and native Xcode builds remain unverified in this Windows environment.

Verified in this review using a temporary Node 22 runtime: clean `npm ci`, all 20 tests, strict TypeScript, ESLint (including the adapter), Expo Doctor's 21 checks and iOS Metro export passed. The final audit still reports 22 high findings from braces/node-forge, with no moderate or critical findings. The system's installed Node 21 was not upgraded by this work; install Node 22 LTS before running the documented commands normally.

Next review: check for patched braces/node-forge releases and an Expo-supported router update; remove temporary overrides/adaptation only after compatibility verification. No hosted Supabase changes or commits are part of this dependency work.
