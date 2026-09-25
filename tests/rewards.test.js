import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newState, feedVisitor, earnCarrots, totalMet, loadState, saveState, clearState, migrateV1, migrateV2, HEARTS_TO_FULL,
} from '../js/rewards.js';
import { FIELD_SIZE, generateField } from '../js/world.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

// Feeds until the next friend is made (or carrots run out) and returns that result.
function makeFriend(state) {
  let result;
  do result = feedVisitor(state); while (result.ok && !result.met);
  return result;
}

test('feeding needs carrots', () => {
  assert.deepEqual(feedVisitor(newState()), { ok: false, reason: 'no-carrots' });
});

test('each carrot adds a heart to the shy visitor', () => {
  const state = newState();
  earnCarrots(state, 3);
  assert.deepEqual(feedVisitor(state), { ok: true, met: null, fieldComplete: null });
  assert.equal(state.carrots, 2);
  assert.equal(state.visitorFed, 1);
});

test('a full visitor becomes a friend and the next one appears', () => {
  const state = newState();
  earnCarrots(state, HEARTS_TO_FULL);
  const result = makeFriend(state);
  assert.deepEqual(result.met, { field: 0, slot: 0 });
  assert.equal(result.fieldComplete, null);
  const { fields, ...counts } = state;
  assert.deepEqual(counts, { carrots: 0, field: 0, met: 1, visitorFed: 0 });
  assert.equal(fields.length, 1);
});

test('the 25th friend completes the field and Bun Bun moves on', () => {
  const state = newState();
  earnCarrots(state, HEARTS_TO_FULL * FIELD_SIZE * 2);
  for (let i = 0; i < FIELD_SIZE - 1; i++) assert.equal(makeFriend(state).fieldComplete, null);
  const last = makeFriend(state);
  assert.deepEqual(last.met, { field: 0, slot: FIELD_SIZE - 1 });
  assert.equal(last.fieldComplete, 0);
  assert.equal(state.field, 1);
  assert.equal(state.met, 0);
  assert.equal(totalMet(state), 25);
  assert.equal(state.fields.length, 2, 'the new field is saved on arrival');
  assert.deepEqual(state.fields[1], generateField(1));

  for (let i = 0; i < FIELD_SIZE; i++) makeFriend(state);
  assert.equal(state.field, 2);
  assert.equal(totalMet(state), 50);
});

test('totalMet counts whole fields of 25 plus this field', () => {
  assert.equal(totalMet({ field: 3, met: 7 }), 82);
});

test('state survives a save and load', () => {
  const storage = fakeStorage();
  const state = newState();
  earnCarrots(state, HEARTS_TO_FULL * FIELD_SIZE + 4);
  for (let i = 0; i < FIELD_SIZE + 3; i++) makeFriend(state);
  saveState(state, storage);
  assert.deepEqual(loadState(storage), state);
});

test('saved fields are used as-is, never regenerated', () => {
  const storage = fakeStorage();
  const state = newState();
  state.fields[0].bunnies[0] = { name: 'Zed', fur: '#123456', accessory: 'retiredHat', mood: 'calm' };
  state.fields[0].name = 'Old Name Meadow';
  saveState(state, storage);
  const loaded = loadState(storage);
  assert.deepEqual(loaded.fields[0].bunnies[0], { name: 'Zed', fur: '#123456', accessory: 'retiredHat', mood: 'calm' });
  assert.equal(loaded.fields[0].name, 'Old Name Meadow');
});

test('corrupt or missing storage starts fresh', () => {
  const storage = fakeStorage();
  storage.setItem('bunnymath.v3', '{not json');
  assert.deepEqual(loadState(storage), newState());

  const tooMany = newState();
  tooMany.met = FIELD_SIZE;
  storage.setItem('bunnymath.v3', JSON.stringify(tooMany));
  assert.deepEqual(loadState(storage), newState());

  const missingField = { ...newState(), field: 1 };
  storage.setItem('bunnymath.v3', JSON.stringify(missingField));
  assert.deepEqual(loadState(storage), newState());

  assert.deepEqual(loadState(null), newState());
});

test('v2 saves keep their progress and get their fields saved', () => {
  const v2 = { carrots: 9, field: 2, met: 6, visitorFed: 1 };
  const migrated = migrateV2(v2);
  assert.deepEqual(migrated.fields, [generateField(0), generateField(1), generateField(2)]);

  const storage = fakeStorage();
  storage.setItem('bunnymath.v2', JSON.stringify(v2));
  assert.deepEqual(loadState(storage), migrated);
});

test('v1 saves carry over carrots and met bunnies', () => {
  const v1 = { carrots: 7, bunnies: [{ id: 0, fed: 5 }, { id: 1, fed: 5 }, { id: 2, fed: 5 }, { id: 3, fed: 2 }] };
  const expected = { carrots: 7, field: 0, met: 2, visitorFed: 2, fields: [generateField(0)] };
  assert.deepEqual(migrateV1(v1), expected);

  const storage = fakeStorage();
  storage.setItem('bunnymath.v1', JSON.stringify(v1));
  assert.deepEqual(loadState(storage), expected);
  clearState(storage);
  assert.deepEqual(loadState(storage), newState());
});
