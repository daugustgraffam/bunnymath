import { test } from 'node:test';
import assert from 'node:assert/strict';
import addtimes, {
  makeAddTimesRound, checkAddTimes, addTimesHint, storyText, addTimesPicture,
  EXPR_FORMS, TWO_STEP_SHAPES, ADD_STORIES, TIMES_STORIES, ADD3_STORIES,
} from '../js/modes/addtimes.js';
import { clueText } from '../js/modes/quiz.js';

const hasNumber = (text, n) => new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(text);
const evaluate = (text) => Function(`return ${text.replace(/×/g, '*')}`)();

function many(kind, n = 300) {
  const out = [];
  while (out.length < n) out.push(...makeAddTimesRound().filter((p) => p.kind === kind));
  return out;
}

test('a round: 3 expressions, 4 one-step stories (2 add, 2 multiply), 3 two-step stories', () => {
  for (let i = 0; i < 100; i++) {
    const round = makeAddTimesRound();
    assert.equal(round.length, 10);
    const exprs = round.filter((p) => p.kind === 'expr');
    const ones = round.filter((p) => p.kind === 'oneStep');
    const twos = round.filter((p) => p.kind === 'twoStep');
    assert.equal(exprs.length, 3);
    assert.equal(new Set(exprs.map((p) => p.form)).size, 3);
    assert.deepEqual(ones.map((p) => p.op).sort(), ['+', '+', '×', '×']);
    assert.equal(twos.length, 3);
    assert.equal(new Set(twos.map((p) => p.shape)).size, 3);
  }
});

test('expressions: the text means what it says, and step 1 is the ( )', () => {
  for (const p of many('expr')) {
    assert.equal(evaluate(p.text), p.answer, p.text);
    assert.equal(evaluate(p.innerText), p.s1);
    assert.ok(p.text.includes(`(${p.innerText})`));
    if (p.inner === '+') assert.ok(p.s1 <= 10, 'step 2 stays a times-table fact');
  }
  assert.deepEqual(Object.keys(EXPR_FORMS).sort(), ['plusAfter', 'plusTimes', 'timesAfter', 'timesPlus']);
});

test('one-step stories: add stories add, multiply stories multiply, numbers in story order', () => {
  for (const p of many('oneStep')) {
    assert.equal(evaluate(`${p.left} ${p.op} ${p.right}`), p.answer);
    const story = clueText(storyText(p));
    const firstNumber = Number(story.match(/\d+/)[0]);
    assert.equal(firstNumber, p.left, story);
    if (p.op === '+') assert.notEqual(p.x, p.y);
  }
});

test('two-step stories: the signs match the shape and the answer', () => {
  for (const p of many('twoStep')) {
    assert.deepEqual([p.op1, p.op2], TWO_STEP_SHAPES[p.shape]);
    const [a, b, c] = p.nums;
    assert.equal(evaluate(`(${a} ${p.op1} ${b}) ${p.op2} ${c}`), p.answer);
  }
});

test('stories mark their clues: "each" for ×, same-kind amounts for +', () => {
  for (const kind of ['oneStep', 'twoStep']) {
    for (const p of many(kind, 100)) {
      const text = storyText(p);
      assert.doesNotMatch(clueText(text), /\[|\]/);
      const multiplies = kind === 'oneStep' ? p.op === '×' : p.shape !== 'allAdd';
      const adds = kind === 'oneStep' ? p.op === '+' : p.shape !== 'allTimes';
      assert.equal(/\[×:[^\]]*each/i.test(text), multiplies, text);
      assert.equal(text.includes('[+:'), adds, text);
    }
  }
});

test('"and" shows up in a multiply story, and three numbers can mean adding', () => {
  assert.ok(TIMES_STORIES.some((s) => /\band\b/.test(s.text({ name: 'Pip', a: 3, b: 4 }))));
  assert.ok(ADD3_STORIES.length > 0);
  assert.ok(ADD_STORIES.every((s) => !/each/i.test(s.text({ name: 'Pip', x: 3, y: 4 }))));
});

test('checking: wrong signs and wrong answers are marked separately', () => {
  const one = { kind: 'oneStep', op: '×', a: 4, b: 6, left: 4, right: 6, answer: 24 };
  assert.deepEqual(checkAddTimes(one, { op: '×', answer: '24' }), { correct: true, wrong: [], signWrong: false });
  assert.deepEqual(checkAddTimes(one, { op: '+', answer: '10' }), { correct: false, wrong: ['op', 'answer'], signWrong: true });
  const two = { kind: 'twoStep', op1: '×', op2: '+', nums: [4, 2, 3], s1: 8, answer: 11 };
  assert.deepEqual(checkAddTimes(two, { op1: '×', op2: '×', answer: '24' }).wrong, ['op2', 'answer']);
  const expr = { kind: 'expr', s1: 8, answer: 11 };
  assert.deepEqual(checkAddTimes(expr, { step1: '8', answer: '24' }).wrong, ['answer']);
});

test('hints hold back the answer until the third miss', () => {
  for (const kind of ['expr', 'oneStep', 'twoStep']) {
    for (const p of many(kind, 300)) {
      const cases = kind === 'expr'
        ? [checkAddTimes(p, { step1: '0', answer: '0' }), checkAddTimes(p, { step1: String(p.s1), answer: '0' })]
        : kind === 'oneStep'
          ? [checkAddTimes(p, { op: p.op === '+' ? '×' : '+', answer: '0' }), checkAddTimes(p, { op: p.op, answer: '0' })]
          : [checkAddTimes(p, { op1: '+', op2: '+', answer: '0' }), checkAddTimes(p, { op1: p.op1, op2: p.op2, answer: '0' })];
      for (const result of cases) {
        for (const misses of [1, 2]) {
          const hint = addTimesHint(p, misses, result);
          assert.ok(!hasNumber(hint, p.answer), `${kind} ${p.text ?? storyText(p)} miss ${misses}: ${hint}`);
        }
        assert.ok(hasNumber(addTimesHint(p, 3, result), p.answer));
      }
    }
  }
});

test('a wrong sign gets a clue-word hint, a right sign gets a "now solve it" hint', () => {
  const [p] = many('oneStep', 1);
  const wrongSign = checkAddTimes(p, { op: p.op === '+' ? '×' : '+', answer: '0' });
  assert.match(addTimesHint(p, 1, wrongSign), /clue words/);
  assert.match(addTimesHint(p, 1, checkAddTimes(p, { op: p.op, answer: '0' })), /Your sign is right/);
  const [two] = many('twoStep', 1);
  assert.match(addTimesHint(two, 1, checkAddTimes(two, { op1: '', op2: '', answer: '0' })), /Three numbers doesn't always mean multiply/);
});

test('every question renders, with + / × choosers on stories and a picture for after a miss', () => {
  for (let i = 0; i < 30; i++) {
    for (const p of makeAddTimesRound()) {
      const html = addtimes.render(p);
      assert.doesNotMatch(html, /undefined|NaN/, p.kind);
      assert.match(html, /<details class="rules">/);
      const pickers = (html.match(/class="op-picker"/g) || []).length;
      assert.equal(pickers, { expr: 0, oneStep: 1, twoStep: 2 }[p.kind]);
      const picture = addTimesPicture(p);
      assert.match(picture, /class="picture quiz-picture qp"/);
      assert.doesNotMatch(picture, /undefined|NaN/, `${p.kind} picture`);
    }
  }
});
