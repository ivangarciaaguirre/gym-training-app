import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { starterRoutines, startWorkout } from '../apps/mobile/src/data/model';
import { catalog } from '../apps/mobile/src/data/catalog';

test('PostgreSQL migrations, owner isolation, integrity, atomic upload and idempotent retry', async () => {
  const db = new PGlite();
  try {
    // Local Auth stand-in only: production auth.users/uid are supplied by Supabase.
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
    for (const name of readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort()) await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'));
    const a = randomUUID(), b = randomUUID(), device = randomUUID();
    await db.query('insert into auth.users values ($1),($2)', [a, b]);
    const login = async (owner: string) => {
      await db.exec('reset role; set role authenticated;'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
    };
    const save = (kind: string, data: unknown, dev = device) => db.query('select public.save_training_record($1,$2::jsonb,$3::uuid)', [kind, JSON.stringify(data), dev]);
    const count = async (table: string) => (await db.query<{ n: number }>(`select count(*)::int n from public.${table}`)).rows[0].n;
    await login(a);
    assert.equal(await count('exercises'), catalog.length);
    const r = starterRoutines(randomUUID)[0]; await save('routine', r);
    const w = startWorkout(r, 'kg', randomUUID); const set = w.exercises[0].sets[0];
    Object.assign(set, { load: '40', reps: '10', rir: '2', completedAt: new Date().toISOString() });
    await save('workout', w);
    assert.equal(await count('routine_templates'), 1); assert.equal(await count('workout_sessions'), 1);
    const logged = await db.query<{ load: string; reps: number; load_unit: string }>('select load, reps, load_unit from public.workout_sets where completed_at is not null');
    assert.equal(Number(logged.rows[0].load), 40); assert.equal(logged.rows[0].reps, 10); assert.equal(logged.rows[0].load_unit, 'kg');
    const setCount = await count('workout_sets'); await save('workout', w); assert.equal(await count('workout_sets'), setCount);
    await save('routine', { ...r, name: 'Revision 2', revision: 2 }); await save('routine', r);
    assert.equal((await db.query<{ name: string }>('select name from public.routine_templates')).rows[0].name, 'Revision 2');
    await assert.rejects(save('routine', { ...r, revision: 3 }, randomUUID()), /Different device/);
    const bad = { ...w, revision: 2, exercises: w.exercises.map((e, i) => i ? e : { ...e, exerciseId: 'not-in-catalog' }) };
    await assert.rejects(save('workout', bad));
    assert.equal((await db.query<{ revision: number }>('select revision::int from public.workout_sessions')).rows[0].revision, 1);
    assert.equal(await count('workout_sets'), setCount);
    await login(b);
    for (const table of ['routine_templates', 'routine_exercises', 'workout_sessions', 'workout_exercises', 'workout_sets']) assert.equal(await count(table), 0, table);
    assert.equal((await db.query('update public.routine_templates set name = $1 where id = $2 returning id', ['stolen', r.id])).rows.length, 0);
    assert.equal((await db.query('delete from public.workout_sessions where id = $1 returning id', [w.id])).rows.length, 0);
    await assert.rejects(db.query('insert into public.routine_exercises(id, owner_id, template_id, exercise_id, position, target_sets, rep_min, rep_max) values ($1,$2,$3,$4,9,3,6,10)', [randomUUID(), a, r.id, 'bench']), /row-level security/);
    await assert.rejects(db.query('insert into public.routine_exercises(id, owner_id, template_id, exercise_id, position, target_sets, rep_min, rep_max) values ($1,$2,$3,$4,0,3,6,10)', [randomUUID(), b, r.id, 'bench']), /foreign key/);
    await assert.rejects(db.query('update public.exercises set name = $1', ['edited']), /permission denied/);
    await login(a);
    await assert.rejects(db.query('update public.workout_sets set load_unit = $1 where completed_at is not null', ['lb']), /foreign key/);
    await assert.rejects(db.query('update public.routine_templates set owner_id = $1', [b]), /row-level security/);
    await save('workout', { ...w, revision: 2, deletedAt: new Date().toISOString() });
    assert.ok((await db.query<{ deleted_at: string }>('select deleted_at from public.workout_sessions')).rows[0].deleted_at);
    const whitespace = { ...w, revision: 3, exercises: w.exercises.map((e, i) => i ? e : { ...e, sets: e.sets.map((s, j) => j ? s : { ...s, reps: '10.0', rir: ' ' }) }) };
    await save('workout', whitespace);
    assert.equal((await db.query<{ rir: string | null }>('select rir from public.workout_sets where completed_at is not null')).rows[0].rir, null);
    await db.exec('reset role; set role anon;');
    assert.equal(await count('exercises'), catalog.length);
    await assert.rejects(count('workout_sessions'), /permission denied/);
    await assert.rejects(save('routine', r), /permission denied/);
  } finally { await db.close(); }
});
