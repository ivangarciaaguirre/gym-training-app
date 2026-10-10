import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Repository, type Database, type SqlValue } from '../apps/mobile/src/data/repository';
import { starterRoutines, startWorkout, parseSet, previousExercise } from '../apps/mobile/src/data/model';
import { drainUploads } from '../apps/mobile/src/cloud/upload';
import { publicCloudConfig } from '../apps/mobile/src/cloud/config';
function open(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  const adapter: Database = {
    execSync: sql => sqlite.exec(sql),
    runSync: (sql, ...params: SqlValue[]) => sqlite.prepare(sql).run(...params),
    getFirstSync: <T>(sql: string, ...params: SqlValue[]) => (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
    getAllSync: <T>(sql: string, ...params: SqlValue[]) => sqlite.prepare(sql).all(...params) as T[],
  };
  const repo = new Repository(adapter); repo.migrate(); repo.initialize(starterRoutines(randomUUID), randomUUID());
  return { repo, sqlite };
}
test('real SQLite survives reopen with unfinished input and paused sessions; seed is one-time', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gym-test-'));
  try {
    const path = join(dir, 'workouts.db'); const first = open(path);
    assert.equal(first.repo.routines().length, 4);
    const r = first.repo.routines()[0], w = startWorkout(r, 'lb', randomUUID);
    w.status = 'paused'; w.exercises[0].sets[0].load = '42.'; w.exercises[0].sets[0].reps = '8';
    first.repo.save('workout', w); first.repo.save('routine', { ...r, revision: 2, deletedAt: new Date().toISOString() }); first.sqlite.close();
    const next = open(path); assert.equal(next.repo.routines().length, 3);
    assert.equal(next.repo.workouts()[0].status, 'paused'); assert.equal(next.repo.workouts()[0].exercises[0].sets[0].load, '42.');
    assert.equal(next.repo.workouts()[0].unit, 'lb'); assert.equal(next.repo.routines(true).length, 4); next.sqlite.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('validation prevents corrupt completed data; template edits do not rewrite session targets', () => {
  const { repo, sqlite } = open(); const r = repo.routines()[0], w = startWorkout(r, 'kg', randomUUID);
  const s = w.exercises[0].sets[0]; s.load = 'bad'; s.reps = '10'; s.completedAt = new Date().toISOString();
  assert.throws(() => repo.save('workout', w)); assert.equal(repo.workouts().length, 0);
  s.completedAt = null; repo.save('workout', w);
  repo.save('routine', { ...r, entries: r.entries.map(e => ({ ...e, repMax: 15 })), revision: 2 });
  assert.equal(repo.workouts()[0].exercises[0].repMax, 10); sqlite.close();
});
test('previous performance requires completed sets and matching targets/unit', () => {
  const { repo, sqlite } = open(); const r = repo.routines()[0], previous = startWorkout(r, 'kg', randomUUID);
  previous.status = 'finished'; previous.finishedAt = new Date().toISOString();
  const s = previous.exercises[0].sets[0]; Object.assign(s, { load: '40', reps: '10', completedAt: previous.finishedAt });
  const current = startWorkout(r, 'kg', randomUUID);
  assert.ok(previousExercise([previous], current, current.exercises[0]));
  assert.equal(previousExercise([previous], { ...current, unit: 'lb' }, current.exercises[0]), undefined);
  assert.equal(previousExercise([previous], current, { ...current.exercises[0], repMax: 12 }), undefined); sqlite.close();
});
test('set validation accepts zero external load and missing RIR; rejects blank/fractional reps and negative/outlier inputs', () => {
  const { repo, sqlite } = open(); const s = startWorkout(repo.routines()[0], 'kg', randomUUID).exercises[0].sets[0];
  assert.deepEqual(parseSet({ ...s, load: '0', reps: '8' }), { id: s.id, load: 0, reps: 8, rir: null });
  for (const change of [{ load: '' }, { reps: '1.2' }, { load: '-2' }, { reps: '101' }, { rir: '11' }, { load: 'Infinity' }]) {
    assert.equal(parseSet({ ...s, load: '40', reps: '10', ...change }), null);
  } sqlite.close();
});
test('outbox edits coalesce; old acknowledgement cannot lose new edits; failure leaves durable retry', async () => {
  const { repo, sqlite } = open(); const owner = randomUUID(); repo.enableUpload(owner);
  const r = repo.routines()[0]; repo.save('routine', { ...r, name: 'Updated', revision: 2 });
  const old = repo.pending(owner).find(i => i.id === r.id)!;
  repo.save('routine', { ...r, name: 'Newest', revision: 3 }); repo.acknowledge(old);
  assert.equal(repo.pending(owner).find(i => i.id === r.id)?.revision, 3);
  await assert.rejects(drainUploads(repo, owner, { save: async () => { throw new Error('offline'); } }, () => true));
  assert.equal(repo.pending(owner).length, 4);
  const calls: string[] = [];
  await drainUploads(repo, owner, { save: async kind => { calls.push(kind); } }, () => true);
  assert.equal(calls.length, 4); assert.equal(repo.pending(owner).length, 0); sqlite.close();
});
test('queue enrollment is opt-in, account-bound and stops on logout/disabled upload', async () => {
  const { repo, sqlite } = open(); const a = randomUUID(), b = randomUUID();
  assert.equal(repo.pending(a).length, 0); repo.enableUpload(a); assert.throws(() => repo.enableUpload(b));
  let calls = 0; await drainUploads(repo, a, { save: async () => { calls++; } }, () => false); assert.equal(calls, 0);
  repo.disableUpload(); await drainUploads(repo, a, { save: async () => { calls++; } }, () => true); assert.equal(calls, 0);
  assert.equal(repo.pending(b).length, 0); sqlite.close();
});
test('cloud configuration rejects privileged keys and insecure hosted URLs', () => {
  assert.equal(publicCloudConfig(undefined, undefined), null);
  assert.throws(() => publicCloudConfig('https://example.supabase.co', 'sb_secret_bad'));
  assert.throws(() => publicCloudConfig('http://example.supabase.co', 'sb_publishable_test'));
  assert.equal(publicCloudConfig('http://127.0.0.1:54321', 'sb_publishable_test')?.url, 'http://127.0.0.1:54321');
});
test('stale edits and missing routine references cannot overwrite valid facts', () => {
  const { repo, sqlite } = open(); const r = repo.routines()[0];
  repo.save('routine', { ...r, revision: 2, name: 'Latest' });
  assert.throws(() => repo.save('routine', { ...r, revision: 2, name: 'Stale' }), /record changed/);
  assert.equal(repo.routines()[0].name, 'Latest');
  assert.throws(() => repo.save('workout', { ...startWorkout(r, 'kg', randomUUID), templateId: randomUUID() }), /source routine/);
  assert.equal(repo.workouts().length, 0); sqlite.close();
});
test('deletion keeps a minimal tombstone and never enrolls deleted notes for upload', () => {
  const { repo, sqlite } = open(); const r = repo.routines()[0], w = startWorkout(r, 'kg', randomUUID);
  w.note = 'Private note'; repo.save('workout', w);
  repo.save('workout', { ...w, revision: 2, deletedAt: new Date().toISOString() });
  const deleted = repo.workouts(true)[0]; assert.equal(deleted.note, ''); assert.equal(deleted.exercises.length, 0);
  const owner = randomUUID(); repo.enableUpload(owner);
  assert.ok(!repo.pending(owner).find(i => i.id === w.id)!.data.includes('Private note')); sqlite.close();
});
test('launcher refuses to bundle privileged public configuration without printing the credential', () => {
  const key = 'sb_secret_test_not_a_real_key';
  const child = spawnSync(process.execPath, ['scripts/mobile.mjs', 'export', '--platform', 'ios'], {
    encoding: 'utf8', env: { ...process.env, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key },
  });
  assert.equal(child.status, 1); assert.match(child.stderr, /Refusing to bundle/);
  assert.ok(!child.stderr.includes(key));
});
