// Carrots, meeting bunnies, and saved progress.
//
// Saved state: carrots, which field Bun Bun is in, how many of its bunnies you've
// met, how many hearts the current shy visitor has, and every field reached so far
// (name, colors, and all 25 bunnies), saved when Bun Bun first arrives so the
// bunnies a kid has seen never change.

import { FIELD_SIZE, generateField } from './world.js';

export const HEARTS_TO_FULL = 5;
export const CARROTS_FIRST_TRY = 2;
export const CARROTS_WITH_HELP = 1;

const STORAGE_KEY = 'bunnymath.v3';
const V2_STORAGE_KEY = 'bunnymath.v2';
const V1_STORAGE_KEY = 'bunnymath.v1';

export function newState() {
  return { carrots: 0, field: 0, met: 0, visitorFed: 0, fields: [generateField(0)] };
}

export function totalMet(state) {
  return state.field * FIELD_SIZE + state.met;
}

export function earnCarrots(state, n) {
  state.carrots += n;
}

// Feeds one carrot to the shy visitor. A full visitor becomes a friend; the
// 25th friend completes the field and Bun Bun moves on to the next one.
export function feedVisitor(state) {
  if (state.carrots <= 0) return { ok: false, reason: 'no-carrots' };
  state.carrots -= 1;
  state.visitorFed += 1;
  if (state.visitorFed < HEARTS_TO_FULL) return { ok: true, met: null, fieldComplete: null };

  const met = { field: state.field, slot: state.met };
  state.visitorFed = 0;
  state.met += 1;
  if (state.met < FIELD_SIZE) return { ok: true, met, fieldComplete: null };

  state.field += 1;
  state.met = 0;
  state.fields.push(generateField(state.field));
  return { ok: true, met, fieldComplete: met.field };
}

function isCount(n) {
  return Number.isInteger(n) && n >= 0;
}

const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

// Accessory names aren't checked against the art, so retiring a drawing later
// just leaves those bunnies bare instead of throwing away the save.
function isValidBunny(b) {
  return (
    b !== null && typeof b === 'object' &&
    typeof b.name === 'string' && isColor(b.fur) &&
    (b.accessory === undefined || typeof b.accessory === 'string') &&
    (b.accessoryColor === undefined || isColor(b.accessoryColor)) &&
    (b.mood === 'calm' || b.mood === 'happy')
  );
}

function isValidField(f) {
  return (
    f !== null && typeof f === 'object' &&
    typeof f.name === 'string' &&
    f.theme !== null && typeof f.theme === 'object' &&
    isColor(f.theme.top) && isColor(f.theme.bottom) && isColor(f.theme.flower) &&
    Array.isArray(f.bunnies) && f.bunnies.length === FIELD_SIZE && f.bunnies.every(isValidBunny)
  );
}

function isValidCounts(s) {
  return (
    s !== null &&
    typeof s === 'object' &&
    isCount(s.carrots) &&
    isCount(s.field) &&
    isCount(s.met) && s.met < FIELD_SIZE &&
    isCount(s.visitorFed) && s.visitorFed < HEARTS_TO_FULL
  );
}

function isValidState(s) {
  return isValidCounts(s) && Array.isArray(s.fields) && s.fields.length === s.field + 1 && s.fields.every(isValidField);
}

// v2 saved only counts and regenerated fields from their number every time.
// It only existed briefly during prototyping; those saves keep their progress
// but get freshly generated fields.
export function migrateV2(old) {
  if (!isValidCounts(old)) return null;
  const { carrots, field, met, visitorFed } = old;
  const fields = Array.from({ length: field + 1 }, (_, i) => generateField(i));
  return { carrots, field, met, visitorFed, fields };
}

// v1 kept a list of bunnies with Bun Bun first. Keep the carrots and count
// every other full bunny as already met.
export function migrateV1(old) {
  if (!old || !isCount(old.carrots) || !Array.isArray(old.bunnies)) return null;
  const others = old.bunnies.filter((b) => b && b.id > 0 && isCount(b.fed));
  const met = Math.min(others.filter((b) => b.fed >= HEARTS_TO_FULL).length, FIELD_SIZE - 1);
  const hungry = others.find((b) => b.fed < HEARTS_TO_FULL);
  return migrateV2({ carrots: old.carrots, field: 0, met, visitorFed: hungry ? hungry.fed : 0 });
}

// storage is window.localStorage in the browser; may be null if unavailable.
export function loadState(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (isValidState(saved)) return saved;
    const fromV2 = migrateV2(JSON.parse(storage.getItem(V2_STORAGE_KEY)));
    if (isValidState(fromV2)) return fromV2;
    const fromV1 = migrateV1(JSON.parse(storage.getItem(V1_STORAGE_KEY)));
    if (isValidState(fromV1)) return fromV1;
  } catch {
    // Missing, blocked or corrupt storage: start fresh.
  }
  return newState();
}

export function saveState(state, storage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Progress just won't persist this session.
  }
}

export function clearState(storage) {
  try {
    for (const key of [STORAGE_KEY, V2_STORAGE_KEY, V1_STORAGE_KEY]) storage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}
