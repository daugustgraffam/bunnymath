import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newStats, recordProblem, factStatus, factKey, dayKey, outcomeOf, loadStats, saveStats, clearStats,
  RECENT_LIMIT, MAX_PROBLEM_MS,
} from '../js/stats.js';
import facts from '../js/modes/facts.js';
import groups from '../js/modes/groups.js';
import flip from '../js/modes/flip.js';
import hutch from '../js/modes/hutch.js';
import fence from '../js/modes/fence.js';
import crates from '../js/modes/crates.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

const NOON = new Date(2026, 8, 25, 12, 0).getTime();
const record = (stats, overrides) => recordProblem(stats, {
  mode: 'facts', text: '7 × 8', facts: [[7, 8]], misses: 0, ms: 5000, now: NOON, ...overrides,
});

test('outcomes: first try, after a hint, or answer shown', () => {
  assert.equal(outcomeOf(0), 'first');
  assert.equal(outcomeOf(1), 'helped');
  assert.equal(outcomeOf(2), 'helped');
  assert.equal(outcomeOf(3), 'shown');
});

test('7 × 8 and 8 × 7 are one fact', () => {
  assert.equal(factKey(8, 7), '7x8');
  assert.equal(factKey(7, 8), '7x8');
});

test('recording updates the fact, the game, the day and the recent log', () => {
  const stats = newStats();
  record(stats, { misses: 2, tries: ['54', '48'], bonus: 1 });
  record(stats, { facts: [[8, 7]], now: NOON + 1000 });

  assert.deepEqual(stats.facts['7x8'], { seen: 2, first: 1, helped: 1, shown: 0, last: NOON + 1000, history: 'hf' });
  assert.deepEqual(stats.modes.facts, { problems: 2, first: 1, bonus: 1, ms: 10000, last: NOON + 1000 });
  assert.deepEqual(stats.days[dayKey(NOON)], { problems: 2, first: 1, ms: 10000 });
  assert.equal(stats.recent.length, 2);
  assert.deepEqual(stats.recent[1], { time: NOON, mode: 'facts', text: '7 × 8', outcome: 'helped', tries: ['54', '48'], bonus: 1 });
});

test('a fact listed twice in one problem counts once', () => {
  const stats = newStats();
  record(stats, { facts: [[2, 3], [3, 2]] });
  assert.equal(stats.facts['2x3'].seen, 1);
});

test('long pauses count as a break, not practice time', () => {
  const stats = newStats();
  record(stats, { ms: 60 * 60 * 1000 });
  assert.equal(stats.modes.facts.ms, MAX_PROBLEM_MS);
});

test('the recent log is capped', () => {
  const stats = newStats();
  for (let i = 0; i < RECENT_LIMIT + 20; i++) record(stats, { now: NOON + i });
  assert.equal(stats.recent.length, RECENT_LIMIT);
  assert.equal(stats.recent[0].time, NOON + RECENT_LIMIT + 19, 'newest first');
});

test('fact status comes from the last three outcomes', () => {
  assert.equal(factStatus(undefined), 'new');
  const fact = (history) => ({ seen: history.length, history });
  assert.equal(factStatus(fact('f')), 'learning');
  assert.equal(factStatus(fact('ff')), 'learning');
  assert.equal(factStatus(fact('fff')), 'mastered');
  assert.equal(factStatus(fact('hffff')), 'mastered', 'an old slip is forgiven');
  assert.equal(factStatus(fact('fffhf')), 'shaky');
  assert.equal(factStatus(fact('s')), 'shaky');
});

test('history survives a save and load; bad data starts fresh', () => {
  const storage = fakeStorage();
  const stats = newStats();
  record(stats, {});
  saveStats(stats, storage);
  assert.deepEqual(loadStats(storage), stats);

  storage.setItem('bunnymath.stats.v1', '{nope');
  assert.deepEqual(loadStats(storage), newStats());
  assert.deepEqual(loadStats(null), newStats());
  saveStats(stats, storage);
  clearStats(storage);
  assert.deepEqual(loadStats(storage), newStats());
});

test('every game describes its problems and lists times-table facts within 0–10', () => {
  for (const mode of [facts, groups, flip, hutch, fence, crates]) {
    for (let i = 0; i < 50; i++) {
      for (const problem of mode.makeRound(5)) {
        // Choose-a-route and fence problems get their route/split from the child.
        if (mode === hutch && problem.kind === 'choose') problem.route = i % 2 ? 'left' : 'right';
        if (mode === fence && problem.kind === 'split') problem.split = 1 + (i % (problem.b - 1));
        const text = mode.describe(problem);
        assert.ok(typeof text === 'string' && text.length > 0, `${mode.id} describe`);
        const pairs = mode.facts(problem);
        assert.ok(pairs.length > 0, `${mode.id} facts`);
        for (const [a, b] of pairs) {
          assert.ok(Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a <= 10 && b <= 10,
            `${mode.id} ${text}: fact ${a} × ${b}`);
        }
      }
    }
  }
});

test('games report the facts a child actually worked out', () => {
  assert.deepEqual(fence.facts({ kind: 'split', a: 7, b: 8, split: 5 }), [[7, 8], [7, 5], [7, 3]]);
  assert.deepEqual(hutch.facts({ kind: 'choose', a: 2, b: 5, c: 7, route: 'left' }), [[2, 5], [10, 7]]);
  assert.deepEqual(hutch.facts({ kind: 'choose', a: 4, b: 4, c: 2, route: 'left' }), [[4, 4]], 'no 16 × 2');
  assert.deepEqual(crates.facts({ kind: 'quick', a: 4, tens: 3, multiple: 30, answer: 120 }), [[4, 3]]);
  assert.equal(fence.describe({ kind: 'split', a: 7, b: 8, split: 5 }), '7 × 8 = 7 × 5 + 7 × 3');
});
