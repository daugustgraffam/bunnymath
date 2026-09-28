// Practice Test: the kinds of questions on a third-grade assessment about the
// multiplication properties (arrays, the Distributive Property, three factors,
// word problems), written fresh with bunny stories and new numbers each time.
// A round is 8 questions, one of each kind in a random order.
//
// Kinds:
//   arrayPick    – a patch of carrots: which two facts find the total?
//   distYesNo    – is this break-apart equation a correct use of the Distributive Property?
//   selectAll    – which facts can you use to find a × b? (check all that work)
//   bigArray     – two patches were split from a big one: what was the big patch?
//   threeFactor  – a story with three numbers to multiply
//   wordGroups   – an equal-groups story
//   wordSplit    – a two-day story: (x + y) × c
//   equationFill – (a × b) + (a × b) = ▢,  (a × b) + (a × c) = a × ▢,  10s as two 5s

import { randomInt, shuffle, pick, parseWhole, hintFor, skipCountHint } from '../problems.js';
import { numberInput, patchHTML, plural } from '../visuals.js';
import { clipboardSVG } from '../bunnies.js';
import { makeTriple, easyRoutes, ROUTES } from './hutch.js';

export const KINDS = ['arrayPick', 'distYesNo', 'selectAll', 'bigArray', 'threeFactor', 'wordGroups', 'wordSplit', 'equationFill'];
const NAMES = ['Bun Bun', 'Clover', 'Hazel', 'Pip', 'Biscuit', 'Juniper', 'Maple', 'Nutmeg', 'Poppy', 'Pepper'];

const twoFacts = (p, q, r, s) => ({ text: `${p} × ${q} and ${r} × ${s}`, value: p * q + r * s });

function uniqueByText(options) {
  const seen = new Set();
  return options.filter((option) => (seen.has(option.text) ? false : seen.add(option.text)));
}

// ---------- Generators ----------

function makeArrayPick(rand) {
  for (;;) {
    const rows = randomInt(5, 8, rand);
    const cols = randomInt(5, 9, rand);
    const top = randomInt(2, rows - 2, rand);
    const bottom = rows - top;
    const total = rows * cols;
    const correct = { ...twoFacts(top, cols, bottom, cols), correct: true };
    // Look-alikes: one column too many, rows that add up wrong, mixed-up facts.
    const lookAlikes = [
      twoFacts(rows, cols, rows, 1),
      twoFacts(top, cols, bottom + 1, cols),
      twoFacts(top, top, bottom, bottom),
      twoFacts(top, cols - 1, bottom, cols),
      twoFacts(top - 1, cols, bottom, cols),
    ];
    const wrong = uniqueByText(shuffle(lookAlikes, rand))
      .filter((o) => o.value !== total && o.text !== correct.text)
      .slice(0, 3);
    if (wrong.length < 3) continue;
    return { kind: 'arrayPick', rows, cols, top, bottom, answer: total, choices: shuffle([correct, ...wrong], rand) };
  }
}

function makeDistYesNo(rand) {
  for (;;) {
    const a = randomInt(2, 9, rand);
    const b = randomInt(3, 9, rand);
    const form = pick(['right', 'left', 'paren'], rand);
    const whole = form === 'left' ? a : b; // the number being broken apart
    if (whole < 3) continue;
    const c = randomInt(1, whole - 1, rand);
    const works = rand() < 0.6;
    const d = works ? whole - c : whole - c + (rand() < 0.5 ? 1 : -1);
    if (d < 1) continue;
    const statement = form === 'right' ? `${a} × ${b} = (${a} × ${c}) + (${a} × ${d})`
      : form === 'left' ? `${a} × ${b} = (${c} × ${b}) + (${d} × ${b})`
        : `${a} × ${b} = ${a} × (${c} + ${d})`;
    return {
      kind: 'distYesNo', a, b, c, d, whole, works, statement, answer: a * b,
      choices: [{ text: 'Yes', correct: works }, { text: 'No', correct: !works }],
    };
  }
}

// Ways to split a × b into two facts, bigger part first ("4 × 5 and 4 × 3").
function correctSplits(a, b) {
  const splits = [];
  for (let x = 1; x <= b / 2; x++) splits.push(twoFacts(a, b - x, a, x));
  for (let x = 1; x <= a / 2; x++) splits.push(twoFacts(a - x, b, x, b));
  return uniqueByText(splits);
}

