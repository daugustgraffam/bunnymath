import { test } from 'node:test';
import assert from 'node:assert/strict';
import divquiz, {
  KINDS, ROUND_LENGTH, EVEN_ODD_VARIANTS, MULT_OR_DIVIDE, SHARE_STORIES, GROUPING_STORIES,
  makeDivQuizRound, checkDivQuiz, divQuizHint, divQuizPicture,
} from '../js/modes/divquiz.js';
import { clueText } from '../js/modes/quiz.js';

const hasNumber = (text, n) => new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(text);
const evaluate = (text) => Function(`return ${text.replace(/×/g, '*').replace(/÷/g, '/')}`)();

function many(kind, n = 300) {
  const out = [];
  while (out.length < n) out.push(...makeDivQuizRound().filter((p) => p.kind === kind));
  return out;
}

// Answers that make a problem right, in the form the page sends them.
function rightInput(p) {
  if (p.choices) return { choice: String(p.choices.findIndex((c) => c.correct)) };
  if (p.options) return Object.fromEntries(p.options.map((o, i) => [`opt${i}`, o.correct]));
  switch (p.kind) {
    case 'sameNumber': return { answer: String(p.n) };
    case 'barModel': return { factor: String(p.each), quotient: String(p.each) };
    case 'twoPart': return { items: String(p.items), price: String(p.price), more: String(p.more) };
    case 'storyFamily': return { total: String(p.answer), times2: String(p.answer), divide1: String(p.right), divide2: String(p.left) };
    default: return { op: p.op, answer: String(p.answer) };
  }
}

test('a round: every kind once, plus × / sharing ÷ / grouping ÷ stories', () => {
  for (let i = 0; i < 100; i++) {
    const round = makeDivQuizRound();
    assert.equal(round.length, ROUND_LENGTH);
    for (const kind of KINDS.filter((k) => k !== 'multOrDivide')) assert.equal(round.filter((p) => p.kind === kind).length, 1, kind);
    assert.deepEqual(round.filter((p) => p.kind === 'multOrDivide').map((p) => p.shape).sort(), [...MULT_OR_DIVIDE].sort());
  }
});

test('every problem: the right answer checks, a wrong one does not', () => {
  for (const kind of KINDS) {
    for (const p of many(kind, 200)) {
      assert.equal(checkDivQuiz(p, rightInput(p)).correct, true, `${kind} ${divquiz.describe(p)}`);
      if (p.choices) {
        assert.equal(p.choices.filter((c) => c.correct).length, 1, kind);
        assert.equal(new Set(p.choices.map((c) => c.text)).size, p.choices.length, `${kind} choices repeat`);
        const wrong = p.choices.findIndex((c) => !c.correct);
        assert.deepEqual(checkDivQuiz(p, { choice: String(wrong) }).wrong, ['choice']);
      } else if (p.options) {
        assert.equal(new Set(p.options.map((o) => o.text)).size, p.options.length, `${kind} options repeat`);
        const right = p.options.filter((o) => o.correct).length;
        assert.ok(right >= 1 && right < p.options.length, `${kind} needs right and wrong options`);
      } else {
        assert.equal(checkDivQuiz(p, {}).correct, false);
      }
    }
  }
});

test('array facts: the right ones fit the patch, the wrong ones are true facts that don\'t', () => {
  for (const p of many('arrayFacts')) {
    for (const o of p.options) {
      const [left, right] = o.text.split(' = ');
      assert.equal(evaluate(left), Number(right), `${o.text} is a true fact`);
      const numbers = o.text.match(/\d+/g).map(Number).sort((x, y) => x - y);
      const fits = numbers.join() === [p.rows, p.cols, p.total].sort((x, y) => x - y).join();
      assert.equal(fits, o.correct, o.text);
    }
  }
});

test('same number: one number makes every equation true, and none shows it', () => {
  for (const p of many('sameNumber')) {
    assert.ok(p.equations.some((e) => e.text.includes('÷')));
    for (const e of p.equations) {
      const [left, right] = e.text.replaceAll('?', p.n).split(' = ');
      assert.equal(evaluate(left), evaluate(right), e.text);
      assert.ok(!hasNumber(e.text, p.n), `${e.text} shows ${p.n}`);
    }
  }
});

test('even and odd: every kind of question shows up, and the answers follow the rules', () => {
  const seen = new Set();
  for (const p of many('evenOdd', 400)) {
    seen.add(p.variant);
    if (p.variant === 'couldBe') {
      for (const o of p.options) assert.equal(Number(o.text) % 2 === p.left, o.correct, o.text);
      assert.ok(!p.options.some((o) => Number(o.text) === p.example));
    }
    if (p.variant === 'twoMore') {
      const endEven = ((p.startEven ? 0 : 1) + p.found) % 2 === 0;
      assert.equal(p.endEven, endEven);
      for (const o of p.options) assert.equal(o.correct, /odd number|could now have \d*[13579] /.test(o.text) !== endEven, o.text);
    }
    if (p.variant === 'counterExample') {
      const [a, b] = p.right.match(/\d+/g).map(Number);
      assert.deepEqual([a % 2 ? 'odd' : 'even', b % 2 ? 'odd' : 'even'], p.types);
    }
  }
  assert.deepEqual([...seen].sort(), [...EVEN_ODD_VARIANTS].sort());
});

