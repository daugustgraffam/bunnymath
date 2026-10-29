// Division Practice Test: the kinds of questions on a third-grade assessment
// about beginning division (using multiplication to divide), written fresh with
// bunny stories and new numbers each time. A round is 12 questions: one of each
// kind, with "multiply or divide?" three times (one ×, one sharing ÷, one
// grouping ÷), in a random order.
//
// Every question has a "Multiply or divide?" rules card. After a miss it opens,
// the story's clue words light up, and a picture appears where one helps.
//
// Kinds:
//   arrayFacts   – a carrot patch: which × and ÷ facts match it? (pick all; the
//                  wrong ones are true facts that don't fit this patch)
//   sameNumber   – 14 = ? × 2,  56 ÷ 8 = ?,  ? × ? = 49: one number makes them all true
//   evenOdd      – 2 equal groups with 1 left over: even or odd? Which totals could it
//                  be? Finds 2 more: what's true now? Even/odd products, and an
//                  example that shows a rule is wrong
//   pickGroups   – which picture shows 12 carrots in 6 equal groups?
//   zeroOne      – the 0 and 1 rules: which has the same value as 8 ÷ 8? Is
//                  "6 ÷ 0 = 6" right?
//   divisibleBy  – which numbers make 7 equal groups with 0 left over? How do you check?
//   barModel     – a bar diagram of 35 in 5 parts: 5 × ▢ = 35 and 35 ÷ 5 = ▢
//   twoPart      – buys 3 of one thing and 4 of another, all the same price, $42:
//                  how much each? Then more for $12: how many more?
//   storyFamily  – an equal-groups story, then its whole fact family
//   multOrDivide – pick × or ÷ for a story, then solve

import { randomInt, shuffle, pick, parseWhole, hintFor } from '../problems.js';
import { numberInput, patchHTML, plural } from '../visuals.js';
import { clipboardSVG, itemSVG } from '../bunnies.js';
import { clueText, quizPicture, words, groupsPicture } from './quiz.js';
import { TIMES_STORIES, opPicker, wireOpPickers } from './addtimes.js';

export const KINDS = [
  'arrayFacts', 'sameNumber', 'evenOdd', 'pickGroups', 'zeroOne', 'divisibleBy', 'barModel', 'twoPart', 'storyFamily', 'multOrDivide',
];
const NAMES = ['Bun Bun', 'Clover', 'Hazel', 'Pip', 'Biscuit', 'Juniper', 'Maple', 'Nutmeg', 'Poppy', 'Pepper'];
const THINGS = [
  { item: ['carrot', 'carrots'], icon: 'carrot' },
  { item: ['berry', 'berries'], icon: 'berry' },
  { item: ['muffin', 'muffins'], icon: 'muffin' },
  { item: ['flower', 'flowers'], icon: 'flower' },
];

const times = (a, b) => `${a} × ${b} = ${a * b}`;
const divide = (total, d) => `${total} ÷ ${d} = ${total / d}`;
// n different numbers from lo..hi.
const distinct = (n, lo, hi, rand) => shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), rand).slice(0, n);
const options = (right, wrong, rand) => shuffle([
  ...right.map((text) => ({ text, correct: true })),
  ...wrong.map((text) => ({ text, correct: false })),
], rand);
const unique = (list) => [...new Set(list)];

// ---------- Generators ----------

function makeArrayFacts(rand) {
  for (;;) {
    const rows = randomInt(3, 6, rand);
    const cols = randomInt(3, 9, rand);
    if (rows === cols) continue;
    const total = rows * cols;
    const right = shuffle([times(rows, cols), times(cols, rows), divide(total, rows), divide(total, cols)], rand)
      .slice(0, randomInt(2, 3, rand));
    // True facts with the wrong numbers: they look right, but they aren't this patch.
    const lookAlikes = unique(shuffle([
      times(rows, rows), times(cols, cols), times(rows + 1, cols), divide((rows + 1) * cols, cols),
      divide(total + rows, rows), times(rows, cols - 1),
    ], rand)).filter((text) => !right.includes(text));
    const wrong = lookAlikes.slice(0, 5 - right.length);
    if (wrong.length < 5 - right.length) continue;
    return { kind: 'arrayFacts', rows, cols, total, name: pick(NAMES, rand), options: options(right, wrong, rand) };
  }
}

// One number, written as ? in every equation. `fact` is the division fact
// [divisor, quotient] each equation practices.
const SAME_FORMS = {
  timesLeft: (n, k) => ({ text: `${n * k} = ? × ${k}`, fact: [k, n] }),
  divide: (n, k) => ({ text: `${n * k} ÷ ${k} = ?`, fact: [k, n] }),
  timesRight: (n, k) => ({ text: `? × ${k} = ${n * k}`, fact: [k, n] }),
  divisor: (n, k) => ({ text: `${n * k} ÷ ? = ${k}`, fact: [n, k] }),
  square: (n) => ({ text: `? × ? = ${n * n}`, fact: [n, n] }),
};

function makeSameNumber(rand) {
  const n = randomInt(2, 9, rand);
  const count = rand() < 0.5 ? 2 : 3;
  // Always one ÷ equation, then different × forms.
  const forms = [pick(['divide', 'divisor'], rand), ...shuffle(['timesLeft', 'timesRight', 'square'], rand)].slice(0, count);
  // Every other number differs from n, so no equation shows the answer.
  const others = shuffle([2, 3, 4, 5, 6, 7, 8, 9].filter((k) => k !== n), rand);
  const equations = shuffle(forms.map((form, i) => SAME_FORMS[form](n, others[i])), rand);
  return { kind: 'sameNumber', n, answer: n, equations };
}

export const EVEN_ODD_VARIANTS = ['leftover', 'couldBe', 'twoMore', 'products', 'counterExample'];

export const PRODUCT_RULES = [
  { text: 'An even number times an even number has an even product.', correct: true },
  { text: 'An even number times an odd number has an even product.', correct: true },
  { text: 'An odd number times an odd number has an odd product.', correct: true },
  { text: 'If one factor is even, the product is even.', correct: true },
  { text: 'An odd number times an even number has an odd product.', correct: false },
  { text: 'An odd number times an odd number has an even product.', correct: false },
  { text: 'An even number times an even number has an odd product.', correct: false },
];