function makeSelectAll(rand) {
  for (;;) {
    const a = randomInt(4, 9, rand);
    const b = randomInt(4, 9, rand);
    const total = a * b;
    const correct = shuffle(correctSplits(a, b), rand).slice(0, randomInt(2, 3, rand));
    const x = randomInt(1, b - 2, rand);
    const y = randomInt(1, a - 2, rand);
    const lookAlikes = [
      twoFacts(a, b - x, a, x + 1),
      twoFacts(a - y, b, y + 1, b),
      twoFacts(a - y, b, a, y),
      twoFacts(y, a, a - y, b),
      twoFacts(a, x, x, b),
      twoFacts(a - 1, b, 2, b - 1),
    ];
    const taken = new Set(correct.map((o) => o.text));
    const wrong = uniqueByText(shuffle(lookAlikes, rand))
      .filter((o) => o.value !== total && !taken.has(o.text))
      .slice(0, 5 - correct.length);
    if (correct.length < 2 || correct.length + wrong.length < 5) continue;
    const options = shuffle([...correct.map((o) => ({ ...o, correct: true })), ...wrong.map((o) => ({ ...o, correct: false }))], rand);
    return { kind: 'selectAll', a, b, answer: total, options };
  }
}

function makeBigArray(rand) {
  for (;;) {
    const m = randomInt(2, 5, rand);
    const p = randomInt(2, 5, rand);
    const n = randomInt(3, 9, rand);
    if (m + p > 9) continue;
    return { kind: 'bigArray', m, p, n, name: pick(NAMES, rand), answer: (m + p) * n };
  }
}

const THREE_FACTOR_STORIES = [
  ({ name, a, b, c }) => `${name} has ${a} garden beds. Each bed has ${b} rows. Each row has ${c} carrots. How many carrots are in the garden?`,
  ({ name, a, b, c }) => `${name} puts ${c} carrots in each bag. ${b} bags fit in a basket. There are ${a} baskets on the wagon. How many carrots are on the wagon?`,
  ({ a, b, c }) => `The burrow pantry has ${a} shelves. Each shelf has ${b} jars. Each jar holds ${c} berries. How many berries are in the pantry?`,
  ({ name, a, b, c }) => `${name} bakes ${c} muffins in each pan. ${b} pans fit on a tray. There are ${a} trays. How many muffins are there?`,
];

function makeThreeFactor(rand) {
  const { a, b, c, answer } = makeTriple(rand);
  const story = randomInt(0, THREE_FACTOR_STORIES.length - 1, rand);
  return { kind: 'threeFactor', a, b, c, answer, story, name: pick(NAMES, rand) };
}

const GROUP_STORIES = [
  ({ name, a, b }) => `${name} has ${a} baskets. Each basket has ${b} carrots. How many carrots does ${name} have?`,
  ({ a, b }) => `There are ${a} burrows. ${b} bunnies live in each burrow. How many bunnies are there?`,
  ({ name, a, b }) => `${name} planted ${a} rows of flowers with ${b} flowers in each row. How many flowers did ${name} plant?`,
];

function makeWordGroups(rand) {
  const a = randomInt(2, 9, rand);
  const b = randomInt(2, 9, rand);
  return { kind: 'wordGroups', a, b, answer: a * b, story: randomInt(0, GROUP_STORIES.length - 1, rand), name: pick(NAMES, rand) };
}

const SPLIT_STORIES = [
  { unit: 'rows', text: ({ name, x, y, c }) => `A garden row holds ${c} carrots. ${name} planted ${x} rows on Monday and ${y} rows on Tuesday. How many carrots did ${name} plant?` },
  { unit: 'laps', text: ({ name, x, y, c }) => `Each lap around the meadow is ${c} hops. ${name} hopped ${x} laps in the morning and ${y} laps after lunch. How many hops is that?` },
  { unit: 'bags', text: ({ name, x, y, c }) => `A bag of carrot seeds costs $${c}. ${name} bought ${x} bags on Saturday and ${y} bags on Sunday. How many dollars did ${name} spend?` },
];

