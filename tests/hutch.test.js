import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHutchRound, makeTriple, checkHutch, hutchHint, easyRoutes, isSmartPick, ROUTES } from '../js/modes/hutch.js';

const hasNumber = (text, n) => new RegExp(`\\b${n}\\b`).test(text);

// Every triple the generator can make.
function allTriples() {
  const triples = [];
  for (let a = 2; a <= 5; a++) {
    for (let b = 2; b <= 5; b++) {
      for (let c = 2; c <= 9; c++) {
        const p = { a, b, c, answer: a * b * c };
        if (p.answer <= 80 && easyRoutes(p).length > 0) triples.push(p);
      }
    }
  }
  return triples;
}

test('triples always have at least one easy grouping and stay small', () => {
  let onlyOneEasy = 0;
  for (let i = 0; i < 500; i++) {
    const t = makeTriple();
    assert.ok(t.a >= 2 && t.a <= 5 && t.b >= 2 && t.b <= 5 && t.c >= 2 && t.c <= 9);
    assert.equal(t.answer, t.a * t.b * t.c);
    assert.ok(t.answer <= 80);
    const easy = easyRoutes(t);
    assert.ok(easy.length >= 1);
    if (easy.length === 1) onlyOneEasy += 1;
  }
  assert.ok(onlyOneEasy > 250, `most triples should make the choice matter (${onlyOneEasy}/500)`);
});

test('round: two choose problems first, regroups mixed in, no repeats', () => {
  for (let i = 0; i < 100; i++) {
    const round = makeHutchRound(5);
    assert.deepEqual(round.slice(0, 2).map((p) => p.kind), ['choose', 'choose']);
    assert.equal(round.filter((p) => p.kind === 'regroup').length, 2);
    assert.equal(new Set(round.map((p) => `${p.a}x${p.b}x${p.c}`)).size, 5);
    for (const p of round.filter((q) => q.kind === 'regroup')) {
      const target = p.from === 'left' ? 'right' : 'left';
      assert.equal(p.expected, ROUTES[target].first(p));
      assert.ok(p.expected <= 10, 'regroup boxes hold an easy number');
    }
  }
});

test('the two routes: (a × b) × c counts shelves, a × (b × c) counts one hutch', () => {
  const p = { a: 2, b: 5, c: 7, answer: 70 };
  assert.equal(ROUTES.left.first(p), 10);
  assert.equal(ROUTES.right.first(p), 35);
  assert.equal(ROUTES.left.grouped(p), '(2 × 5) × 7');
  assert.equal(ROUTES.right.second(p, 35), '2 × 35');
});

test('checking both steps, with a bonus carrot for the only easy route', () => {
  const smart = { a: 2, b: 5, c: 7, answer: 70, kind: 'choose', route: 'left' };
  assert.deepEqual(checkHutch(smart, { first: '10', total: '70' }), { correct: true, wrong: [], bonus: 1 });
  assert.deepEqual(checkHutch(smart, { first: '10', total: '60' }).wrong, ['total']);
  assert.deepEqual(checkHutch(smart, { first: '12', total: '70' }).wrong, ['first']);

  const harder = { ...smart, route: 'right' };
  assert.deepEqual(checkHutch(harder, { first: '35', total: '70' }), { correct: true, wrong: [], bonus: 0 });

  const bothEasy = { a: 2, b: 2, c: 3, answer: 12, kind: 'choose', route: 'left' };
  assert.equal(isSmartPick(bothEasy, 'left'), false);
  assert.equal(checkHutch(bothEasy, { first: '4', total: '12' }).bonus, 0);
});

test('regroup checks the missing number', () => {
  // (3 × 2) × 4 = 3 × ▢  →  ▢ = 2 × 4 = 8
  const p = { a: 3, b: 2, c: 4, answer: 24, kind: 'regroup', from: 'left', expected: 8 };
  assert.equal(checkHutch(p, { answer: '8' }).correct, true);
  assert.equal(checkHutch(p, { answer: '6' }).correct, false);
});

test('hints hold back the answers until the third miss', () => {
  for (const t of allTriples()) {
    for (const route of ['left', 'right']) {
      const p = { ...t, kind: 'choose', route };
      const first = ROUTES[route].first(p);
      const stepOneWrong = checkHutch(p, { first: '0', total: '0' });
      const stepTwoWrong = checkHutch(p, { first: String(first), total: '0' });
      for (const misses of [1, 2]) {
        const label = `${p.a}x${p.b}x${p.c} ${route} miss ${misses}`;
        assert.ok(!hasNumber(hutchHint(p, misses, stepOneWrong), p.answer), `${label}: total in step 1 hint`);
        assert.ok(!hasNumber(hutchHint(p, misses, stepTwoWrong), p.answer), `${label}: total in step 2 hint`);
      }
      assert.ok(hasNumber(hutchHint(p, 3, stepTwoWrong), p.answer));
    }
    for (const from of ['left', 'right']) {
      const target = from === 'left' ? 'right' : 'left';
      const p = { ...t, kind: 'regroup', from, expected: ROUTES[target].first(t) };
      const wrong = checkHutch(p, { answer: '0' });
      assert.ok(!hasNumber(hutchHint(p, 1, wrong), p.expected), `${p.a}x${p.b}x${p.c} regroup ${from} miss 1`);
      assert.ok(!hasNumber(hutchHint(p, 2, wrong), p.expected), `${p.a}x${p.b}x${p.c} regroup ${from} miss 2`);
      assert.ok(hasNumber(hutchHint(p, 3, wrong), p.expected));
    }
  }
});

test('a hard second step gets a break-it-apart hint', () => {
  const p = { a: 3, b: 4, c: 2, answer: 24, kind: 'choose', route: 'left' };
  const result = checkHutch(p, { first: '12', total: '0' });
  assert.equal(hutchHint(p, 2, result), 'Step 2: Break it apart: 10 × 2 = 20, and 2 × 2 = 4. Add them up!');
});