// Rules that are not true, and the kinds of factors that prove it.
export const WRONG_CLAIMS = [
  { claim: 'An odd number times an even number has an odd product.', types: ['odd', 'even'] },
  { claim: 'An odd number times an odd number has an even product.', types: ['odd', 'odd'] },
  { claim: 'An even number times an even number has an odd product.', types: ['even', 'even'] },
];
const ODDS = [3, 5, 7, 9];
const EVENS = [2, 4, 6, 8];

function exampleOf([first, second], rand) {
  const a = pick(first === 'odd' ? ODDS : EVENS, rand);
  let b;
  do { b = pick(second === 'odd' ? ODDS : EVENS, rand); } while (b === a);
  return times(a, b);
}

function makeEvenOdd(rand, variant = pick(EVEN_ODD_VARIANTS, rand)) {
  const name = pick(NAMES, rand);
  const thing = pick(THINGS, rand);
  const base = { kind: 'evenOdd', variant, name, thing };
  if (variant === 'leftover') {
    const left = randomInt(0, 1, rand);
    return { ...base, left, choices: [{ text: 'Even', correct: left === 0 }, { text: 'Odd', correct: left === 1 }] };
  }
  if (variant === 'couldBe') {
    const left = randomInt(0, 1, rand);
    const fits = (n) => n % 2 === left;
    const numbers = distinct(14, 5, 21, rand);
    const right = numbers.filter(fits).slice(0, randomInt(2, 3, rand));
    const wrong = numbers.filter((n) => !fits(n)).slice(0, 5 - right.length);
    // A picture example that isn't one of the choices.
    const example = numbers.filter(fits).find((n) => !right.includes(n)) ?? (left ? 23 : 22);
    return { ...base, left, example, options: options(right.map(String), wrong.map(String), rand) };
  }
  if (variant === 'twoMore') {
    const startEven = rand() < 0.5;
    const found = randomInt(1, 2, rand);
    const endEven = startEven === (found === 2);
    const even = 2 * randomInt(4, 10, rand);
    const odd = 2 * randomInt(4, 9, rand) + 1;
    const things = thing.item[1];
    const statements = [
      { text: `${name} now has an even number of ${things}.`, correct: endEven },
      { text: `${name} now has an odd number of ${things}.`, correct: !endEven },
      { text: `${name} can put all of them into 2 equal groups with none left over.`, correct: endEven },
      { text: `${name} could now have ${even} ${things}.`, correct: endEven },
      { text: `${name} could now have ${odd} ${things}.`, correct: !endEven },
    ];
    return { ...base, startEven, found, endEven, options: shuffle(statements, rand) };
  }
  if (variant === 'products') {
    const right = shuffle(PRODUCT_RULES.filter((r) => r.correct), rand).slice(0, 3);
    const wrong = shuffle(PRODUCT_RULES.filter((r) => !r.correct), rand).slice(0, randomInt(1, 2, rand));
    return { ...base, options: shuffle([...right, ...wrong], rand) };
  }
  // counterExample
  const claim = pick(WRONG_CLAIMS, rand);
  const right = exampleOf(claim.types, rand);
  const wrong = WRONG_CLAIMS.filter((c) => c !== claim).map((c) => exampleOf(c.types, rand));
  return { ...base, claim: claim.claim, types: claim.types, right, choices: options([right], wrong, rand) };
}

function makePickGroups(rand) {
  const groups = randomInt(2, 6, rand);
  let each;
  do { each = randomInt(2, 5, rand); } while (each === groups);
  const unequal = Array(groups).fill(each);
  unequal[0] -= 1;
  unequal[1] += 1;
  const pictures = [
    { sizes: Array(groups).fill(each), text: `${plural(groups, 'group')} of ${each}`, correct: true },
    { sizes: Array(each).fill(groups), text: `${plural(each, 'group')} of ${groups}`, correct: false }, // right total, wrong number of groups
    { sizes: unequal, text: `${groups} groups that aren't equal`, correct: false }, // right total, not equal
    { sizes: Array(groups).fill(each + 1), text: `${plural(groups, 'group')} of ${each + 1}`, correct: false }, // wrong total
  ];
  return {
    kind: 'pickGroups', groups, each, total: groups * each, answer: each,
    name: pick(NAMES, rand), thing: pick(THINGS, rand), choices: shuffle(pictures, rand),
  };
}

// ---- 0 and 1 ----

// Expressions worth a value: 1 → n ÷ n, 0 → 0 ÷ n or 0 × n, v → v ÷ 1, 1 × v…
// `left` is the question side, where a bigger value is an ordinary ÷ fact.
function valueExpression(value, side, rand) {
  const n = randomInt(2, 9, rand);
  if (value === 1) return { text: `${n} ÷ ${n}`, fact: [n, 1] };
  if (value === 0) return pick([{ text: `0 ÷ ${n}`, fact: [n, 0] }, { text: `0 × ${n}`, fact: null }], rand);
  if (side === 'left') return { text: `${value * n} ÷ ${n}`, fact: [n, value] };
  return pick([{ text: `${value} ÷ 1`, fact: [1, value] }, { text: `1 × ${value}`, fact: null }, { text: `${value} × 1`, fact: null }], rand);
}

// Someone's claim about 0 or 1, the right reply and two wrong ones.
export const CLAIMS = [
  (n) => ({
    rule: 'byZero', claim: `${n} ÷ 0 = ${n}, because ${n} × 0 = ${n}.`, fact: null,
    right: `No. ${n} × 0 is 0, not ${n}. You can't divide by 0.`,
    wrong: [`Yes. ${n} ÷ 0 = ${n}.`, `No. ${n} ÷ 0 = 0.`],
  }),
  (n) => ({
    rule: 'zeroBy', claim: `0 ÷ ${n} = ${n}.`, fact: [n, 0],
    right: `No. 0 ÷ ${n} = 0, because ${n} × 0 = 0.`,
    wrong: [`Yes. 0 ÷ ${n} = ${n}.`, 'No. You can never divide 0.'],
  }),
  (n) => ({
    rule: 'byOne', claim: `${n} ÷ 1 = 1.`, fact: [1, n],
    right: `No. ${n} ÷ 1 = ${n}, because 1 × ${n} = ${n}.`,
    wrong: [`Yes. ${n} ÷ 1 = 1.`, `No. ${n} ÷ 1 = 0.`],
  }),
  (n) => ({
    rule: 'byItself', claim: `${n} ÷ ${n} = 1, because ${n} × 1 = ${n}.`, fact: [n, 1],
    right: `Yes. ${n} split into ${n} equal groups is 1 in each group.`,
    wrong: [`No. ${n} ÷ ${n} = 0.`, `No. ${n} ÷ ${n} = ${n}.`],
  }),
  (n) => ({
    rule: 'zeroByTrue', claim: `0 ÷ ${n} = 0, because ${n} × 0 = 0.`, fact: [n, 0],
    right: `Yes. 0 split into ${n} equal groups is 0 in each group.`,
    wrong: [`No. 0 ÷ ${n} = ${n}.`, 'No. You can never divide 0.'],
  }),
];

