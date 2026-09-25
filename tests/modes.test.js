import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeGroupsRound, checkGroups, groupsHint } from '../js/modes/groups.js';
import { makeFlipRound, makeChoices, checkFlip, flipHint } from '../js/modes/flip.js';
import { uniquePairs } from '../js/problems.js';

const hasNumber = (text, n) => new RegExp(`\\b${n}\\b`).test(text);

// ---------- shared ----------

test('uniquePairs respects ranges, uniqueness and accept', () => {
  const pairs = uniquePairs(10, { aMin: 2, aMax: 6, bMin: 3, bMax: 9, accept: (a, b) => a !== b });
  assert.equal(new Set(pairs.map((p) => `${p.a}x${p.b}`)).size, 10);
  for (const { a, b, answer } of pairs) {
    assert.ok(a >= 2 && a <= 6 && b >= 3 && b <= 9 && a !== b);
    assert.equal(answer, a * b);
  }
});

// ---------- Burrow Groups ----------

test('groups round starts with burrows and mixes in carrot patches', () => {
  for (let i = 0; i < 100; i++) {
    const round = makeGroupsRound(5);
    assert.equal(round.length, 5);
    assert.equal(round[0].kind, 'groups');
    assert.equal(round.filter((p) => p.kind === 'array').length, 2);
    for (const p of round) assert.ok(p.a >= 2 && p.a <= 6 && p.b >= 2 && p.b <= 9);
  }
});

test('checkGroups marks each wrong box', () => {
  const p = { kind: 'groups', a: 4, b: 3, answer: 12 };
  assert.deepEqual(checkGroups(p, { groups: '4', each: '3', total: '12' }), { correct: true, wrong: [], swapped: false });
  assert.deepEqual(checkGroups(p, { groups: '4', each: '3', total: '11' }).wrong, ['total']);
  assert.deepEqual(checkGroups(p, { groups: '5', each: '3', total: '12' }).wrong, ['groups']);
});

test('checkGroups spots swapped factors', () => {
  const p = { kind: 'groups', a: 4, b: 3, answer: 12 };
  const result = checkGroups(p, { groups: '3', each: '4', total: '12' });
  assert.equal(result.correct, false);
  assert.equal(result.swapped, true);
  assert.match(groupsHint(p, 1, result), /first number is how many burrows/);
});

test('groups hints hold back the total until the third miss', () => {
  for (const kind of ['groups', 'array']) {
    for (let a = 2; a <= 6; a++) {
      for (let b = 2; b <= 9; b++) {
        const p = { kind, a, b, answer: a * b };
        const result = checkGroups(p, { groups: String(a), each: String(b), total: '0' });
        assert.ok(!hasNumber(groupsHint(p, 1, result), p.answer), `${kind} ${a}x${b} miss 1`);
        assert.ok(!hasNumber(groupsHint(p, 2, result), p.answer), `${kind} ${a}x${b} miss 2`);
        assert.ok(hasNumber(groupsHint(p, 3, result), p.answer), `${kind} ${a}x${b} miss 3`);
      }
    }
  }
});

// ---------- Flip the Patch ----------

test('flip round starts with a flip and has no squares or repeated pairs', () => {
  for (let i = 0; i < 100; i++) {
    const round = makeFlipRound(5);
    assert.equal(round[0].kind, 'flip');
    assert.deepEqual(new Set(round.map((p) => p.kind)), new Set(['flip', 'match', 'missing']));
    const unordered = round.map((p) => [p.a, p.b].sort().join('x'));
    assert.equal(new Set(unordered).size, 5);
    for (const p of round) assert.notEqual(p.a, p.b);
  }
});

test('match choices: one flipped answer, three distinct wrong ones', () => {
  for (let a = 2; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) {
      if (a === b) continue;
      const choices = makeChoices(a, b);
      assert.equal(choices.length, 4, `${a}x${b}`);
      assert.equal(new Set(choices.map((c) => c.text)).size, 4, `${a}x${b} duplicate text`);
      assert.deepEqual(choices.filter((c) => c.correct).map((c) => c.text), [`${b} × ${a}`]);
      for (const c of choices.filter((c) => !c.correct)) assert.notEqual(c.value, a * b, `${a}x${b}: ${c.text}`);
    }
  }
});

test('checkFlip handles each kind', () => {
  assert.equal(checkFlip({ kind: 'flip', a: 3, b: 7, answer: 21 }, { answer: '21' }).correct, true);
  assert.equal(checkFlip({ kind: 'missing', a: 3, b: 7, answer: 21 }, { answer: '3' }).correct, true);
  assert.equal(checkFlip({ kind: 'missing', a: 3, b: 7, answer: 21 }, { answer: '7' }).correct, false);

  const choices = [{ text: '3 + 7', value: 10, adds: true }, { text: '7 × 3', correct: true }];
  const match = { kind: 'match', a: 3, b: 7, answer: 21, choices };
  assert.equal(checkFlip(match, { choice: '1' }).correct, true);
  const wrong = checkFlip(match, { choice: '0' });
  assert.deepEqual(wrong, { correct: false, wrong: ['choice'], adds: true });
  assert.match(flipHint(match, 1, wrong), /adds instead of multiplying/);
});