function makeWordSplit(rand) {
  for (;;) {
    const x = randomInt(2, 6, rand);
    const y = randomInt(1, 4, rand);
    const c = randomInt(3, 9, rand);
    if (x + y > 10) continue;
    return { kind: 'wordSplit', x, y, c, answer: (x + y) * c, story: randomInt(0, SPLIT_STORIES.length - 1, rand), name: pick(NAMES, rand) };
  }
}

function makeEquationFill(rand) {
  const variant = pick(['double', 'combine', 'tens'], rand);
  if (variant === 'double') {
    const a = randomInt(2, 6, rand);
    const b = randomInt(2, 6, rand);
    return { kind: 'equationFill', variant, a, b, answer: 2 * a * b, expected: 2 * a * b };
  }
  if (variant === 'combine') {
    for (;;) {
      const a = randomInt(2, 9, rand);
      const b = randomInt(2, 6, rand);
      const c = randomInt(2, 6, rand);
      // Skip a × (b + c) where b + c = a: the answer would just copy a number already shown.
      if (b + c > 10 || b + c === a) continue;
      return { kind: 'equationFill', variant, a, b, c, answer: a * (b + c), expected: b + c };
    }
  }
  const n = randomInt(2, 9, rand);
  return { kind: 'equationFill', variant, n, answer: 10 * n };
}

const MAKERS = {
  arrayPick: makeArrayPick,
  distYesNo: makeDistYesNo,
  selectAll: makeSelectAll,
  bigArray: makeBigArray,
  threeFactor: makeThreeFactor,
  wordGroups: makeWordGroups,
  wordSplit: makeWordSplit,
  equationFill: makeEquationFill,
};

export function makeQuizRound(count = KINDS.length, rand = Math.random) {
  const kinds = shuffle(KINDS, rand);
  return Array.from({ length: count }, (_, i) => MAKERS[kinds[i % kinds.length]](rand));
}

// ---------- Checking ----------

export function checkQuiz(problem, input) {
  switch (problem.kind) {
    case 'arrayPick':
    case 'distYesNo': {
      const correct = Boolean(problem.choices[Number(input.choice)]?.correct);
      return { correct, wrong: correct ? [] : ['choice'] };
    }
    case 'selectAll': {
      const picked = (i) => input[`opt${i}`] === true;
      const wrong = problem.options.map((o, i) => (picked(i) && !o.correct ? `opt${i}` : null)).filter(Boolean);
      const missing = problem.options.filter((o, i) => o.correct && !picked(i)).length;
      return { correct: wrong.length === 0 && missing === 0, wrong, missing };
    }
    case 'bigArray': {
      const rows = parseWhole(input.rows);
      const cols = parseWhole(input.cols);
      const big = problem.m + problem.p;
      const wrong = [];
      if (!((rows === big && cols === problem.n) || (rows === problem.n && cols === big))) wrong.push('rows', 'cols');
      if (parseWhole(input.total) !== problem.answer) wrong.push('total');
      return { correct: wrong.length === 0, wrong };
    }
    case 'equationFill':
      if (problem.variant === 'tens') {
        const wrong = [];
        if (parseWhole(input.five) !== 5 * problem.n) wrong.push('five');
        if (parseWhole(input.ten) !== problem.answer) wrong.push('ten');
        return { correct: wrong.length === 0, wrong };
      }
      return single(input, problem.expected);
    default:
      return single(input, problem.answer);
  }
}

function single(input, expected) {
  const correct = parseWhole(input.answer) === expected;
  return { correct, wrong: correct ? [] : ['answer'] };
}

// ---------- Hints: a nudge, then a strategy, then the answer ----------

function threeFactorPlan(problem) {
  const route = easyRoutes(problem)[0];
  const first = ROUTES[route].first(problem);
  return { pair: ROUTES[route].firstText(problem), first, second: ROUTES[route].second(problem, first) };
}