function makeZeroOne(rand, variant = pick(['match', 'whoIsRight'], rand)) {
  const name = pick(NAMES, rand);
  if (variant === 'whoIsRight') {
    const n = randomInt(2, 9, rand);
    const claim = pick(CLAIMS, rand)(n);
    return { kind: 'zeroOne', variant, name, n, ...claim, choices: options([claim.right], claim.wrong, rand) };
  }
  const [x, y] = distinct(2, 2, 9, rand);
  const values = [0, 1, x, y];
  const target = pick(values, rand);
  const left = valueExpression(target, 'left', rand);
  const right = values.map((value) => {
    let expression;
    do { expression = valueExpression(value, 'right', rand); } while (expression.text === left.text);
    return { text: expression.text, correct: value === target };
  });
  return { kind: 'zeroOne', variant, name, target, left: left.text, fact: left.fact, right: right.find((r) => r.correct).text, choices: shuffle(right, rand) };
}

function makeDivisibleBy(rand, variant = rand() < 0.75 ? 'pick' : 'howCheck') {
  const d = randomInt(3, 9, rand);
  const name = pick(NAMES, rand);
  if (variant === 'howCheck') {
    const right = `Multiply ${d} by a number to see if you get the number.`;
    const wrong = ['Check that the number is even.', 'Check that the number is odd.', 'Multiply 0 by a number to see if you get the number.'];
    return { kind: 'divisibleBy', variant, d, name, right, choices: options([right], wrong, rand) };
  }
  for (;;) {
    const quotients = distinct(randomInt(2, 3, rand), 2, 9, rand);
    const right = quotients.map((q) => d * q);
    // Near misses: a multiple of d plus a little, so 1 to d - 1 left over.
    const near = unique(Array.from({ length: 8 }, () => d * randomInt(2, 9, rand) + randomInt(1, d - 1, rand)))
      .filter((n) => !right.includes(n));
    if (right.length + near.length < 5) continue;
    const wrong = near.slice(0, 5 - right.length);
    return {
      kind: 'divisibleBy', variant, d, name, quotients,
      options: options(right.map(String), wrong.map(String), rand),
    };
  }
}

function makeBarModel(rand) {
  const parts = randomInt(2, 9, rand);
  let each;
  do { each = randomInt(2, 9, rand); } while (each === parts);
  return { kind: 'barModel', parts, each, total: parts * each, answer: each, name: pick(NAMES, rand) };
}

// Two kinds of things at one price. `first` is what gets bought again in part B.
export const SHOP_STORIES = [
  {
    first: ['seed packet', 'seed packets'], second: ['flower pot', 'flower pots'],
    text: ({ name, x, y, total }) => `${name} buys [+:${x} seed packets] and [+:${y} flower pots] at the garden shop. [÷:Every item costs the same.] ${name} spends $${total} in all. How much does each item cost?`,
  },
  {
    first: ['jar of jam', 'jars of jam'], second: ['loaf of bread', 'loaves of bread'],
    text: ({ name, x, y, total }) => `At the market, ${name} buys [+:${x} jars of jam] and [+:${y} loaves of bread]. [÷:They all cost the same.] ${name} pays $${total}. How much does each one cost?`,
  },
  {
    first: ['hayride ticket', 'hayride tickets'], second: ['pony ride ticket', 'pony ride tickets'],
    text: ({ name, x, y, total }) => `At the fair, ${name} buys [+:${x} hayride tickets] and [+:${y} pony ride tickets]. [÷:Every ticket costs the same.] ${name} spends $${total}. How much is each ticket?`,
  },
];

function makeTwoPart(rand) {
  for (;;) {
    const x = randomInt(2, 5, rand);
    const y = randomInt(2, 5, rand);
    const items = x + y;
    const price = randomInt(2, 9, rand);
    const more = randomInt(2, 5, rand);
    if (items > 9 || price === items || more === price || more === items) continue;
    return {
      kind: 'twoPart', x, y, items, price, more, total: items * price, extra: price * more, answer: price,
      name: pick(NAMES, rand), story: randomInt(0, SHOP_STORIES.length - 1, rand),
    };
  }
}

function makeStoryFamily(rand) {
  const story = randomInt(0, TIMES_STORIES.length - 1, rand);
  const [a, b] = distinct(2, 2, 9, rand);
  const [left, right] = TIMES_STORIES[story].order === 'ab' ? [a, b] : [b, a];
  return { kind: 'storyFamily', story, name: pick(NAMES, rand), a, b, left, right, answer: a * b };
}

// Division stories. Sharing: the total and the number of groups are known, find
// how many in each. Grouping: the total and the size of each group are known,
// find how many groups. Either way the total is known, so divide.
export const SHARE_STORIES = [
  {
    group: ['bunny', 'bunnies'], item: ['carrot', 'carrots'], icon: 'carrot',
    text: ({ name, total, n }) => `${name} has ${total} carrots and [÷:shares them equally with ${n} bunnies]. How many carrots does each bunny get?`,
  },
  {
    group: ['vase', 'vases'], item: ['flower', 'flowers'], icon: 'flower',
    text: ({ name, total, n }) => `${name} picked ${total} flowers and [÷:puts them into ${n} vases], the same number in each vase. How many flowers are in each vase?`,
  },
  {
    group: ['friend', 'friends'], item: ['muffin', 'muffins'], icon: 'muffin',
    text: ({ name, total, n }) => `${name} baked ${total} muffins and [÷:gives the same number to each of ${n} friends]. How many muffins does each friend get?`,
  },
];

