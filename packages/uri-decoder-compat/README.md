# URI decoder compatibility adapter

This private workspace package supplies the `decode-uri-component` dependency required by Expo Router 57's `query-string@7.1.3`. It delegates decoding to the **actual upstream `decode-uri-component@0.5.0`**, installed under the npm alias `patched-uri-decoder`. The local package version matches that upstream decoder version; it is an adapter, not a published upstream artifact.

The upstream security fix changes the decoder to a single-pass UTF-8 scanner. It is ESM-only, while query-string 7 expects `require('decode-uri-component')` to return a callable function. This adapter unwraps the default export and preserves the older decoder's conversion of `+` to spaces. It does not copy or reimplement the decoding algorithm.

Metro handles the ESM dependency for the app; Node 22.13+ supports synchronous `require(ESM)` for tooling/tests. The repository already requires that Node version for Expo 57.

The root `overrides` entry scopes this replacement to query-string 7.1.3. npm workspaces supply the local adapter, while its aliased dependency resolves to the registry's upstream package. `npm ci` must retain both; the dependency tests exercise the actual router dependency resolution, Unicode/query round trips, malformed input with a subprocess timeout, and Xcode's updated UUID caller.

Remove this package and the associated override once an Expo-compatible router version consumes a patched decoder with the correct import API. Do not publish this adapter or bypass the compatibility tests by replacing it directly with the ESM-only upstream package.

Sources: [upstream decoder release](https://github.com/SamVerschueren/decode-uri-component/releases/tag/v0.5.0), [security advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [Node require(ESM)](https://nodejs.org/download/release/v22.13.0/docs/api/modules.html#loading-ecmascript-modules-using-require).