export function quizHint(problem, misses, result) {
  const { kind } = problem;
  if (kind === 'arrayPick') {
    const right = problem.choices.find((c) => c.correct).text;
    if (misses >= 3) return `It's ${right}! ${problem.top} rows plus ${problem.bottom} rows make ${problem.rows} rows of ${problem.cols}.`;
    if (misses === 2) return 'Look, the patch is split in two now. Count the rows in each part.';
    return `The patch has ${problem.rows} rows of ${problem.cols}. Find two facts with ${problem.cols} in each row whose rows add up to ${problem.rows}.`;
  }
  if (kind === 'distYesNo') {
    const sum = problem.c + problem.d;
    if (misses >= 2) return `${problem.c} + ${problem.d} = ${sum}, so the answer is ${problem.works ? 'Yes' : `No (it needs to make ${problem.whole})`}.`;
    return `Check the break-apart: do ${problem.c} and ${problem.d} add up to ${problem.whole}?`;
  }
  if (kind === 'selectAll') {
    if (misses >= 3) return `These work: ${problem.options.filter((o) => o.correct).map((o) => o.text).join('; ')}.`;
    if (result.wrong.length) {
      return `One of your picks doesn't work. Both facts must share a number, and the other two numbers must add up to make ${problem.a} × ${problem.b}.`;
    }
    return result.missing === 1 ? 'So far so good! One more works too.' : 'So far so good! More of them work too.';
  }
  if (kind === 'bigArray') {
    const { m, p, n } = problem;
    if (misses >= 3) return `${m} rows and ${p} rows make ${m + p} rows of ${n}: ${m + p} × ${n} = ${problem.answer}. Type those in to keep going.`;
    if (result.wrong.includes('rows')) {
      return misses === 2 ? `How many rows is ${m} + ${p}? Each row still has ${n}.` : `Stack the two patches: ${m} rows on top and ${p} rows below, with ${n} in each row.`;
    }
    return misses === 2 ? skipCountHint({ a: m + p, b: n }) : 'Your big patch is right! Now multiply it.';
  }
  if (kind === 'threeFactor') {
    const plan = threeFactorPlan(problem);
    if (misses >= 3) return `${plan.pair} = ${plan.first}, and ${plan.second} = ${problem.answer}.`;
    if (misses === 2) return `Try ${plan.pair} first. Then multiply by the last number.`;
    return 'Multiply two of the numbers first, then the third. Which two are easiest?';
  }
  if (kind === 'wordGroups') return hintFor(problem, misses);
  if (kind === 'wordSplit') {
    const { x, y, c } = problem;
    const unit = SPLIT_STORIES[problem.story].unit;
    if (misses >= 3) return `(${x} + ${y}) × ${c} = ${x + y} × ${c} = ${problem.answer}. That's also ${x} × ${c} + ${y} × ${c}!`;
    if (misses === 2) return `${x} + ${y} = ${x + y} ${unit}. What is ${x + y} × ${c}?`;
    return `Find how many ${unit} in all first, then multiply by ${c}.`;
  }
  // equationFill
  if (problem.variant === 'double') {
    const { a, b } = problem;
    if (misses >= 3) return `${a} × ${b} = ${a * b}, and ${a * b} + ${a * b} = ${problem.expected}.`;
    if (misses === 2) return `${a} × ${b} = ${a * b}. Now add it twice: ${a * b} + ${a * b}.`;
    return `That's ${a} × ${b} two times. What is ${a} × ${b}?`;
  }
  if (problem.variant === 'combine') {
    const { a, b, c } = problem;
    if (misses >= 3) return `${a} groups of ${b} plus ${a} groups of ${c} is ${a} groups of ${problem.expected}. Type ${problem.expected}.`;
    if (misses === 2) return `Add the second numbers: start at ${b} and count up ${c} more.`;
    return `Both parts have ${a} groups. How many are in each group altogether?`;
  }
  const { n } = problem;
  if (misses >= 3) return `5 × ${n} = ${5 * n}, and ${5 * n} + ${5 * n} = ${problem.answer}. Type those in to keep going.`;
  if (result.wrong.includes('five')) return `5s fact: ${hintFor({ a: n, b: 5, answer: 5 * n }, misses)}`;
  return `A 10 is two 5s, so 10 × ${n} is 5 × ${n} twice. Add ${5 * n} + ${5 * n}.`;
}

// ---------- Markup ----------

function story(problem) {
  switch (problem.kind) {
    case 'threeFactor': return THREE_FACTOR_STORIES[problem.story](problem);
    case 'wordGroups': return GROUP_STORIES[problem.story](problem);
    case 'wordSplit': return SPLIT_STORIES[problem.story].text(problem);
    default: return '';
  }
}