export const GROUPING_STORIES = [
  {
    group: ['plate', 'plates'], item: ['muffin', 'muffins'], icon: 'muffin',
    text: ({ name, total, n }) => `${name} has ${total} muffins and [÷:puts ${n} muffins on each plate]. How many plates does ${name} fill?`,
  },
  {
    group: ['burrow', 'burrows'], item: ['bunny', 'bunnies'], icon: 'bunny',
    text: ({ total, n }) => `${total} bunnies need a home. [÷:${n} bunnies fit in each burrow.] How many burrows do they need?`,
  },
  {
    group: ['bag', 'bags'], item: ['berry', 'berries'], icon: 'berry',
    text: ({ name, total, n }) => `${name} has ${total} berries and [÷:puts ${n} berries in each bag]. How many bags does ${name} fill?`,
  },
];

export const MULT_OR_DIVIDE = ['times', 'share', 'group'];

function makeMultOrDivide(rand, shape = pick(MULT_OR_DIVIDE, rand)) {
  const name = pick(NAMES, rand);
  if (shape === 'times') {
    const story = randomInt(0, TIMES_STORIES.length - 1, rand);
    const a = randomInt(2, 9, rand);
    const b = randomInt(2, 9, rand);
    const [left, right] = TIMES_STORIES[story].order === 'ab' ? [a, b] : [b, a];
    return { kind: 'multOrDivide', shape, op: '×', story, name, a, b, left, right, answer: a * b };
  }
  // n is the number given in the story (groups to share into, or the size of each group).
  const n = randomInt(2, 9, rand);
  let q;
  do { q = randomInt(2, 9, rand); } while (q === n);
  const bank = shape === 'share' ? SHARE_STORIES : GROUPING_STORIES;
  const story = randomInt(0, bank.length - 1, rand);
  return { kind: 'multOrDivide', shape, op: '÷', story, name, n, q, total: n * q, left: n * q, right: n, answer: q };
}

const MAKERS = {
  arrayFacts: makeArrayFacts,
  sameNumber: makeSameNumber,
  evenOdd: makeEvenOdd,
  pickGroups: makePickGroups,
  zeroOne: makeZeroOne,
  divisibleBy: makeDivisibleBy,
  barModel: makeBarModel,
  twoPart: makeTwoPart,
  storyFamily: makeStoryFamily,
};

export const ROUND_LENGTH = KINDS.length + 2;

export function makeDivQuizRound(count = ROUND_LENGTH, rand = Math.random) {
  const others = KINDS.filter((kind) => kind !== 'multOrDivide').map((kind) => MAKERS[kind](rand));
  const stories = shuffle(MULT_OR_DIVIDE, rand).map((shape) => makeMultOrDivide(rand, shape));
  return shuffle([...others, ...stories], rand).slice(0, count);
}

// ---------- Checking ----------

function checkPicks(problem, input) {
  const picked = (i) => input[`opt${i}`] === true;
  const wrong = problem.options.map((o, i) => (picked(i) && !o.correct ? `opt${i}` : null)).filter(Boolean);
  const missing = problem.options.filter((o, i) => o.correct && !picked(i)).length;
  return { correct: wrong.length === 0 && missing === 0, wrong, missing };
}

function checkBoxes(input, expected) {
  const wrong = Object.keys(expected).filter((name) => parseWhole(input[name]) !== expected[name]);
  return { correct: wrong.length === 0, wrong };
}

export function checkDivQuiz(problem, input) {
  if (problem.choices) {
    const correct = Boolean(problem.choices[Number(input.choice)]?.correct);
    return { correct, wrong: correct ? [] : ['choice'] };
  }
  if (problem.options) return checkPicks(problem, input);
  switch (problem.kind) {
    case 'sameNumber': return checkBoxes(input, { answer: problem.n });
    case 'barModel': return checkBoxes(input, { factor: problem.each, quotient: problem.each });
    case 'twoPart': return checkBoxes(input, { items: problem.items, price: problem.price, more: problem.more });
    case 'storyFamily': {
      const { a, b, left, right } = problem;
      return checkBoxes(input, { total: a * b, times2: a * b, divide1: right, divide2: left });
    }
    default: { // multOrDivide
      const wrong = [];
      if (input.op !== problem.op) wrong.push('op');
      if (parseWhole(input.answer) !== problem.answer) wrong.push('answer');
      return { correct: wrong.length === 0, wrong, signWrong: wrong.includes('op') };
    }
  }
}

// ---------- Hints: a nudge, then a strategy, then the answer ----------

const fingers = (by, total) => `Count by ${by}s up to ${total}, holding up a finger for each count. How many fingers?`;
const rightOnes = (p) => p.options.filter((o) => o.correct).map((o) => o.text);

function picksHint(p, misses, result, { nudge, strategy }) {
  if (misses >= 3) return `These are right: ${rightOnes(p).join('; ')}.`;
  if (result.wrong.length) return misses === 1 ? nudge : strategy;
  return result.missing === 1 ? 'So far so good! One more is right too.' : 'So far so good! More of them are right too.';
}

function evenOddHint(p, misses, result) {
  const things = p.thing.item[1];
  switch (p.variant) {
    case 'leftover':
      if (misses >= 2) return p.left ? 'One is left over, so it is odd.' : 'None left over means it is even.';
      return 'Even numbers make 2 equal groups with none left over. Odd numbers always have 1 left over.';
    case 'couldBe':
      return picksHint(p, misses, result, {
        nudge: `${p.left ? 'One left over means an odd number' : 'None left over means an even number'} of ${things}. Which numbers are ${p.left ? 'odd' : 'even'}?`,
        strategy: `${p.left ? 'Odd numbers end in 1, 3, 5, 7 or 9' : 'Even numbers end in 0, 2, 4, 6 or 8'}. Pick every one of those.`,
      });
    case 'twoMore':
      return picksHint(p, misses, result, {
        nudge: `First: ${p.startEven ? 'none left over means even' : 'one left over means odd'}. Then think: what happens when you add ${p.found} more?`,
        strategy: p.found === 2
          ? 'Adding 2 keeps an even number even and an odd number odd.'
          : 'Adding 1 changes even to odd, and odd to even.',
      });
    case 'products':
      return picksHint(p, misses, result, {
        nudge: 'Try an example for each one, like 2 × 4, 3 × 4 or 3 × 5. Is the product even or odd?',
        strategy: 'If either factor is even, the product is even. Only odd × odd makes an odd product.',
      });
    default: { // counterExample
      if (misses >= 3) return `It's ${p.right}. That product is ${p.types.includes('even') ? 'even' : 'odd'}, so the rule is wrong.`;
      if (misses === 2) return `Find the example that is ${p.types[0]} × ${p.types[1]}. Then look at its product.`;
      return 'Find an example with the same kinds of factors as the rule. Does its product match what the rule says?';
    }
  }
}

