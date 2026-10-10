import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const rootRequire = createRequire(resolve('package.json'));
const routerRequire = createRequire(rootRequire.resolve('expo-router/package.json'));
const queryRequire = createRequire(routerRequire.resolve('query-string'));
type QueryString = {
  parse: (value: string) => Record<string, string | string[] | null>;
  stringify: (value: Record<string, string | string[] | null>) => string;
};

test('router consumes the patched decoder through its original CommonJS API', () => {
  const decode = queryRequire('decode-uri-component') as (value: string) => string;
  const query = routerRequire('query-string') as QueryString;
  assert.equal(typeof decode, 'function');
  assert.equal(decode('caf%C3%A9+%F0%9F%92%AA'), 'café 💪');
  assert.equal(decode('%2B'), '+');
  const values = { id: 'workout-123', note: 'café 💪 & rest', tag: ['strength', 'upper'], optional: null };
  assert.deepEqual({ ...query.parse(query.stringify(values)) }, values);
  assert.equal(query.parse('note=hello+world').note, 'hello world');
});

test('long malformed URL values finish within a bounded subprocess timeout', () => {
  // A subprocess prevents a regression from freezing the entire test runner.
  const modulePath = routerRequire.resolve('query-string');
  const child = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const query = require(${JSON.stringify(modulePath)});
    const input = '%FF'.repeat(6000) + '%C3%A9';
    const parsed = query.parse('note=' + input);
    assert.equal(typeof parsed.note, 'string');
    assert.ok(parsed.note.endsWith('é'));
  `], { encoding: 'utf8', timeout: 3000 });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr);
});

test('Xcode tooling generates valid unique project IDs with the patched UUID package', () => {
  const configRequire = createRequire(rootRequire.resolve('@expo/config-plugins/package.json'));
  const xcodePath = configRequire.resolve('xcode');
  const xcodeRequire = createRequire(xcodePath);
  assert.equal((xcodeRequire('uuid/package.json') as { version: string }).version, '11.1.1');
  const xcode = configRequire('xcode') as {
    project: (path: string) => { hash: { project: { objects: Record<string, unknown> } }; generateUuid: () => string };
  };
  const project = xcode.project('in-memory-test.pbxproj');
  project.hash = { project: { objects: {} } };
  const ids = Array.from({ length: 100 }, () => project.generateUuid());
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => /^[A-F0-9]{24}$/.test(id)));
});