test('pick the groups: one picture is equal groups of the right total', () => {
  for (const p of many('pickGroups')) {
    const right = p.choices.find((c) => c.correct);
    assert.equal(right.sizes.length, p.groups);
    assert.ok(right.sizes.every((s) => s === p.each));
    for (const c of p.choices.filter((x) => !x.correct)) {
      const equal = c.sizes.every((s) => s === c.sizes[0]);
      const total = c.sizes.reduce((x, y) => x + y, 0);
      assert.ok(!(equal && total === p.total && c.sizes.length === p.groups), c.text);
    }
  }
});

test('0 and 1: the matching expression has the same value; claims get the right reply', () => {
  for (const p of many('zeroOne')) {
    if (p.variant === 'match') {
      assert.equal(evaluate(p.left), p.target);
      for (const c of p.choices) assert.equal(evaluate(c.text) === p.target, c.correct, c.text);
    } else {
      assert.match(p.right, /^(Yes|No)\./);
    }
  }
});

test('divisible by: the picks are exactly the multiples', () => {
  for (const p of many('divisibleBy')) {
    if (p.variant === 'howCheck') continue;
    for (const o of p.options) assert.equal(Number(o.text) % p.d === 0, o.correct, `${o.text} ÷ ${p.d}`);
  }
});

test('stories: two-part shopping and multiply-or-divide add up', () => {
  for (const p of many('twoPart')) {
    assert.equal(p.total, (p.x + p.y) * p.price);
    assert.equal(p.extra, p.price * p.more);
    assert.ok(p.items <= 9);
  }
  for (const p of many('multOrDivide')) {
    assert.equal(evaluate(`${p.left} ${p.op} ${p.right}`), p.answer);
    const story = clueText(divquiz.render(p));
    assert.doesNotMatch(story, /\[|\]/);
    if (p.op === '÷') assert.ok(hasNumber(story, p.total), 'a division story tells the total');
  }
  assert.ok([...SHARE_STORIES, ...GROUPING_STORIES].every((s) => s.text({ name: 'Pip', total: 24, n: 4 }).includes('[÷:')));
});

test('hints hold back the answer until the third miss', () => {
  const blank = { answer: '0', items: '0', price: '0', more: '0', factor: '0', quotient: '0', total: '0', times2: '0', divide1: '0', divide2: '0' };
  for (const kind of ['sameNumber', 'pickGroups', 'barModel', 'storyFamily', 'multOrDivide']) {
    for (const p of many(kind, 200)) {
      const wrong = p.choices ? { correct: false, wrong: ['choice'] } : checkDivQuiz(p, { ...blank, op: p.op });
      for (const misses of [1, 2]) {
        const hint = divQuizHint(p, misses, wrong);
        assert.ok(!hasNumber(hint, p.answer), `${kind} ${divquiz.describe(p)} miss ${misses}: ${hint}`);
      }
      assert.ok(hasNumber(divQuizHint(p, 3, wrong), p.answer), `${kind} miss 3`);
    }
  }
  // Two-part: each step's hint holds back that step's answer.
  for (const p of many('twoPart', 200)) {
    const steps = [['items', {}], ['price', { items: String(p.items) }], ['more', { items: String(p.items), price: String(p.price) }]];
    for (const [name, done] of steps) {
      const result = checkDivQuiz(p, { items: '0', price: '0', more: '0', ...done });
      assert.equal(result.wrong[0], name);
      for (const misses of [1, 2]) assert.ok(!hasNumber(divQuizHint(p, misses, result), p[name]), `${name} miss ${misses}: ${divQuizHint(p, misses, result)}`);
    }
  }
});

test('a wrong sign gets a "do you know the total?" hint', () => {
  const [p] = many('multOrDivide', 1);
  const result = checkDivQuiz(p, { op: p.op === '×' ? '÷' : '×', answer: '0' });
  assert.deepEqual(result.wrong, ['op', 'answer']);
  assert.match(divQuizHint(p, 1, result), /know the total/);
});

test('every question renders with the rules card, and pictures render', () => {
  for (let i = 0; i < 40; i++) {
    for (const p of makeDivQuizRound()) {
      const html = divquiz.render(p);
      assert.doesNotMatch(html, /undefined|NaN|\[object/, divquiz.describe(p));
      assert.match(html, /<details class="rules">/);
      assert.equal((html.match(/class="op-picker"/g) || []).length, p.kind === 'multOrDivide' ? 1 : 0);
      assert.equal(html.includes('picture-slot'), divQuizPicture(p) !== '', `${divquiz.describe(p)} picture slot`);
      assert.doesNotMatch(divQuizPicture(p), /undefined|NaN/);
      assert.ok(divquiz.prompt(p));
      assert.ok(divquiz.solved(p));
      for (const [d, q] of divquiz.facts(p)) assert.ok(d >= 1 && d <= 10 && q >= 0 && q <= 10, `${divquiz.describe(p)} fact ${d}, ${q}`);
    }
  }
});