function zeroOneHint(p, misses) {
  if (p.variant === 'match') {
    if (misses >= 3) return `It's ${p.right}: both are ${p.target}.`;
    if (misses === 2) {
      if (p.target === 1) return 'Any number divided by itself is 1.';
      if (p.target === 0) return '0 divided by a number, or 0 times a number, is always 0.';
      return 'Find the value of the ÷ fact first. A number divided by 1, or times 1, stays the same.';
    }
    return `What is ${p.left}? Find the one that has the same value.`;
  }
  if (misses >= 3) return `It's "${p.right}"`;
  if (misses === 2) {
    return {
      byZero: 'No number times 0 makes anything but 0. So dividing by 0 doesn\'t work.',
      zeroBy: 'Zero carrots shared into groups is zero carrots in each group.',
      byOne: 'Dividing into 1 group puts everything in that group.',
      byItself: 'Share a number of carrots with the same number of bunnies: everyone gets 1.',
      zeroByTrue: 'Zero carrots shared into groups is zero carrots in each group.',
    }[p.rule];
  }
  return 'Turn it into multiplication: 12 ÷ 3 = ? means 3 × ? = 12. Does it work?';
}

function twoPartHint(p, misses, result) {
  const { x, y, items, price, more, total, extra } = p;
  const s = SHOP_STORIES[p.story];
  if (misses >= 3) {
    return `${x} + ${y} = ${items} items. $${total} ÷ ${items} = $${price} each. $${extra} ÷ $${price} = ${more} more ${s.first[1]}. Type those in to keep going.`;
  }
  if (result.wrong.includes('items')) {
    return misses === 1 ? `Everything costs the same, so first count all the items: ${x} + ${y}.` : `Start at ${Math.max(x, y)} and count up ${Math.min(x, y)} more.`;
  }
  if (result.wrong.includes('price')) {
    return misses === 1 ? `$${total} is split equally over ${items} items, so divide. Think: ${items} × ? = ${total}.` : fingers(items, total);
  }
  return misses === 1
    ? `Each ${s.first[0]} still costs $${price}. How many $${price} make $${extra}? Think: ${price} × ? = ${extra}.`
    : fingers(price, extra);
}

function storyFamilyHint(p, misses, result) {
  const { left, right, answer } = p;
  if (misses >= 3) return `${left} × ${right} = ${answer}, ${right} × ${left} = ${answer}, ${answer} ÷ ${left} = ${right}, ${answer} ÷ ${right} = ${left}.`;
  if (result.wrong.includes('total')) {
    return misses === 1 ? `"Each" with the number of groups means multiply: ${left} × ${right}.` : hintFor({ a: p.a, b: p.b, answer }, 2);
  }
  if (result.wrong.includes('times2')) return 'Turn the fact around: the same two numbers make the same total.';
  return 'Division undoes multiplication. The total divided by one number in the × fact gives the other number.';
}

function multOrDivideHint(p, misses, result) {
  if (misses >= 3) return `It's ${p.left} ${p.op} ${p.right} = ${p.answer}.`;
  if (result.signWrong) {
    if (misses === 1) return 'Do you already know the total? Know the total: divide to split it up. Need the total: multiply.';
    if (p.shape === 'times') return `You know there are ${p.a} groups with ${p.b} in each, but not the total. Multiply to find it.`;
    if (p.shape === 'share') return `You already know the total, ${p.total}. Split it into ${p.n} equal groups: divide.`;
    return `You already know the total, ${p.total}, and how many go in each group. Divide to find how many groups.`;
  }
  if (p.op === '×') return `Your sign is right! ${misses === 1 ? `Now multiply: ${p.left} × ${p.right}.` : hintFor({ a: p.a, b: p.b, answer: p.answer }, 2)}`;
  return `Your sign is right! ${misses === 1 ? `Think multiplication: ${p.n} × ? = ${p.total}.` : fingers(p.n, p.total)}`;
}

export function divQuizHint(p, misses, result) {
  switch (p.kind) {
    case 'arrayFacts':
      return picksHint(p, misses, result, {
        nudge: 'Some of these are true facts, but not for this patch. Count the rows and how many are in each row.',
        strategy: `The patch has ${p.rows} rows of ${p.cols}, ${p.total} carrots in all. A matching fact uses ${p.rows}, ${p.cols} and ${p.total}.`,
      });
    case 'sameNumber': {
      if (misses >= 3) return `It's ${p.n}! ${p.equations.map((e) => e.text.replaceAll('?', p.n)).join(',  ')}.`;
      const helper = p.equations.find((e) => !e.text.includes('? × ?'));
      const k = helper.fact[0] === p.n ? helper.fact[1] : helper.fact[0];
      if (misses === 2) return fingers(k, p.n * k);
      return 'Every ? is the same number. Start with the equation you know best, and think multiplication.';
    }
    case 'evenOdd': return evenOddHint(p, misses, result);
    case 'pickGroups': {
      const things = p.thing.item[1];
      if (misses >= 3) return `It's ${p.groups} groups of ${p.each}: ${p.groups} × ${p.each} = ${p.total}, so ${p.total} ÷ ${p.groups} = ${p.each}.`;
      if (misses === 2) return `You need ${p.groups} groups, every group the same size, and ${p.total} ${things} in all.`;
      return `Check three things: how many groups, are the groups equal, and are there ${p.total} in all?`;
    }
    case 'zeroOne': return zeroOneHint(p, misses);
    case 'divisibleBy':
      if (p.variant === 'howCheck') {
        if (misses >= 2) return `"${p.right}" If ${p.d} × some number makes it, it makes ${p.d} equal groups.`;
        return `Even and odd only tell you about 2 equal groups. Which way uses ${p.d}?`;
      }
      if (misses >= 3) return `These work: ${p.quotients.map((q) => `${p.d * q} = ${p.d} × ${q}`).join(', ')}.`;
      return picksHint(p, misses, result, {
        nudge: `Think multiplication: can you multiply ${p.d} by a number to get it?`,
        strategy: `Say your ${p.d}s facts: ${p.d} × 2, ${p.d} × 3 and on up to ${p.d} × 9. Pick the numbers you say.`,
      });
    case 'barModel':
      if (misses >= 3) return `${p.parts} × ${p.each} = ${p.total}, so ${p.total} ÷ ${p.parts} = ${p.each}. Type ${p.each} in both boxes.`;
      if (misses === 2) return fingers(p.parts, p.total);
      return `The bar is ${p.total} split into ${p.parts} equal parts. What number times ${p.parts} makes ${p.total}? The same number goes in both boxes!`;
    case 'twoPart': return twoPartHint(p, misses, result);
    case 'storyFamily': return storyFamilyHint(p, misses, result);
    default: return multOrDivideHint(p, misses, result);
  }
}

