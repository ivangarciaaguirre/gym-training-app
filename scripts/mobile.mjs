import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Expo's project root is apps/mobile; preserve the user's root .env.local.
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(`${root}/.env.local`)) process.loadEnvFile(`${root}/.env.local`);
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (publicKey && !publicKey.startsWith('sb_publishable_')) {
  console.error('Refusing to bundle: Supabase client configuration must use a public publishable key.');
  process.exit(1);
}
for (const name of Object.keys(process.env)) {
  if (name.startsWith('EXPO_PUBLIC_') && /secret|service.?role|password|private|openai/i.test(name)) {
    console.error('Refusing to bundle: a sensitive variable is configured with an EXPO_PUBLIC_ prefix.');
    process.exit(1);
  }
}
const require = createRequire(import.meta.url);
const cli = require.resolve('expo/bin/cli');
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: `${root}/apps/mobile`, stdio: 'inherit', env: process.env,
});
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (error) => { console.error(error.message); process.exit(1); });
