import { migrations } from './migrations';
import { routineSchema, workoutSchema, type Routine, type Workout, type RecordKind, type TrainingRecord } from './model';

export type SqlValue = string | number | null;
// A small synchronous interface: native Expo SQLite and real SQLite in tests.
export interface Database {
  execSync(sql: string): void;
  runSync(sql: string, ...params: SqlValue[]): unknown;
  getFirstSync<T>(sql: string, ...params: SqlValue[]): T | null;
  getAllSync<T>(sql: string, ...params: SqlValue[]): T[];
}
export type PendingUpload = { kind: RecordKind; id: string; owner_id: string; revision: number; data: string };
export class Repository {
  constructor(private db: Database) {}
  migrate() {
    this.db.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    const version = this.db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
    if (version > migrations.length) throw new Error('This database needs a newer app version. Your data has been kept.');
    for (let i = version; i < migrations.length; i++) this.transaction(() => {
      this.db.execSync(migrations[i]); this.db.execSync(`PRAGMA user_version = ${i + 1}`);
    });
  }
  transaction<T>(fn: () => T): T {
    this.db.execSync('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.execSync('COMMIT'); return result; }
    catch (error) { this.db.execSync('ROLLBACK'); throw error; }
  }
  setting(key: string): string | null {
    return this.db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? null;
  }
  setSetting(key: string, value: string) {
    this.db.runSync('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
  }
  private rows(kind: RecordKind) { return this.db.getAllSync<{ data: string }>('SELECT data FROM records WHERE kind = ?', kind); }
  routines(includeDeleted = false): Routine[] {
    return this.rows('routine').map(row => routineSchema.parse(JSON.parse(row.data))).filter(r => includeDeleted || !r.deletedAt);
  }
  workouts(includeDeleted = false): Workout[] {
    return this.rows('workout').map(row => workoutSchema.parse(JSON.parse(row.data))).filter(w => includeDeleted || !w.deletedAt);
  }
  initialize(starters: Routine[], deviceId: string) {
    if (this.setting('initialized')) return;
    this.transaction(() => {
      for (const r of starters) this.write('routine', r);
      this.setSetting('device_id', deviceId); this.setSetting('initialized', '1');
    });
  }
  save(kind: RecordKind, record: TrainingRecord) {
    // Keep only a minimal tombstone, rather than uploading previously deleted notes/facts later.
    const candidate = !record.deletedAt ? record : kind === 'routine'
      ? { ...record, name: 'Deleted routine', entries: [] }
      : { ...record, name: 'Deleted workout', templateId: null, exercises: [], note: '', restUntil: null };
    const validated = kind === 'routine' ? routineSchema.parse(candidate) : workoutSchema.parse(candidate);
    this.transaction(() => {
      const existing = this.db.getFirstSync<{ revision: number }>('SELECT revision FROM records WHERE kind = ? AND id = ?', kind, validated.id);
      if (existing && validated.revision !== existing.revision + 1) throw new Error('This record changed. Reopen this screen before saving again.');
      if (kind === 'workout') {
        const workout = validated as Workout;
        if (workout.templateId && !this.db.getFirstSync("SELECT id FROM records WHERE kind = 'routine' AND id = ?", workout.templateId)) {
          throw new Error('The source routine is missing. Your saved workouts have been kept.');
        }
      }
      this.write(kind, validated);
      const owner = this.setting('upload_owner');
      if (owner && this.setting('upload_enabled') === '1') this.enqueue(kind, validated, owner);
    });
  }
  private write(kind: RecordKind, record: TrainingRecord) {
    this.db.runSync(`INSERT INTO records(kind, id, revision, data) VALUES (?, ?, ?, ?)
      ON CONFLICT(kind, id) DO UPDATE SET data = excluded.data, revision = excluded.revision`, kind, record.id, record.revision, JSON.stringify(record));
  }
  private enqueue(kind: RecordKind, record: TrainingRecord, owner: string) {
    this.db.runSync(`INSERT INTO outbox(kind, id, owner_id, revision, data) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(kind, id, owner_id) DO UPDATE SET revision = excluded.revision, data = excluded.data`, kind, record.id, owner, record.revision, JSON.stringify(record));
  }
  enableUpload(owner: string) {
    const boundOwner = this.setting('upload_owner');
    if (boundOwner && boundOwner !== owner) throw new Error('This device data is linked to a different account. Upload is blocked to protect that account’s data.');
    this.transaction(() => {
      this.setSetting('upload_owner', owner); this.setSetting('upload_enabled', '1');
      for (const r of this.routines(true)) this.enqueue('routine', r, owner);
      for (const w of this.workouts(true)) this.enqueue('workout', w, owner);
    });
  }
  disableUpload() { this.setSetting('upload_enabled', '0'); }
  pending(owner: string): PendingUpload[] {
    return this.db.getAllSync<PendingUpload>("SELECT * FROM outbox WHERE owner_id = ? ORDER BY CASE kind WHEN 'routine' THEN 0 ELSE 1 END, rowid", owner);
  }
  acknowledge(item: PendingUpload) {
    // A response to an older upload must never discard a newer queued edit.
    this.db.runSync('DELETE FROM outbox WHERE kind = ? AND id = ? AND owner_id = ? AND revision = ?', item.kind, item.id, item.owner_id, item.revision);
  }
}