// ---------- Markup ----------

// A bar diagram: `total` on top, split into `parts` equal boxes.
export function barHTML(total, parts, { fill = '?', label = `${total}` } = {}) {
  const cells = Array.from({ length: parts }, () => `<span class="bar-part">${fill}</span>`).join('');
  return `<div class="bar-model" role="img" aria-label="A bar of ${label} split into ${parts} equal parts">
    <div class="bar-total"><span class="bar-total-label">${label}</span></div>
    <div class="bar-parts">${cells}</div>
  </div>`;
}

// Groups of any sizes (so a picture can show groups that aren't equal).
function groupsOfHTML(sizes, icon, label) {
  const boxes = sizes.map((size) => `<div class="group-box">${itemSVG(icon).repeat(size)}</div>`).join('');
  return `<div class="group-boxes" role="img" aria-label="${label}">${boxes}</div>`;
}

// "For example" picture for even and odd: 2 equal groups, maybe 1 left over,
// maybe some more found. The caption describes it without saying even or odd.
function evenOddPicture(total, icon, found = 0) {
  const half = Math.floor(total / 2);
  const left = total % 2;
  const sign = '<span class="joined-sign" aria-hidden="true">+</span>';
  const loose = left ? `<div class="group-box loose">${itemSVG(icon)}</div>` : '';
  const more = found ? `${sign}<div class="group-box found">${itemSVG(icon).repeat(found)}</div>` : '';
  const caption = found
    ? `For example, ${total} and ${found} more. Can the new total make 2 equal groups?`
    : `For example, ${total}: 2 equal groups of ${half}${left ? ' and 1 left over' : ' with none left over'}`;
  return quizPicture(`<div class="joined" role="img" aria-label="${caption}">${groupsOfHTML([half, half], icon, `2 groups of ${half}`)}${loose}${more}</div>`, caption);
}

function storyText(p) {
  if (p.kind === 'twoPart') return SHOP_STORIES[p.story].text(p);
  if (p.kind === 'storyFamily') return TIMES_STORIES[p.story].text(p);
  if (p.kind === 'multOrDivide') {
    if (p.shape === 'times') return TIMES_STORIES[p.story].text(p);
    return (p.shape === 'share' ? SHARE_STORIES : GROUPING_STORIES)[p.story].text(p);
  }
  return '';
}

// The picture shown after a miss, for questions that start without one.
export function divQuizPicture(p) {
  if (p.kind === 'evenOdd') {
    const icon = p.thing.icon;
    if (p.variant === 'leftover') return evenOddPicture(p.left ? 9 : 8, icon);
    if (p.variant === 'couldBe') return evenOddPicture(p.example, icon);
    if (p.variant === 'twoMore') return evenOddPicture(p.startEven ? 6 : 7, icon, p.found);
    return '';
  }
  if (p.kind === 'multOrDivide') {
    if (p.shape === 'times') return groupsPicture(p.a, p.b, TIMES_STORIES[p.story]);
    const s = (p.shape === 'share' ? SHARE_STORIES : GROUPING_STORIES)[p.story];
    if (p.shape === 'share') {
      return quizPicture(barHTML(p.total, p.n), `${words(s.item, p.total)} split into ${p.n} equal parts. How many in each?`);
    }
    return quizPicture(groupsOfHTML(Array(p.q).fill(p.n), s.icon, `${p.total} in groups of ${p.n}`), `${words(s.item, p.total)} with ${p.n} in each ${s.group[0]}. How many ${s.group[1]}?`);
  }
  return '';
}

const HAS_SLOT = (p) => divQuizPicture(p) !== '';

function choiceButtons(choices, extraClass = '') {
  return `<div class="choices ${extraClass}">${choices.map((c, i) =>
    `<button type="submit" class="choice" value="${i}">${c.text}</button>`).join('')}</div>`;
}

function checkOptions(list) {
  return `<div class="check-options">${list.map((o, i) =>
    `<label class="check-option"><input type="checkbox" name="opt${i}"><span>${o.text}</span></label>`).join('')}</div>`;
}

// Steps are a size smaller than other games' equations, so a money step fits on one line.
const step = (label, parts) => `<div class="equation compact step tight"><span class="step-label">${label}</span>${parts}</div>`;
const mirror = (source) => `<span class="mirror" data-mirror="${source}">?</span>`;
const storyParagraph = (p) => `<p class="word-problem story">${clueText(storyText(p))}</p>`;
const slot = (p) => (HAS_SLOT(p) ? '<div class="picture-slot" hidden></div>' : '');

function evenOddMarkup(p) {
  const things = p.thing.item[1];
  const groupsSentence = `${p.name} puts some ${things} into 2 equal groups.`;
  switch (p.variant) {
    case 'leftover':
      return `<p class="word-problem">${groupsSentence} ${p.left ? 'There is 1 left over.' : 'There are none left over.'} Is the number of ${things} even or odd?</p>
        ${slot(p)}${choiceButtons(p.choices)}`;
    case 'couldBe':
      return `<p class="word-problem">${groupsSentence} ${p.left ? 'There is 1 left over.' : 'There are none left over.'} How many ${things} could ${p.name} have? Pick all that work.</p>
        ${slot(p)}${checkOptions(p.options)}`;
    case 'twoMore':
      return `<p class="word-problem">${groupsSentence} ${p.startEven ? 'There are none left over.' : 'There is 1 left over.'} Then ${p.name} finds ${p.found} more ${p.found === 1 ? p.thing.item[0] : things}. Pick all that are true.</p>
        ${slot(p)}${checkOptions(p.options)}`;
    case 'products':
      return `<p class="word-problem">Which of these are true about even and odd products? Pick all that are true.</p>
        ${checkOptions(p.options)}`;
    default:
      return `<p class="word-problem">${p.name} says:</p>
        <p class="statement claim">“${p.claim}”</p>
        <p class="word-problem">That isn't true! Which example shows that ${p.name} is wrong?</p>
        ${choiceButtons(p.choices)}`;
  }
}

