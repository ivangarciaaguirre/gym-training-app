export function publicCloudConfig(url: string | undefined, key: string | undefined) {
  if (!url && !key) return null;
  if (!url || !key) throw new Error('Set both public Supabase URL and publishable key.');
  const parsed = new URL(url);
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || /^192\.168\./.test(parsed.hostname) || /^10\./.test(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) throw new Error('Use HTTPS for hosted Supabase.');
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('Use the Supabase project origin URL.');
  // Only modern publishable keys, never a service-role/secret key or arbitrary JWT.
  if (!key.startsWith('sb_publishable_')) throw new Error('Use a Supabase publishable key (sb_publishable_), never a secret or service-role key.');
  return { url: parsed.origin, key };
}
