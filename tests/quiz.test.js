import { test } from 'node:test';
import assert from 'node:assert/strict';
import quiz, { makeQuizRound, checkQuiz, quizHint, clueText, story, KINDS } from '../js/modes/quiz.js';

const hasNumber = (text, n) => new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(text);
// "4 × 5 and 4 × 3" → 32
const valueOf = (text) => text.split(' and ').reduce((sum, fact) => {
  const [a, b] = fact.split(' × ').map(Number);
  return sum + a * b;
}, 0);

function many(kind, n = 300) {
  const out = [];
  while (out.length < n) out.push(...makeQuizRound().filter((p) => p.kind === kind));
  return out;
}

test('a round is 10 questions, one of each kind', () => {
  for (let i = 0; i < 50; i++) {
    const round = makeQuizRound();
    assert.equal(round.length, 10);
    assert.deepEqual(new Set(round.map((p) => p.kind)), new Set(KINDS));
  }
});

test('array questions: exactly one pair of facts makes the patch', () => {
  for (const p of many('arrayPick')) {
    const right = p.choices.filter((c) => c.correct);
    assert.equal(right.length, 1);
    assert.equal(valueOf(right[0].text), p.rows * p.cols);
    assert.equal(p.choices.length, 4);
    for (const c of p.choices.filter((x) => !x.correct)) assert.notEqual(valueOf(c.text), p.rows * p.cols, c.text);
  }
});

test('Distributive Property yes/no matches whether the equation is true', () => {
  for (const p of many('distYesNo')) {
    const [left, right] = p.statement.split(' = ');
    const [a, b] = left.split(' × ').map(Number);
    const rightValue = right.includes('(')
      ? Function(`return ${right.replace(/×/g, '*')}`)()
      : Number(right);
    assert.equal(p.works, rightValue === a * b, p.statement);
    assert.equal(p.choices.find((c) => c.correct).text, p.works ? 'Yes' : 'No');
  }
});

test('select-all: 5 choices, 2 or 3 that work, the rest don\'t', () => {
  for (const p of many('selectAll')) {
    assert.equal(p.options.length, 5);
    const right = p.options.filter((o) => o.correct);
    assert.ok(right.length >= 2 && right.length <= 3);
    for (const o of p.options) assert.equal(valueOf(o.text) === p.a * p.b, o.correct, `${p.a}×${p.b}: ${o.text}`);
    assert.equal(new Set(p.options.map((o) => o.text)).size, 5);
  }
});

test('select-all checking: wrong picks and missing ones', () => {
  const p = {
    kind: 'selectAll', a: 4, b: 8, answer: 32,
    options: [{ text: '2 × 8 and 2 × 8', correct: true }, { text: '2 × 8 and 2 × 9', correct: false },
      { text: '4 × 5 and 4 × 3', correct: true }, { text: '2 × 4 and 1 × 8', correct: false }, { text: '3 × 8 and 1 × 8', correct: true }],
  };
  const pick = (...indexes) => Object.fromEntries(p.options.map((_, i) => [`opt${i}`, indexes.includes(i)]));
  assert.deepEqual(checkQuiz(p, pick(0, 2, 4)), { correct: true, wrong: [], missing: 0 });
  assert.deepEqual(checkQuiz(p, pick(0, 1, 2)), { correct: false, wrong: ['opt1'], missing: 1 });
  assert.deepEqual(checkQuiz(p, pick(0)), { correct: false, wrong: [], missing: 2 });
  assert.match(quizHint(p, 1, checkQuiz(p, pick(0))), /More of them work/);
});

test('big patch accepts rows × columns either way round', () => {
  const p = { kind: 'bigArray', m: 3, p: 5, n: 4, answer: 32 };
  assert.equal(checkQuiz(p, { rows: '8', cols: '4', total: '32' }).correct, true);
  assert.equal(checkQuiz(p, { rows: '4', cols: '8', total: '32' }).correct, true);
  assert.deepEqual(checkQuiz(p, { rows: '8', cols: '3', total: '32' }).wrong, ['rows', 'cols']);
});