const RENDERERS = {
  arrayFacts: (p) => `
    <div class="picture quiz-picture">${patchHTML(p.rows, p.cols)}<p class="picture-caption">How many rows? How many in each row? How many in all?</p></div>
    <p class="word-problem">${p.name} wrote some facts about this carrot patch. Which facts match the patch? Pick all that work.</p>
    ${checkOptions(p.options)}`,
  sameNumber: (p) => `
    <p class="word-problem">What number makes ${p.equations.length === 2 ? 'both' : 'all'} of these equations true?</p>
    <div class="equation-list">${p.equations.map((e) => `<p class="statement">${e.text.replaceAll('?', '<span class="unknown">?</span>')}</p>`).join('')}</div>
    <div class="equation compact"><span class="eq-label">? =</span>${numberInput('answer', 'The number')}</div>`,
  evenOdd: evenOddMarkup,
  pickGroups: (p) => `
    <p class="word-problem">${p.name} puts ${p.total} ${p.thing.item[1]} into ${p.groups} equal groups. Which picture shows ${p.total} ÷ ${p.groups}?</p>
    <div class="choices picture-choices">${p.choices.map((c, i) => `
      <button type="submit" class="choice" value="${i}"><span class="qp">${groupsOfHTML(c.sizes, p.thing.icon, c.text)}</span><span class="sr-only">${c.text}</span></button>`).join('')}
    </div>`,
  zeroOne: (p) => (p.variant === 'match'
    ? `<p class="word-problem">Which expression has the same value as this one?</p>
       <p class="statement">${p.left}</p>
       ${choiceButtons(p.choices)}`
    : `<p class="word-problem">${p.name} says:</p>
       <p class="statement claim">“${p.claim}”</p>
       <p class="word-problem">Is ${p.name} right?</p>
       ${choiceButtons(p.choices, 'wide-choices')}`),
  divisibleBy: (p) => (p.variant === 'howCheck'
    ? `<p class="word-problem">${p.name} wants to know if a number can be put into ${p.d} equal groups with 0 left over. How can ${p.name} check?</p>
       ${choiceButtons(p.choices, 'wide-choices')}`
    : `<p class="word-problem">${p.name} wrote five numbers. Which numbers can be put into <strong>${p.d} equal groups</strong> with 0 left over? Pick all that work.</p>
       ${checkOptions(p.options)}`),
  barModel: (p) => `
    <p class="word-problem">${p.name} drew this bar diagram for a division problem. Write a multiplication equation and a division equation for it.</p>
    ${quizPicture(barHTML(p.total, p.parts), `${p.total} split into ${p.parts} equal parts`)}
    ${step('Multiply', `<span>${p.parts} ×</span>${numberInput('factor', 'Missing factor')}<span>= ${p.total}</span>`)}
    ${step('Divide', `<span>${p.total} ÷ ${p.parts}</span><span>=</span>${numberInput('quotient', 'Quotient')}`)}`,
  twoPart: (p) => {
    const s = SHOP_STORIES[p.story];
    return `
      ${storyParagraph(p)}
      ${quizPicture(barHTML(p.total, p.items, { label: `$${p.total}` }), `$${p.total} split equally over every item`)}
      ${step('Items', `<span>${p.x} + ${p.y}</span><span>=</span>${numberInput('items', 'How many items')}`)}
      ${step('Each costs', `<span>$${p.total} ÷</span>${mirror('items')}<span>= $</span>${numberInput('price', 'Cost of each')}`)}
      <p class="word-problem part-b"><strong>Part B:</strong> Then ${p.name} buys more ${s.first[1]} for another $${p.extra}. How many more ${s.first[1]} does ${p.name} buy?</p>
      ${step('Part B', `<span>$${p.extra} ÷ $</span>${mirror('price')}<span>=</span>${numberInput('more', 'How many more')}`)}`;
  },
  storyFamily: (p) => `
    ${storyParagraph(p)}
    ${groupsPicture(p.a, p.b, TIMES_STORIES[p.story])}
    <p class="word-problem ask">Solve it, then finish the fact family.</p>
    ${step('In all', `<span>${p.left} × ${p.right}</span><span>=</span>${numberInput('total', 'In all')}`)}
    ${step('Turn it', `<span>${p.right} × ${p.left}</span><span>=</span>${numberInput('times2', 'Turned-around fact')}`)}
    ${step('Divide', `${mirror('total')}<span>÷ ${p.left}</span><span>=</span>${numberInput('divide1', 'First division fact')}`)}
    ${step('Divide', `${mirror('total')}<span>÷ ${p.right}</span><span>=</span>${numberInput('divide2', 'Second division fact')}`)}`,
  multOrDivide: (p) => `
    ${storyParagraph(p)}
    ${slot(p)}
    <div class="equation compact op-equation">
      <span>${p.left}</span>${opPicker('op', ['×', '÷'])}<span>${p.right}</span><span>=</span>${numberInput('answer', 'Answer')}
    </div>`,
};

// The "Multiply or divide?" card under every question.
export const DIVIDE_RULES = `
  <details class="rules">
    <summary>Multiply or divide? <span class="rules-tap">Tap for the rules</span></summary>
    <ol class="rules-list">
      <li><span class="rule-badge times">×</span><span><strong>Multiply to find the total.</strong> You know how many
        groups and how many in each: "4 baskets with 3 eggs in <em>each</em>. How many <em>in all</em>?"</span></li>
      <li><span class="rule-badge divide">÷</span><span><strong>Divide when you already know the total</strong> and split
        it into equal groups, to find <em>how many in each</em> ("24 carrots shared by 4 bunnies") or
        <em>how many groups</em> ("24 carrots, 6 on each plate").</span></li>
      <li><span class="rule-badge">?</span><span><strong>Think multiplication.</strong> 42 ÷ 7 = ? is the same as
        7 × ? = 42.</span></li>
      <li><span class="rule-badge">0 1</span><span><strong>0 and 1:</strong> 8 ÷ 1 = 8, 8 ÷ 8 = 1, 0 ÷ 8 = 0, and you
        can't divide by 0.</span></li>
      <li><span class="rule-badge">2</span><span><strong>Even and odd.</strong> Even numbers make 2 equal groups with none
        left over; odd numbers have 1 left over. If a factor is even, the product is even. Odd × odd is odd.</span></li>
    </ol>
  </details>`;

