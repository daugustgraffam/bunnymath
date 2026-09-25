import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFact, makeRound, checkAnswer, hintFor, isEasyFact, MIN_FACTOR, MAX_FACTOR } from '../js/problems.js';

test('makeFact stays within 0-10 and computes the product', () => {
  for (let i = 0; i < 1000; i++) {
    const { a, b, answer } = makeFact();
    assert.ok(a >= MIN_FACTOR && a <= MAX_FACTOR);
    assert.ok(b >= MIN_FACTOR && b <= MAX_FACTOR);
    assert.equal(answer, a * b);
  }
});

test('makeRound returns unique facts with at most one easy fact', () => {
  for (let i = 0; i < 200; i++) {
    const facts = makeRound(5);
    assert.equal(facts.length, 5);
    assert.equal(new Set(facts.map((f) => `${f.a}x${f.b}`)).size, 5);
    assert.ok(facts.filter(isEasyFact).length <= 1);
  }
});

test('checkAnswer accepts only whole-number matches', () => {
  const fact = { a: 4, b: 3, answer: 12 };
  assert.equal(checkAnswer(fact, '12'), true);
  assert.equal(checkAnswer(fact, ' 12 '), true);
  assert.equal(checkAnswer(fact, '11'), false);
  assert.equal(checkAnswer(fact, ''), false);
  assert.equal(checkAnswer(fact, '12a'), false);
  assert.equal(checkAnswer(fact, '-12'), false);
  assert.equal(checkAnswer(fact, '1 2'), false);
});

test('first two hints never give away the answer', () => {
  for (let a = 2; a <= 10; a++) {
    for (let b = 2; b <= 10; b++) {
      const fact = { a, b, answer: a * b };
      const answer = new RegExp(`\\b${fact.answer}\\b`);
      assert.doesNotMatch(hintFor(fact, 1), answer, `${a}x${b} hint 1`);
      assert.doesNotMatch(hintFor(fact, 2), answer, `${a}x${b} hint 2`);
    }
  }
});

test('third hint reveals the answer', () => {
  assert.match(hintFor({ a: 7, b: 8, answer: 56 }, 3), /\b56\b/);
});

test('skip-count hint stops one hop short', () => {
  assert.equal(hintFor({ a: 4, b: 3, answer: 12 }, 2), 'Count by 3s: 3, 6, 9... one more hop!');
});
