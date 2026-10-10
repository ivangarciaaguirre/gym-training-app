import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertLoad, recommendProgression, type ProgressionInput } from './index';
const fixture: ProgressionInput = {
  targetSets: 2, repMin: 6, repMax: 10, unit: 'kg', techniqueConfirmed: true, safetyFlag: false,
  sets: [{ id: 'a', load: 40, reps: 10, rir: 2 }, { id: 'b', load: 40, reps: 10, rir: 1 }],
};
test('double progression includes explainable versioned evidence and unit-specific increments', () => {
  const result = recommendProgression(fixture);
  assert.equal(result.action, 'consider_increase'); assert.equal(result.suggestedLoad, 42.5);
  assert.equal(result.algorithm_version, 'double-progression/1.0.0'); assert.equal(result.evidence.completedSets, 2);
  assert.equal(recommendProgression({ ...fixture, unit: 'lb' }).suggestedLoad, 45);
});
test('safety flag takes precedence even with otherwise invalid data', () => {
  assert.equal(recommendProgression({ ...fixture, safetyFlag: true, sets: [] }).action, 'stop_and_assess');
});
test('missing RIR and unconfirmed technique do not fabricate effort or technique', () => {
  assert.equal(recommendProgression({ ...fixture, sets: fixture.sets.map(s => ({ ...s, rir: null })) }).reason_codes[0], 'effort_unknown');
  assert.equal(recommendProgression({ ...fixture, techniqueConfirmed: false }).reason_codes[0], 'technique_unconfirmed');
});
test('incomplete sets, mixed loads and one poor session do not imply a plateau', () => {
  assert.equal(recommendProgression({ ...fixture, sets: fixture.sets.slice(0, 1) }).action, 'hold');
  assert.equal(recommendProgression({ ...fixture, sets: [fixture.sets[0], { ...fixture.sets[1], load: 39 }] }).reason_codes[0], 'mixed_loads');
  assert.equal(recommendProgression({ ...fixture, sets: fixture.sets.map(s => ({ ...s, reps: 9 })) }).reason_codes[0], 'rep_target_not_met');
});
test('high effort, duplicate events, outliers and invalid targets never recommend an increase', () => {
  for (const sets of [fixture.sets.map(s => ({ ...s, rir: 0 })), [fixture.sets[0], fixture.sets[0]], fixture.sets.map(s => ({ ...s, load: Infinity })), fixture.sets.map(s => ({ ...s, reps: 101 }))]) {
    assert.equal(recommendProgression({ ...fixture, sets }).action, 'hold');
  }
  assert.equal(recommendProgression({ ...fixture, repMin: 11 }).action, 'hold');
});
test('conversions round-trip without changing stored units', () => {
  assert.ok(Math.abs(convertLoad(convertLoad(100, 'kg', 'lb'), 'lb', 'kg') - 100) < 1e-8);
  assert.equal(convertLoad(0, 'kg', 'lb'), 0); assert.throws(() => convertLoad(-1, 'lb', 'kg'));
});
