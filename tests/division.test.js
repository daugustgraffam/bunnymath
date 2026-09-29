import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDivRound, divHint } from '../js/problems.js';
import { makeShareRound, checkShare, shareHint } from '../js/modes/share.js';
import { makeHomesRound, checkHomes, homesHint } from '../js/modes/homes.js';
import { makeHopRound, checkHop, hopHint } from '../js/modes/hopback.js';
import { makeFamilyRound, checkFamily, familyHint } from '../js/modes/family.js';
import { newStats, recordProblem, divFactKey, isDivFactKey } from '../js/stats.js';
import divfacts from '../js/modes/divfacts.js';

const hasNumber = (text, n) => new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(text);

test('division rounds: whole-number answers only, few "easy" rule facts', () => {
  for (let i = 0; i < 200; i++) {
    const round = makeDivRound(5);
    assert.equal(new Set(round.map((p) => `${p.dividend}/${p.divisor}`)).size, 5);
    for (const p of round) {
      assert.ok(p.divisor >= 1 && p.divisor <= 10 && p.quotient >= 0 && p.quotient <= 10);
      assert.equal(p.dividend, p.divisor * p.quotient);
      assert.equal(p.answer, p.quotient);
    }
    assert.ok(round.filter((p) => p.divisor === 1 || p.quotient <= 1).length <= 1);
  }
});

test('÷ fact hints: think multiplication, count by the divisor, then the answer', () => {
  for (let divisor = 2; divisor <= 10; divisor++) {
    for (let quotient = 2; quotient <= 10; quotient++) {
      if (quotient === divisor) continue; // 16 ÷ 4 = 4 shows 4 in the question itself
      const p = { divisor, quotient, dividend: divisor * quotient };
      assert.ok(!hasNumber(divHint(p, 1), quotient), `${p.dividend} ÷ ${divisor} miss 1`);
      assert.ok(!hasNumber(divHint(p, 2), quotient), `${p.dividend} ÷ ${divisor} miss 2`);
      assert.ok(hasNumber(divHint(p, 3), quotient));
    }
  }
  assert.match(divHint({ divisor: 7, quotient: 8, dividend: 56 }, 1), /7 × ▢ = 56/);
  assert.match(divHint({ divisor: 1, quotient: 6, dividend: 6 }, 1), /Dividing by 1/);
  assert.match(divHint({ divisor: 5, quotient: 0, dividend: 0 }, 1), /zero/i);
  assert.match(divHint({ divisor: 6, quotient: 1, dividend: 6 }, 1), /divided by itself is 1/);
});

for (const [name, makeRound, check, hint, ranges] of [
  ['Share the Carrots', makeShareRound, checkShare, shareHint, { d: [2, 5], q: [2, 6] }],
  ['Burrow Homes', makeHomesRound, checkHomes, homesHint, { d: [2, 6], q: [2, 7] }],
  ['Hop Back', makeHopRound, checkHop, hopHint, { d: [2, 6], q: [2, 8] }],
]) {
  test(`${name}: small numbers, checking, and hints that hold back the answer`, () => {
    for (let i = 0; i < 100; i++) {
      for (const p of makeRound(5)) {
        assert.ok(p.divisor >= ranges.d[0] && p.divisor <= ranges.d[1], `${name} divisor ${p.divisor}`);
        assert.ok(p.quotient >= ranges.q[0] && p.quotient <= ranges.q[1], `${name} quotient ${p.quotient}`);
        assert.equal(p.dividend, p.divisor * p.quotient);
        assert.equal(check(p, { answer: String(p.quotient) }).correct, true);
        assert.deepEqual(check(p, { answer: String(p.quotient + 1) }).wrong, ['answer']);
        if (p.quotient !== p.divisor) {
          assert.ok(!hasNumber(hint(p, 1), p.quotient), `${name} miss 1: ${hint(p, 1)}`);
          assert.ok(!hasNumber(hint(p, 2), p.quotient), `${name} miss 2: ${hint(p, 2)}`);
        }
        assert.ok(hasNumber(hint(p, 3), p.quotient));
      }
    }
  });
}

test('fact families: two different numbers, each family once, one right helper', () => {
  for (let i = 0; i < 100; i++) {
    const round = makeFamilyRound(5);
    assert.equal(round[0].kind, 'unknown');
    assert.equal(new Set(round.map((p) => [p.a, p.b].sort().join('x'))).size, 5);
    for (const p of round) {
      assert.notEqual(p.a, p.b);
      assert.equal(p.product, p.a * p.b);
      if (p.kind === 'helper') {
        assert.equal(p.choices.filter((c) => c.correct).length, 1);
        assert.equal(p.choices.find((c) => c.correct).text, `${p.a} × ${p.b} = ${p.product}`);
        assert.equal(new Set(p.choices.map((c) => c.text)).size, 4);
      }
    }
  }
});

test('fact families: checking every box', () => {
  const unknown = { kind: 'unknown', a: 3, b: 4, product: 12 };
  assert.equal(checkFamily(unknown, { factor: '4', quotient: '4' }).correct, true);
  assert.deepEqual(checkFamily(unknown, { factor: '4', quotient: '3' }).wrong, ['quotient']);

  const family = { kind: 'family', a: 3, b: 4, product: 12 };
  assert.equal(checkFamily(family, { times1: '12', times2: '12', divide1: '4', divide2: '3' }).correct, true);
  const swapped = checkFamily(family, { times1: '12', times2: '12', divide1: '3', divide2: '4' });
  assert.deepEqual(swapped.wrong, ['divide1', 'divide2']);
  assert.match(familyHint(family, 1, swapped), /Dividing the top number/);
});

test('fact family "unknown" hints hold back the missing number', () => {
  for (let a = 2; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) {
      if (a === b) continue;
      const p = { kind: 'unknown', a, b, product: a * b };
      const wrong = checkFamily(p, { factor: '0', quotient: '0' });
      assert.ok(!hasNumber(familyHint(p, 1, wrong), b), `${a} × ▢ = ${a * b} miss 1`);
      assert.ok(!hasNumber(familyHint(p, 2, wrong), b), `${a} × ▢ = ${a * b} miss 2`);
      assert.ok(hasNumber(familyHint(p, 3, wrong), b));
    }
  }
});

test('division facts are tracked separately and keep their order', () => {
  const stats = newStats();
  recordProblem(stats, { mode: 'divfacts', subject: 'divide', text: '12 ÷ 3', facts: [[3, 4]], misses: 0, now: 1 });
  recordProblem(stats, { mode: 'divfacts', subject: 'divide', text: '12 ÷ 4', facts: [[4, 3]], misses: 1, now: 2 });
  recordProblem(stats, { mode: 'facts', text: '3 × 4', facts: [[3, 4]], misses: 0, now: 3 });
  assert.equal(divFactKey(3, 4), 'd3x4');
  assert.deepEqual(Object.keys(stats.facts).sort(), ['3x4', 'd3x4', 'd4x3']);
  assert.equal(isDivFactKey('d3x4'), true);
  assert.equal(isDivFactKey('3x4'), false);
});

test('Quick ÷ Facts reports the division fact it practiced', () => {
  for (const p of divfacts.makeRound(5)) {
    assert.deepEqual(divfacts.facts(p), [[p.divisor, p.quotient]]);
    assert.equal(divfacts.check(p, { answer: String(p.quotient) }).correct, true);
  }
});