const PROMPTS = {
  arrayFacts: 'There can be more than one right answer!',
  sameNumber: 'Every ? is the same number.',
  evenOdd: 'Even or odd? Think about 2 equal groups.',
  pickGroups: 'Count the groups. Are they equal?',
  zeroOne: 'Remember the 0 and 1 rules!',
  divisibleBy: 'Think multiplication!',
  barModel: 'The bar shows the total split into equal parts.',
  twoPart: 'Two steps, then Part B. Take it one box at a time.',
  storyFamily: 'Solve it, then write the whole fact family.',
  multOrDivide: 'Multiply or divide? Pick the sign, then solve.',
};

function describe(p) {
  switch (p.kind) {
    case 'arrayFacts': return `Which facts match a ${p.rows} × ${p.cols} patch`;
    case 'sameNumber': return `Same number: ${p.equations.map((e) => e.text).join(', ')}`;
    case 'evenOdd':
      if (p.variant === 'leftover') return `2 groups, ${p.left} left over: even or odd?`;
      if (p.variant === 'couldBe') return `2 groups, ${p.left} left over: which totals?`;
      if (p.variant === 'twoMore') return `${p.startEven ? 'Even' : 'Odd'}, finds ${p.found} more: what's true?`;
      if (p.variant === 'products') return 'Even and odd products: pick the true ones';
      return `Example that disproves: ${p.claim}`;
    case 'pickGroups': return `Picture of ${p.total} ÷ ${p.groups}`;
    case 'zeroOne': return p.variant === 'match' ? `Same value as ${p.left}` : `Is it right? ${p.claim}`;
    case 'divisibleBy': return p.variant === 'howCheck' ? `How to check for ${p.d} equal groups` : `Which make ${p.d} equal groups`;
    case 'barModel': return `Bar: ${p.total} in ${p.parts} parts`;
    case 'twoPart': return `$${p.total} ÷ (${p.x} + ${p.y}), then $${p.extra} ÷ $${p.price}`;
    case 'storyFamily': return `Story ${p.left} × ${p.right} and its fact family`;
    default: return `Story: ${p.left} ${p.op} ${p.right}`;
  }
}

// Division facts [divisor, quotient] worked out along the way.
function facts(p) {
  switch (p.kind) {
    case 'arrayFacts': return [[p.rows, p.cols], [p.cols, p.rows]];
    case 'sameNumber': return p.equations.map((e) => e.fact);
    case 'pickGroups': return [[p.groups, p.each]];
    case 'zeroOne': return p.fact ? [p.fact] : [];
    case 'divisibleBy': return p.variant === 'pick' ? p.quotients.map((q) => [p.d, q]) : [];
    case 'barModel': return [[p.parts, p.each]];
    case 'twoPart': return [[p.items, p.price], [p.price, p.more]];
    case 'storyFamily': return [[p.left, p.right], [p.right, p.left]];
    case 'multOrDivide': return p.op === '÷' ? [[p.n, p.q]] : [];
    default: return []; // even and odd
  }
}

function solved(p) {
  switch (p.kind) {
    case 'arrayFacts': return `${p.rows} rows of ${p.cols}: ${p.rows} × ${p.cols} = ${p.total} and ${p.total} ÷ ${p.rows} = ${p.cols}.`;
    case 'sameNumber': return `${p.n} makes them all true!`;
    case 'evenOdd':
      if (p.variant === 'leftover') return p.left ? '1 left over means odd.' : 'None left over means even.';
      if (p.variant === 'couldBe') return `Those are all ${p.left ? 'odd' : 'even'}.`;
      if (p.variant === 'twoMore') return `Now it's ${p.endEven ? 'even' : 'odd'}.`;
      if (p.variant === 'products') return 'If a factor is even, the product is even. Odd × odd is odd.';
      return `${p.right}: that product is ${p.types.includes('even') ? 'even' : 'odd'}, so the rule is wrong.`;
    case 'pickGroups': return `${p.groups} equal groups of ${p.each}: ${p.groups} × ${p.each} = ${p.total}, so ${p.total} ÷ ${p.groups} = ${p.each}.`;
    case 'zeroOne': return p.variant === 'match' ? `${p.left} and ${p.right} are both ${p.target}.` : p.right;
    case 'divisibleBy': return p.variant === 'howCheck' ? `If ${p.d} × a number makes it, it splits into ${p.d} equal groups.` : `They're all in the ${p.d}s facts!`;
    case 'barModel': return `${p.parts} × ${p.each} = ${p.total}, so ${p.total} ÷ ${p.parts} = ${p.each}.`;
    case 'twoPart': return `Each item costs $${p.price}, and $${p.extra} buys ${p.more} more.`;
    case 'storyFamily': return `${p.left}, ${p.right} and ${p.answer}: two × facts and two ÷ facts!`;
    default:
      if (p.op === '×') return `You needed the total, so multiply: ${p.left} × ${p.right} = ${p.answer}.`;
      return `You knew the total, so divide: ${p.left} ÷ ${p.right} = ${p.answer}.`;
  }
}

export default {
  id: 'divquiz',
  subject: 'divide',
  title: 'Division Practice Test',
  blurb: 'Questions like the ones on a division test',
  wide: true,
  roundLength: ROUND_LENGTH,
  icon: () => `<span class="divquiz-icon">${clipboardSVG()}<span class="divquiz-sign">÷</span></span>`,

  makeRound: (count) => makeDivQuizRound(count),
  describe,
  facts,
  prompt: (p) => PROMPTS[p.kind],
  render: (p) => RENDERERS[p.kind](p) + DIVIDE_RULES,

  mount(el) {
    wireOpPickers(el);
    // Answers typed in one step are copied into the next.
    for (const copy of el.querySelectorAll('[data-mirror]')) {
      const source = el.querySelector(`input[name="${copy.dataset.mirror}"]`);
      source.addEventListener('input', () => { copy.textContent = source.value.trim() || '?'; });
    }
  },

  check: checkDivQuiz,
  hint: divQuizHint,

  // After a miss: open the rules, light up the clue words, show the picture.
  help(el, problem, misses) {
    if (misses < 1) return;
    el.querySelector('details.rules').open = true;
    const storyEl = el.querySelector('.word-problem.story');
    if (storyEl) storyEl.innerHTML = clueText(storyText(problem), true);
    const pictureSlot = el.querySelector('.picture-slot');
    if (pictureSlot?.hidden) {
      pictureSlot.innerHTML = divQuizPicture(problem);
      pictureSlot.hidden = false;
    }
  },

  solved,
};