function stackedPatches(topRows, bottomRows, cols, labels) {
  return `<div class="stacked-patches">
    <div class="stacked-part">${patchHTML(topRows, cols)}${labels ? `<span class="patch-label">${topRows} × ${cols}</span>` : ''}</div>
    <div class="stacked-part">${patchHTML(bottomRows, cols)}${labels ? `<span class="patch-label">${bottomRows} × ${cols}</span>` : ''}</div>
  </div>`;
}

function choiceButtons(choices, extraClass = '') {
  return `<div class="choices ${extraClass}">${choices.map((c, i) =>
    `<button type="submit" class="choice" value="${i}">${c.text}</button>`).join('')}</div>`;
}

function answerRow(label = 'Your answer') {
  return `<div class="equation compact">${numberInput('answer', label)}</div>`;
}

const RENDERERS = {
  arrayPick: (p) => `
    <div class="picture quiz-picture">${patchHTML(p.rows, p.cols)}</div>
    <p class="word-problem">Bun Bun planted this carrot patch. Which two facts can you use to find the total number of carrots?</p>
    ${choiceButtons(p.choices, 'wide-choices')}`,
  distYesNo: (p) => `
    <p class="word-problem">Yes or No: is the Distributive Property used correctly?</p>
    <p class="statement">${p.statement}</p>
    ${choiceButtons(p.choices)}`,
  selectAll: (p) => `
    <p class="word-problem">Which facts can you use to find <strong>${p.a} × ${p.b}</strong>? Pick all that work.</p>
    <div class="check-options">${p.options.map((o, i) =>
      `<label class="check-option"><input type="checkbox" name="opt${i}"><span>${o.text}</span></label>`).join('')}</div>`,
  bigArray: (p) => `
    <div class="picture quiz-picture">${stackedPatches(p.m, p.p, p.n, true)}</div>
    <p class="word-problem">${p.name} split a big carrot patch into a ${p.m} × ${p.n} patch and a ${p.p} × ${p.n} patch. What was the big patch? How many carrots are in it?</p>
    <div class="equation compact">
      <label class="blank">${numberInput('rows', 'Rows')}<span class="caption">rows</span></label><span>×</span>
      <label class="blank">${numberInput('cols', 'In each row')}<span class="caption">in each row</span></label><span>=</span>
      <label class="blank">${numberInput('total', 'Carrots')}<span class="caption">carrots</span></label>
    </div>`,
  threeFactor: (p) => `<p class="word-problem">${story(p)}</p>${answerRow()}`,
  wordGroups: (p) => `<p class="word-problem">${story(p)}</p>${answerRow()}`,
  wordSplit: (p) => `<p class="word-problem">${story(p)}</p>${answerRow()}`,
  equationFill(p) {
    if (p.variant === 'tens') {
      return `
        <p class="word-problem">A 10s fact can be broken into two 5s facts: 10 × ${p.n} = (5 × ${p.n}) + (5 × ${p.n}).</p>
        <div class="equation compact step"><span class="step-label">5s fact</span><span>5 × ${p.n}</span><span>=</span>${numberInput('five', '5s fact')}</div>
        <div class="equation compact step"><span class="step-label">10s fact</span><span>10 × ${p.n}</span><span>=</span>${numberInput('ten', '10s fact')}</div>`;
    }
    const left = p.variant === 'double' ? `(${p.a} × ${p.b}) + (${p.a} × ${p.b})` : `(${p.a} × ${p.b}) + (${p.a} × ${p.c})`;
    const right = p.variant === 'double' ? numberInput('answer', 'Your answer') : `<span>${p.a} ×</span>${numberInput('answer', 'Missing number')}`;
    return `
      <p class="word-problem">Find the number that makes the equation true.</p>
      <div class="equation compact"><span>${left}</span><span>=</span>${right}</div>`;
  },
};

const PROMPTS = {
  arrayPick: 'Count the rows and how many are in each row.',
  distYesNo: 'Does this break-apart work?',
  selectAll: 'There can be more than one right answer!',
  bigArray: 'Put the two patches back together.',
  threeFactor: 'Read carefully. There are three numbers to multiply.',
  wordGroups: 'Read carefully. What are the groups?',
  wordSplit: 'Read carefully. There are two parts to put together.',
  equationFill: 'What number makes it true?',
};

