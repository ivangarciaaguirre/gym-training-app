import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { useStore } from '../store';
import { cloudClient, cloudWritesAllowed, testConnection } from './client';
import { drainUploads } from './upload';

type CloudContext = { session: Session | null; message: string; busy: boolean; retry: () => Promise<void>; changed: () => void };
const Context = createContext<CloudContext | null>(null);
export function CloudProvider({ children }: { children: ReactNode }) {
  const { repo, revision } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('Cloud upload is off.');
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const running = useRef(false);
  const [tick, setTick] = useState(0);
  const changed = () => setTick(v => v + 1);
  useEffect(() => {
    if (!cloudClient || !cloudWritesAllowed) return;
    let mounted = true;
    const update = (next: Session | null) => { sessionRef.current = next; if (mounted) setSession(next); };
    void cloudClient.auth.getSession().then(({ data }) => { if (mounted) update(data.session); });
    const { data } = cloudClient.auth.onAuthStateChange((_event, next) => update(next));
    const refresh = (state: string) => { if (state === 'active') cloudClient?.auth.startAutoRefresh(); else cloudClient?.auth.stopAutoRefresh(); };
    refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => { mounted = false; sessionRef.current = null; data.subscription.unsubscribe(); listener.remove(); cloudClient?.auth.stopAutoRefresh(); };
  }, []);
  const retry = useCallback(async () => {
    const client = cloudClient, owner = sessionRef.current?.user.id;
    if (!cloudWritesAllowed || !client || !owner || running.current || repo.setting('upload_enabled') !== '1') return;
    if (repo.setting('upload_owner') !== owner) { setMessage('Upload blocked: this device data belongs to another account.'); return; }
    running.current = true; setBusy(true);
    try {
      await testConnection();
      await drainUploads(repo, owner, { save: async (kind, payload, deviceId) => {
        const { error } = await client.rpc('save_training_record', { record_kind: kind, payload, client_device: deviceId });
        if (error) throw new Error('Upload failed. Check the approved schema and your account.');
      } }, () => sessionRef.current?.user.id === owner);
      const count = repo.pending(owner).length;
      setMessage(count ? `${count} changes pending.` : `Uploaded at ${new Date().toLocaleTimeString()}.`);
    } catch { setMessage('Upload unavailable. Changes are saved locally and will retry within 30 seconds or when you reopen the app.'); }
    finally { running.current = false; setBusy(false); }
  }, [repo]);
  useEffect(() => {
    const timer = setTimeout(() => { void retry(); }, 700); // Coalesce typing; SQLite still writes each edit immediately.
    return () => clearTimeout(timer);
  }, [revision, tick, session, retry]);
  useEffect(() => {
    const timer = setInterval(() => { void retry(); }, 30_000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void retry(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [retry]);
  return <Context.Provider value={{ session, message, busy, retry, changed }}>{children}</Context.Provider>;
}
export function useCloud() { const context = useContext(Context); if (!context) throw new Error('Missing cloud context.'); return context; }
