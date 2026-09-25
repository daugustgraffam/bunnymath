import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFenceRound, checkFence, fenceHint, isSmartSplit, sides, additionHint } from '../js/modes/fence.js';
import { makeCratesRound, checkCrates, cratesHint } from '../js/modes/crates.js';

const hasNumber = (text, n) => new RegExp(`\\b${n}\\b`).test(text);

// ---------- Fence It ----------

test('fence round: two splits first, fill-ins mixed in, big facts only', () => {
  for (let i = 0; i < 100; i++) {
    const round = makeFenceRound(5);
    assert.deepEqual(round.slice(0, 2).map((p) => p.kind), ['split', 'split']);
    assert.equal(round.filter((p) => p.kind === 'fill').length, 2);
    assert.equal(new Set(round.map((p) => `${p.a}x${p.b}`)).size, 5);
    for (const p of round) {
      assert.ok(p.b >= 6 && p.b <= 9 && p.a >= 3 && p.a <= 9 && p.a !== 5);
      if (p.kind === 'fill') {
        assert.equal(p.expected, p.missing === 'part' ? p.b - 5 : p.a * (p.b - 5));
        if (p.missing === 'product') assert.ok(p.b > 6, 'no a × 1 products');
      }
    }
  }
});

test('a split checks both sides and the sum, with a bonus for a side of 5', () => {
  const p = { a: 7, b: 8, answer: 56, kind: 'split', split: 5 };
  assert.deepEqual(sides(p, 5), { left: 5, right: 3, leftProduct: 35, rightProduct: 21 });
  assert.deepEqual(checkFence(p, { left: '35', right: '21', total: '56' }), { correct: true, wrong: [], bonus: 1 });
  assert.deepEqual(checkFence(p, { left: '35', right: '24', total: '59' }).wrong, ['right', 'total']);

  const other = { ...p, split: 4 };
  assert.deepEqual(checkFence(other, { left: '28', right: '28', total: '56' }), { correct: true, wrong: [], bonus: 0 });
  assert.equal(isSmartSplit({ b: 8 }, 3), true, 'a right side of 5 counts too');
});

test('fill-ins check the missing part or product', () => {
  const part = { a: 6, b: 7, answer: 42, kind: 'fill', missing: 'part', expected: 2 };
  assert.equal(checkFence(part, { answer: '2' }).correct, true);
  const product = { ...part, missing: 'product', expected: 12 };
  assert.equal(checkFence(product, { answer: '12' }).correct, true);
  assert.equal(checkFence(product, { answer: '2' }).correct, false);
});

test('fence hints hold back answers until the third miss', () => {
  for (const a of [3, 4, 6, 7, 8, 9]) {
    for (let b = 6; b <= 9; b++) {
      for (let split = 1; split < b; split++) {
        const p = { a, b, answer: a * b, kind: 'split', split };
        const { leftProduct, rightProduct } = sides(p, split);
        const cases = [
          checkFence(p, { left: '0', right: '0', total: '0' }),
          checkFence(p, { left: String(leftProduct), right: '0', total: '0' }),
          checkFence(p, { left: String(leftProduct), right: String(rightProduct), total: '0' }),
        ];
        for (const result of cases) {
          for (const misses of [1, 2]) {
            assert.ok(!hasNumber(fenceHint(p, misses, result), p.answer), `${a}x${b} split ${split} miss ${misses}`);
          }
        }
        assert.ok(hasNumber(fenceHint(p, 3, cases[2]), p.answer));
      }
      for (const missing of b > 6 ? ['part', 'product'] : ['part']) {
        const expected = missing === 'part' ? b - 5 : a * (b - 5);
        const p = { a, b, answer: a * b, kind: 'fill', missing, expected };
        const wrong = checkFence(p, { answer: '0' });
        assert.ok(!hasNumber(fenceHint(p, 1, wrong), expected), `${a}x${b} ${missing} miss 1`);
        assert.ok(!hasNumber(fenceHint(p, 2, wrong), expected), `${a}x${b} ${missing} miss 2`);
        assert.ok(hasNumber(fenceHint(p, 3, wrong), expected));
      }
    }
  }
});

test('the adding hint splits tens and ones', () => {
  assert.equal(additionHint(35, 21), 'Add the tens: 30 + 20 = 50. Add the ones: 5 + 1 = 6. Put them together!');
});

// ---------- Carrot Crates ----------

test('crates round: two step-by-step problems first, then shortcuts', () => {
  for (let i = 0; i < 100; i++) {
    const round = makeCratesRound(5);
    assert.deepEqual(round.slice(0, 2).map((p) => p.kind), ['tens', 'tens']);
    assert.deepEqual(new Set(round.slice(2).map((p) => p.kind)), new Set(['quick', 'missing']));
    for (const p of round) {
      assert.ok(p.a >= 2 && p.a <= 9 && p.tens >= 2 && p.tens <= 9);
      assert.equal(p.multiple, p.tens * 10);
      assert.equal(p.answer, p.a * p.multiple);
    }
  }
});

test('crates checks each kind', () => {
  const tens = { kind: 'tens', a: 4, tens: 3, multiple: 30, answer: 120 };
  assert.equal(checkCrates(tens, { tens: '12', total: '120' }).correct, true);
  assert.deepEqual(checkCrates(tens, { tens: '12', total: '12' }).wrong, ['total']);
  assert.equal(checkCrates({ ...tens, kind: 'quick' }, { answer: '120' }).correct, true);
  assert.equal(checkCrates({ ...tens, kind: 'missing' }, { answer: '30' }).correct, true);
  assert.equal(checkCrates({ ...tens, kind: 'missing' }, { answer: '3' }).correct, false);
});

test('crates hints hold back answers until the third miss', () => {
  for (let a = 2; a <= 9; a++) {
    for (let t = 2; t <= 9; t++) {
      const base = { a, tens: t, multiple: t * 10, answer: a * t * 10 };
      const tens = { ...base, kind: 'tens' };
      for (const result of [
        checkCrates(tens, { tens: '0', total: '0' }),
        checkCrates(tens, { tens: String(a * t), total: '0' }),
      ]) {
        for (const misses of [1, 2]) {
          assert.ok(!hasNumber(cratesHint(tens, misses, result), base.answer), `${a}x${t}0 tens miss ${misses}`);
        }
      }
      const quick = { ...base, kind: 'quick' };
      const missing = { ...base, kind: 'missing' };
      for (const misses of [1, 2]) {
        assert.ok(!hasNumber(cratesHint(quick, misses, checkCrates(quick, { answer: '0' })), base.answer));
        assert.ok(!hasNumber(cratesHint(missing, misses, checkCrates(missing, { answer: '0' })), base.multiple));
      }
      assert.ok(hasNumber(cratesHint(quick, 3, {}), base.answer));
      assert.ok(hasNumber(cratesHint(missing, 3, {}), base.multiple));
    }
  }
});
