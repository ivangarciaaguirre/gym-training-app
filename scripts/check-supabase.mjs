import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || !key.startsWith('sb_publishable_')) {
  console.error('Read-only check skipped: provide a public Supabase URL and publishable key.'); process.exit(1);
}
try {
  const origin = new URL(url);
  if (origin.protocol !== 'https:' && origin.hostname !== '127.0.0.1' && origin.hostname !== 'localhost') throw new Error('Use HTTPS for hosted projects.');
  const headers = { apikey: key };
  const response = await fetch(`${origin.origin}/rest/v1/`, { headers, signal: AbortSignal.timeout(10000) });
  console.log(`Read-only Supabase REST connection: HTTP ${response.status}.`);
  if (!response.ok) process.exit(1);
  const schema = await fetch(`${origin.origin}/rest/v1/app_schema?select=version&id=eq.1`, { headers, signal: AbortSignal.timeout(10000) });
  if (!schema.ok) console.log(`App schema is not ready (HTTP ${schema.status}); hosted migrations were not applied by this check.`);
  else {
    const data = await schema.json();
    console.log(data[0]?.version === 1 ? 'App schema version 1 is ready.' : 'App schema version 1 was not found.');
  }
} catch {
  console.error('Read-only connection failed. Check connectivity and public configuration. No mutations were attempted.'); process.exit(1);
}