export default {
  id: 'quiz',
  title: 'Practice Test',
  blurb: 'Questions like the ones on a school test',
  wide: true,
  roundLength: KINDS.length,
  icon: () => clipboardSVG(),

  makeRound: (count) => makeQuizRound(count),

  describe(p) {
    switch (p.kind) {
      case 'arrayPick': return `Which two facts: ${p.rows} × ${p.cols} patch`;
      case 'distYesNo': return `Yes/No: ${p.statement}`;
      case 'selectAll': return `Pick all that find ${p.a} × ${p.b}`;
      case 'bigArray': return `${p.m} × ${p.n} and ${p.p} × ${p.n} → big patch`;
      case 'threeFactor': return `Story: ${p.a} × ${p.b} × ${p.c}`;
      case 'wordGroups': return `Story: ${p.a} × ${p.b}`;
      case 'wordSplit': return `Story: (${p.x} + ${p.y}) × ${p.c}`;
      default:
        if (p.variant === 'tens') return `10 × ${p.n} as two 5s facts`;
        return p.variant === 'double' ? `(${p.a} × ${p.b}) + (${p.a} × ${p.b}) = ▢` : `(${p.a} × ${p.b}) + (${p.a} × ${p.c}) = ${p.a} × ▢`;
    }
  },

  facts(p) {
    switch (p.kind) {
      case 'arrayPick': return [[p.rows, p.cols], [p.top, p.cols], [p.bottom, p.cols]];
      case 'distYesNo':
      case 'selectAll': return [[p.a, p.b]];
      case 'bigArray': return [[p.m, p.n], [p.p, p.n], [p.m + p.p, p.n]];
      case 'threeFactor': {
        const route = easyRoutes(p)[0];
        const [x, y] = ROUTES[route].firstText(p).split(' × ').map(Number);
        const first = x * y;
        return first <= 10 ? [[x, y], [first, route === 'left' ? p.c : p.a]] : [[x, y]];
      }
      case 'wordGroups': return [[p.a, p.b]];
      case 'wordSplit': return [[p.x + p.y, p.c], [p.x, p.c], [p.y, p.c]];
      default:
        if (p.variant === 'tens') return [[5, p.n], [10, p.n]];
        return p.variant === 'double' ? [[p.a, p.b]] : [[p.a, p.b], [p.a, p.c], [p.a, p.b + p.c]];
    }
  },

  prompt: (p) => PROMPTS[p.kind],
  render: (p) => RENDERERS[p.kind](p),
  check: checkQuiz,
  hint: quizHint,

  help(el, problem, misses) {
    // Split the patch where the right answer splits it, without labels, so the child still counts.
    if (problem.kind === 'arrayPick' && misses >= 2) {
      el.querySelector('.quiz-picture').innerHTML = stackedPatches(problem.top, problem.bottom, problem.cols, misses >= 3);
    }
  },

  solved(p) {
    switch (p.kind) {
      case 'arrayPick': return `${p.top} × ${p.cols} + ${p.bottom} × ${p.cols} = ${p.rows} × ${p.cols} = ${p.answer} carrots!`;
      case 'distYesNo': return p.works ? `${p.c} + ${p.d} = ${p.whole}, so it works!` : `${p.c} + ${p.d} doesn't make ${p.whole}, so it doesn't work.`;
      case 'selectAll': return `All of those make ${p.a} × ${p.b} = ${p.answer}!`;
      case 'bigArray': return `The big patch was ${p.m + p.p} × ${p.n} = ${p.answer} carrots!`;
      case 'threeFactor': return `${p.a} × ${p.b} × ${p.c} = ${p.answer}.`;
      case 'wordGroups': return `${p.a} × ${p.b} = ${p.answer}.`;
      case 'wordSplit': return `(${p.x} + ${p.y}) × ${p.c} = ${p.answer}.`;
      default:
        if (p.variant === 'tens') return `5 × ${p.n} + 5 × ${p.n} = 10 × ${p.n} = ${p.answer}.`;
        return p.variant === 'double' ? `Two ${p.a} × ${p.b}s make ${p.expected}.` : `${p.a} × ${p.b + p.c} = ${p.answer}, the same as both parts added up!`;
    }
  },
};
