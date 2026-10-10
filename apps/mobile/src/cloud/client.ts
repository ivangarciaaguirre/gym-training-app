import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { publicCloudConfig } from './config';

export const cloudWritesAllowed = process.env.EXPO_PUBLIC_ENABLE_CLOUD_WRITES === 'true';
let config: ReturnType<typeof publicCloudConfig> = null;
export let configurationError = '';
try { config = publicCloudConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
catch (error) { configurationError = error instanceof Error ? error.message : 'Invalid public cloud configuration.'; }
export const cloudClient = config ? createClient(config.url, config.key, {
  auth: { storage: Storage, persistSession: cloudWritesAllowed, autoRefreshToken: false, detectSessionInUrl: false },
}) : null;

export async function testConnection(): Promise<string> {
  if (!cloudClient) throw new Error(configurationError || 'Supabase is not configured. Local logging is available.');
  // Explicit GET only, no auth signup or database mutation.
  const { data, error } = await cloudClient.from('app_schema').select('version').eq('id', 1).single();
  if (error) throw new Error('Connection/schema check failed. Confirm the URL, publishable key and approved migrations. Local logging still works.');
  if (data?.version !== 1) throw new Error('Cloud schema version is incompatible. Upload is stopped.');
  return 'Connected to Supabase; schema version 1 is ready.';
}
