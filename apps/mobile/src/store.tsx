import { createContext, useContext, useState, type ReactNode } from 'react';
import { getRepository } from './data/native';
import type { RecordKind, TrainingRecord } from './data/model';
import type { Repository } from './data/repository';
const Context = createContext<{ repo: Repository; revision: number; save: (kind: RecordKind, record: TrainingRecord) => void; refresh: () => void } | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [repo] = useState(getRepository);
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(v => v + 1);
  return <Context.Provider value={{ repo, revision, refresh, save: (kind, record) => { repo.save(kind, record); refresh(); } }}>{children}</Context.Provider>;
}
export function useStore() { const store = useContext(Context); if (!store) throw new Error('Missing data store.'); return store; }