test('typed-answer hints hold back the answer until the third miss', () => {
  for (const kind of ['bigArray', 'threeFactor', 'wordGroups', 'wordSplit', 'equationFill']) {
    for (const p of many(kind, 200)) {
      const expected = p.expected ?? p.answer;
      const wrongInputs = { answer: '0', rows: '0', cols: '0', total: '0', five: '0', ten: '0' };
      const cases = [checkQuiz(p, wrongInputs)];
      if (kind === 'bigArray') cases.push(checkQuiz(p, { rows: String(p.m + p.p), cols: String(p.n), total: '0' }));
      if (kind === 'equationFill' && p.variant === 'tens') cases.push(checkQuiz(p, { five: String(5 * p.n), ten: '0' }));
      for (const result of cases) {
        for (const misses of [1, 2]) {
          assert.ok(!hasNumber(quizHint(p, misses, result), expected), `${kind} ${JSON.stringify(p)} miss ${misses}: ${quizHint(p, misses, result)}`);
        }
        assert.ok(hasNumber(quizHint(p, 3, result), expected), `${kind} miss 3 reveals`);
      }
    }
  }
});

test('word problems use sensible numbers', () => {
  for (const p of many('wordSplit')) assert.ok(p.x + p.y <= 10 && p.answer === (p.x + p.y) * p.c);
  for (const p of many('threeFactor')) assert.equal(p.answer, p.a * p.b * p.c);
  for (const p of many('bigArray')) assert.ok(p.m + p.p <= 9);
});

// Evaluates an expression like "(6 + 4) × 3".
const evaluate = (text) => Function(`return ${text.replace(/×/g, '*')}`)();

test('match-the-story: exactly one expression matches, and it gives the story\'s answer', () => {
  for (const p of many('matchStory')) {
    assert.equal(p.choices.length, 4);
    assert.equal(new Set(p.choices.map((c) => c.text)).size, 4, p.choices.map((c) => c.text).join(' | '));
    const right = p.choices.filter((c) => c.correct);
    assert.equal(right.length, 1);
    assert.equal(evaluate(right[0].text), p.answer, `${p.shape}: ${right[0].text}`);
  }
});

test('match-the-story covers all three shapes', () => {
  assert.deepEqual(new Set(many('matchStory').map((p) => p.shape)), new Set(['allTimes', 'addThenTimes', 'timesThenAdd']));
});

test('what\'s next: the right choice uses the sign outside the ( )', () => {
  for (const p of many('nextStep')) {
    const right = p.choices.find((c) => c.correct).text;
    assert.ok(right.includes(p.op), `${p.plain} → ${right}`);
    assert.equal(evaluate(right), p.answer);
    assert.equal(evaluate(p.plain), p.answer, 'the next step keeps the same total');
    const outside = p.statement.match(/<span class="outside-sign">(.)<\/span>/)[1];
    assert.equal(outside, p.op);
  }
});

test('stories: every multiply step is marked with an "each" clue; add clues only on two-part stories', () => {
  for (const kind of ['threeFactor', 'wordGroups', 'wordSplit', 'matchStory']) {
    for (const p of many(kind, 100)) {
      const text = story(p);
      const plain = clueText(text);
      assert.doesNotMatch(plain, /\[|\]/, 'no leftover markers');
      const times = [...text.matchAll(/\[×:([^\]]+)\]/g)].map((m) => m[1]);
      assert.ok(times.length >= 1, `${kind}: ${text}`);
      for (const clue of times) assert.match(clue, /each/i, `${kind}: × clue "${clue}"`);
      const plus = text.includes('[+:');
      const twoPart = kind === 'wordSplit' || (kind === 'matchStory' && p.shape !== 'allTimes');
      assert.equal(plus, twoPart, `${kind}: ${text}`);
      assert.match(clueText(text, true), /class="clue clue-times"/);
    }
  }
});

test('a miss on an add-or-multiply question points to the rule', () => {
  const [p] = many('threeFactor', 1);
  assert.match(quizHint(p, 1, checkQuiz(p, { answer: '0' })), /"each" means multiply/);
  const [split] = many('wordSplit', 1);
  assert.match(quizHint(split, 1, checkQuiz(split, { answer: '0' })), /same kind of thing, so add/);
  const [next] = many('nextStep', 1);
  assert.match(quizHint(next, 1, { correct: false, wrong: ['choice'] }), /sign outside the \( \)/);
});

test('every question shows the Add or multiply? rules card', () => {
  for (const p of makeQuizRound()) assert.match(quiz.render(p), /<details class="rules">/);
});
