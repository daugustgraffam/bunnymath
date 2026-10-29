// Add or Multiply? A test about choosing the operation. Ten questions:
//
//   expr     – (4 × 2) + 3,  5 + (3 × 6),  (2 + 3) × 4,  6 × (1 + 4): the ( ) first,
//              then do what the sign outside says (two steps)
//   oneStep  – a story that is either "put two same-kind amounts together" (add)
//              or "equal groups" (multiply); pick + or × in the equation, then solve
//   twoStep  – a story with three numbers: (a ▢ b) ▢ c, pick both signs, then solve.
//              Shapes: × then +, + then ×, all +, all ×. Three numbers can mean
//              adding, and "and" can be in a multiply story, so the clue to look
//              for is "each" (equal groups) vs. same-kind amounts.
//
// After a miss the story's clue words light up, a picture of the math appears,
// and the Practice Test's "Add or multiply?" rules card opens.

import { randomInt, shuffle, pick, parseWhole, hintFor, skipCountHint } from '../problems.js';
import { numberInput, patchHTML, plural, groupBoxesHTML, unitRowsHTML, joinedHTML, burrowsHTML } from '../visuals.js';
import { makeTriple, easyRoutes, ROUTES } from './hutch.js';
import {
  THREE_FACTOR_STORIES, SPLIT_STORIES, EXTRA_STORIES, RULES, clueText, words,
  quizPicture, nestedPicture, splitPicture, extraPicture,
} from './quiz.js';

const NAMES = ['Bun Bun', 'Clover', 'Hazel', 'Pip', 'Biscuit', 'Juniper', 'Maple', 'Nutmeg', 'Poppy', 'Pepper'];
const SIGN_WORD = { '+': 'add', '×': 'multiply' };
const apply = (a, op, b) => (op === '+' ? a + b : a * b);

// ---------- Story banks ----------
//
// Same markers as the Practice Test: [×:…] is an equal-groups clue, [+:…] an
// "put together same-kind amounts" clue. `thing` names what is being counted.

// Two amounts of the same kind put together: add.
export const ADD_STORIES = [
  {
    thing: ['carrot', 'carrots'], icon: 'carrot', parts: ['in the morning', 'after lunch'],
    text: ({ name, x, y }) => `${name} picked [+:${x} carrots in the morning] and [+:${y} carrots after lunch]. How many carrots did ${name} pick in all?`,
  },
  {
    thing: ['bunny', 'bunnies'], icon: 'bunny', parts: ['in the meadow', 'by the pond'],
    text: ({ x, y }) => `There are [+:${x} bunnies in the meadow] and [+:${y} bunnies by the pond]. How many bunnies are there altogether?`,
  },
  {
    thing: ['berry', 'berries'], icon: 'berry', parts: ['on one bush', 'on another bush'],
    text: ({ name, x, y }) => `${name} found [+:${x} berries on one bush] and [+:${y} more berries on another bush]. How many berries did ${name} find in all?`,
  },
  {
    thing: ['muffin', 'muffins'], icon: 'muffin', parts: ['first', 'then'],
    text: ({ name, x, y }) => `${name} baked [+:${x} muffins] for the party, then baked [+:${y} more muffins]. How many muffins are there in all?`,
  },
];

// Equal groups: multiply. `order` is the order the two numbers appear in the
// story ('ab' = groups first, 'ba' = size first), so the equation reads the same way.
// One story has "and" in it on purpose: "and" alone doesn't mean add.
export const TIMES_STORIES = [
  {
    group: ['basket', 'baskets'], item: ['carrot', 'carrots'], icon: 'carrot', layout: 'boxes', order: 'ab',
    text: ({ name, a, b }) => `${name} has ${a} baskets with ${b} carrots in [×:each basket]. How many carrots are there in all?`,
  },
  {
    group: ['burrow', 'burrows'], item: ['bunny', 'bunnies'], icon: 'bunny', layout: 'burrows', order: 'ab',
    text: ({ a, b }) => `There are ${a} burrows. ${b} bunnies live in [×:each burrow]. How many bunnies are there altogether?`,
  },
  {
    group: ['row', 'rows'], item: ['flower', 'flowers'], icon: 'flower', layout: 'rows', order: 'ab',
    text: ({ name, a, b }) => `${name} planted ${a} rows of flowers with ${b} flowers in [×:each row]. How many flowers are there in all?`,
  },
  {
    group: ['lap', 'laps'], item: ['hop', 'hops'], icon: 'hop', layout: 'rows', order: 'ba',
    text: ({ name, a, b }) => `${name} hops ${b} hops on [×:each lap] and does ${a} laps. How many hops is that in all?`,
  },
];

// Three same-kind amounts put together: add, add.
export const ADD3_STORIES = [
  {
    thing: ['carrot', 'carrots'], icon: 'carrot', parts: ['on Monday', 'on Tuesday', 'on Wednesday'],
    text: ({ name, x, y, z }) => `${name} picked [+:${x} carrots on Monday], [+:${y} carrots on Tuesday] and [+:${z} carrots on Wednesday]. How many carrots did ${name} pick in all?`,
  },
  {
    thing: ['bunny', 'bunnies'], icon: 'bunny', parts: ['first', 'next', 'last'],
    text: ({ x, y, z }) => `[+:${x} bunnies] came to the party first, then [+:${y} more bunnies], then [+:${z} more bunnies]. How many bunnies came to the party?`,
  },
];

// ---------- Generators ----------

export const EXPR_FORMS = {
  // (a × b) + c
  timesPlus: { inner: '×', outer: '+', after: false },
  // c + (a × b)
  plusAfter: { inner: '×', outer: '+', after: true },
  // (a + b) × c
  plusTimes: { inner: '+', outer: '×', after: false },
  // c × (a + b)
  timesAfter: { inner: '+', outer: '×', after: true },
};

function makeExpr(form, rand) {
  const { inner, outer, after } = EXPR_FORMS[form];
  let a; let b; let c;
  if (inner === '×') {
    a = randomInt(2, 9, rand);
    b = randomInt(2, 9, rand);
    c = randomInt(1, 9, rand);
  } else {
    // Keep the ( ) sum at 10 or less so step 2 is a times-table fact.
    do {
      a = randomInt(1, 6, rand);
      b = randomInt(1, 6, rand);
    } while (a + b > 10 || a + b < 3);
    c = randomInt(2, 9, rand);
  }
  const s1 = apply(a, inner, b);
  const innerText = `${a} ${inner} ${b}`;
  const text = after ? `${c} ${outer} (${innerText})` : `(${innerText}) ${outer} ${c}`;
  return { kind: 'expr', form, a, b, c, inner, outer, after, s1, innerText, text, answer: apply(s1, outer, c) };
}

function makeOneStep(op, rand) {
  const name = pick(NAMES, rand);
  if (op === '+') {
    const story = randomInt(0, ADD_STORIES.length - 1, rand);
    const x = randomInt(3, 19, rand);
    let y = randomInt(3, 19, rand);
    if (y === x) y = x === 19 ? 18 : x + 1;
    return { kind: 'oneStep', op, story, name, x, y, left: x, right: y, answer: x + y };
  }
  const story = randomInt(0, TIMES_STORIES.length - 1, rand);
  const a = randomInt(2, 9, rand);
  const b = randomInt(2, 9, rand);
  const [left, right] = TIMES_STORIES[story].order === 'ab' ? [a, b] : [b, a];
  return { kind: 'oneStep', op, story, name, a, b, left, right, answer: a * b };
}

export const TWO_STEP_SHAPES = {
  timesThenAdd: ['×', '+'],
  addThenTimes: ['+', '×'],
  allAdd: ['+', '+'],
  allTimes: ['×', '×'],
};

function makeTwoStep(shape, rand) {
  const name = pick(NAMES, rand);
  const [op1, op2] = TWO_STEP_SHAPES[shape];
  let nums; let story; let extra = {};
  if (shape === 'timesThenAdd') {
    const a = randomInt(2, 6, rand); const b = randomInt(2, 9, rand); const e = randomInt(1, 9, rand);
    nums = [a, b, e]; story = randomInt(0, EXTRA_STORIES.length - 1, rand); extra = { a, b, e };
  } else if (shape === 'addThenTimes') {
    let x; let y;
    do { x = randomInt(2, 6, rand); y = randomInt(1, 4, rand); } while (x + y > 10);
    const c = randomInt(3, 9, rand);
    nums = [x, y, c]; story = randomInt(0, SPLIT_STORIES.length - 1, rand); extra = { x, y, c };
  } else if (shape === 'allAdd') {
    nums = [randomInt(2, 12, rand), randomInt(2, 12, rand), randomInt(2, 12, rand)];
    story = randomInt(0, ADD3_STORIES.length - 1, rand);
    extra = { x: nums[0], y: nums[1], z: nums[2] };
  } else {
    const { a, b, c } = makeTriple(rand);
    nums = [a, b, c]; story = randomInt(0, THREE_FACTOR_STORIES.length - 1, rand); extra = { a, b, c };
  }
  const s1 = apply(nums[0], op1, nums[1]);
  return { kind: 'twoStep', shape, story, name, nums, op1, op2, s1, answer: apply(s1, op2, nums[2]), ...extra };
}

// 3 expressions (different forms), 4 one-step stories (2 add, 2 multiply),
// 3 two-step stories (different shapes), in a random order.
export function makeAddTimesRound(count = 10, rand = Math.random) {
  const exprs = shuffle(Object.keys(EXPR_FORMS), rand).slice(0, 3).map((form) => makeExpr(form, rand));
  const stories = shuffle(['+', '+', '×', '×'], rand).map((op) => makeOneStep(op, rand));
  const twos = shuffle(Object.keys(TWO_STEP_SHAPES), rand).slice(0, 3).map((shape) => makeTwoStep(shape, rand));
  return shuffle([...exprs, ...stories, ...twos], rand).slice(0, count);
}

// ---------- Checking ----------

export function checkAddTimes(problem, input) {
  const wrong = [];
  if (problem.kind === 'expr') {
    if (parseWhole(input.step1) !== problem.s1) wrong.push('step1');
  } else if (problem.kind === 'oneStep') {
    if (input.op !== problem.op) wrong.push('op');
  } else {
    if (input.op1 !== problem.op1) wrong.push('op1');
    if (input.op2 !== problem.op2) wrong.push('op2');
  }
  if (parseWhole(input.answer) !== problem.answer) wrong.push('answer');
  return { correct: wrong.length === 0, wrong, signWrong: wrong.some((name) => name.startsWith('op')) };
}

// ---------- Hints: a nudge, then a strategy, then the answer ----------

const CLUE_NUDGE = 'Look at the clue words. Equal groups ("each")? Multiply. Two amounts of the same kind put together? Add.';

function countUp(x, y) {
  const [big, small] = x >= y ? [x, y] : [y, x];
  return `Start at ${big} and count up ${small} more.`;
}

// Hint for working out "x op y" once the sign is right.
function computeHint(x, op, y, misses) {
  if (op === '+') return misses === 1 ? `Now add: ${x} + ${y}.` : countUp(x, y);
  return misses === 1 ? `Now multiply: ${x} × ${y}.` : hintFor({ a: x, b: y, answer: x * y }, 2);
}

function exprHint(p, misses, result) {
  const { s1, outer, c, after, innerText, inner, a, b } = p;
  const step2 = after ? `${c} ${outer} ${s1}` : `${s1} ${outer} ${c}`;
  if (misses >= 3) return `${innerText} = ${s1}, and ${step2} = ${p.answer}. Type those in to keep going.`;
  if (result.wrong.includes('step1')) {
    if (misses === 1) return `Do the ( ) first: ${innerText}.`;
    return inner === '×' ? hintFor({ a, b, answer: a * b }, 2) : countUp(a, b);
  }
  if (misses === 1) return `Step 1 is right! The sign outside the ( ) is ${outer}, so ${SIGN_WORD[outer]}: ${step2}.`;
  return outer === '+' ? countUp(s1, c) : skipCountHint(after ? { a: c, b: s1 } : { a: s1, b: c });
}

function oneStepHint(p, misses, result) {
  const sign = p.op;
  if (misses >= 3) return `It's ${p.left} ${sign} ${p.right} = ${p.answer}.`;
  if (result.signWrong) {
    if (misses === 1) return CLUE_NUDGE;
    if (sign === '+') {
      const { thing } = ADD_STORIES[p.story];
      return `${words(thing, p.x)} and ${words(thing, p.y)} are the same kind of thing, so add them.`;
    }
    return `"Each" means equal groups: ${p.a} groups of ${p.b}. Multiply!`;
  }
  return `Your sign is right! ${computeHint(p.left, sign, p.right, misses)}`;
}

function twoStepHint(p, misses, result) {
  const [n1, n2, n3] = p.nums;
  if (misses >= 3) return `It's (${n1} ${p.op1} ${n2}) ${p.op2} ${n3}: ${n1} ${p.op1} ${n2} = ${p.s1}, and ${p.s1} ${p.op2} ${n3} = ${p.answer}.`;
  if (result.signWrong) {
    if (misses === 1) return `${CLUE_NUDGE} Three numbers doesn't always mean multiply!`;
    if (p.shape === 'allAdd') return 'All three are the same kind of thing being put together, so both signs are +.';
    if (p.shape === 'allTimes') return 'Every number is "in each" something: equal groups of equal groups. Both signs are ×.';
    if (p.shape === 'timesThenAdd') return `"Each" makes equal groups: ${p.a} × ${p.b}. The ${p.e} extra get added on.`;
    return `${p.x} and ${p.y} are the same kind of thing, so add them first. Then "each" means × ${p.c}.`;
  }
  if (misses === 1) return `Your signs are right! Do the ( ) first: ${n1} ${p.op1} ${n2}.`;
  return `${n1} ${p.op1} ${n2} = ${p.s1}. Now ${p.s1} ${p.op2} ${n3}.`;
}

export function addTimesHint(problem, misses, result) {
  if (problem.kind === 'expr') return exprHint(problem, misses, result);
  if (problem.kind === 'oneStep') return oneStepHint(problem, misses, result);
  return twoStepHint(problem, misses, result);
}

// ---------- Markup ----------

// A + / × (or × / ÷) chooser that fills a hidden answer field. The engine marks
// the whole chooser when the sign is wrong. wireOpPickers makes them clickable.
const SIGN_NAMES = { '+': 'add', '×': 'multiply', '÷': 'divide' };

export function opPicker(name, signs = ['+', '×']) {
  const choose = `Pick ${signs.join(' or ')}`;
  return `<span class="op-picker" role="group" aria-label="${choose}">
    <input type="hidden" name="${name}" value="" data-required data-blank-message="${choose} first!">
    ${signs.map((sign) => `<button type="button" class="op-choice" data-op="${sign}" aria-label="${SIGN_NAMES[sign]}">${sign}</button>`).join('')}
  </span>`;
}

export function wireOpPickers(el) {
  for (const picker of el.querySelectorAll('.op-picker')) {
    picker.addEventListener('click', (event) => {
      const choice = event.target.closest('.op-choice');
      if (!choice || choice.disabled) return;
      const field = picker.querySelector('input[type="hidden"]');
      field.value = choice.dataset.op;
      for (const b of picker.querySelectorAll('.op-choice')) b.classList.toggle('on', b === choice);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}

export function storyText(p) {
  if (p.kind === 'oneStep') return (p.op === '+' ? ADD_STORIES : TIMES_STORIES)[p.story].text(p);
  const bank = { timesThenAdd: EXTRA_STORIES, addThenTimes: SPLIT_STORIES, allAdd: ADD3_STORIES, allTimes: THREE_FACTOR_STORIES }[p.shape];
  return bank[p.story].text(p);
}

// Loose items, e.g. "7 carrots in the morning", for adding pictures.
function pile(n, icon, caption) {
  return { html: groupBoxesHTML(1, n, icon, `${n}`, { extraClass: 'loose' }), caption };
}

function timesGroupsHTML(count, each, s, label) {
  if (s.layout === 'burrows') return burrowsHTML(count, each, { item: 'bunny' });
  if (s.layout === 'rows') return `<div role="img" aria-label="${label}">${unitRowsHTML(count, each, s.icon)}</div>`;
  return groupBoxesHTML(count, each, s.icon, label);
}

// The picture that explains the math, shown after a miss.
export function addTimesPicture(p) {
  if (p.kind === 'expr') {
    const { a, b, c, inner, outer, after } = p;
    if (inner === '×') {
      const groups = { html: patchHTML(a, b), caption: `${a} × ${b}` };
      const extra = pile(c, 'carrot', `${c} more`);
      return quizPicture(joinedHTML(after ? [extra, groups] : [groups, extra], '+', p.text), `Equal rows, then ${c} more added on`);
    }
    // (a + b) × c: a rows and b rows, c in each row.
    if (!after) {
      const parts = [a, b].map((n) => ({ html: unitRowsHTML(n, c, 'carrot'), caption: plural(n, 'row') }));
      return quizPicture(joinedHTML(parts, '+', p.text), `${c} carrots in each row`);
    }
    const parts = [a, b].map((n) => ({ html: patchHTML(c, n), caption: `${c} × ${n}` }));
    return quizPicture(joinedHTML(parts, '+', p.text), `${c} rows of ${a + b}, split into ${a} and ${b}`);
  }
  if (p.kind === 'oneStep') {
    if (p.op === '+') {
      const s = ADD_STORIES[p.story];
      const parts = [pile(p.x, s.icon, `${p.x} ${s.parts[0]}`), pile(p.y, s.icon, `${p.y} ${s.parts[1]}`)];
      return quizPicture(joinedHTML(parts, '+', `${p.x} and ${p.y}`), `Two amounts of ${s.thing[1]}, put together`);
    }
    const s = TIMES_STORIES[p.story];
    const caption = `${words(s.group, p.a)} · ${words(s.item, p.b)} in each ${s.group[0]}`;
    return quizPicture(timesGroupsHTML(p.a, p.b, s, caption), caption);
  }
  if (p.shape === 'allAdd') {
    const s = ADD3_STORIES[p.story];
    const parts = [p.x, p.y, p.z].map((n, i) => pile(n, s.icon, `${n} ${s.parts[i]}`));
    return quizPicture(joinedHTML(parts, '+', `${p.x}, ${p.y} and ${p.z}`), `Three amounts of ${s.thing[1]}, put together`);
  }
  if (p.shape === 'allTimes') return nestedPicture(p.a, p.b, p.c, THREE_FACTOR_STORIES[p.story]);
  if (p.shape === 'timesThenAdd') return extraPicture(p, EXTRA_STORIES[p.story]);
  return splitPicture(p, SPLIT_STORIES[p.story]);
}

const mirror = '<span class="mirror" data-mirror>?</span>';

const RENDERERS = {
  expr: (p) => `
    <p class="statement">${p.text}</p>
    <div class="equation compact step">
      <span class="step-label">Step 1</span><span>${p.innerText}</span><span>=</span>${numberInput('step1', 'Step 1')}
    </div>
    <div class="equation compact step">
      <span class="step-label">Step 2</span>${p.after ? `<span>${p.c} ${p.outer}</span>${mirror}` : `${mirror}<span>${p.outer} ${p.c}</span>`}
      <span>=</span>${numberInput('answer', 'Answer')}
    </div>
    <div class="picture-slot" hidden></div>`,
  oneStep: (p) => `
    <p class="word-problem story">${clueText(storyText(p))}</p>
    <div class="picture-slot" hidden></div>
    <div class="equation compact op-equation">
      <span>${p.left}</span>${opPicker('op')}<span>${p.right}</span><span>=</span>${numberInput('answer', 'Answer')}
    </div>`,
  twoStep: (p) => `
    <p class="word-problem story">${clueText(storyText(p))}</p>
    <div class="picture-slot" hidden></div>
    <div class="equation compact op-equation">
      <span>(${p.nums[0]}</span>${opPicker('op1')}<span>${p.nums[1]})</span>${opPicker('op2')}<span>${p.nums[2]}</span>
      <span>=</span>${numberInput('answer', 'Answer')}
    </div>`,
};

const PROMPTS = {
  expr: 'Do the ( ) first, then follow the sign outside!',
  oneStep: 'Add or multiply? Pick the sign, then solve.',
  twoStep: 'Three numbers! Pick both signs, then solve.',
};

export default {
  id: 'addtimes',
  title: 'Add or Multiply? Test',
  blurb: 'When do you add? When do you multiply?',
  wide: true,
  roundLength: 10,
  icon: () => '<span class="mode-icon-text addtimes-icon">+ ×</span>',

  makeRound: (count) => makeAddTimesRound(count),

  describe(p) {
    if (p.kind === 'expr') return p.text;
    if (p.kind === 'oneStep') return `Story: ${p.left} ${p.op} ${p.right}`;
    return `Story: (${p.nums[0]} ${p.op1} ${p.nums[1]}) ${p.op2} ${p.nums[2]}`;
  },

  // Times-table facts worked out along the way (adding-only problems have none).
  facts(p) {
    if (p.kind === 'expr') {
      if (p.inner === '×') return [[p.a, p.b]];
      return [[p.s1, p.c]];
    }
    if (p.kind === 'oneStep') return p.op === '×' ? [[p.a, p.b]] : [];
    if (p.shape === 'timesThenAdd') return [[p.a, p.b]];
    if (p.shape === 'addThenTimes') return [[p.x + p.y, p.c]];
    if (p.shape === 'allAdd') return [];
    const route = easyRoutes(p)[0];
    const [x, y] = ROUTES[route].firstText(p).split(' × ').map(Number);
    return x * y <= 10 ? [[x, y], [x * y, route === 'left' ? p.c : p.a]] : [[x, y]];
  },

  prompt: (p) => PROMPTS[p.kind],
  render: (p) => RENDERERS[p.kind](p) + RULES,

  mount(el, problem) {
    wireOpPickers(el);
    // Step 1's answer is copied into step 2.
    if (problem.kind === 'expr') {
      const step1 = el.querySelector('input[name="step1"]');
      const copy = el.querySelector('[data-mirror]');
      step1.addEventListener('input', () => { copy.textContent = step1.value.trim() || '?'; });
    }
  },

  check: checkAddTimes,
  hint: addTimesHint,

  // After a miss: open the rules, light up the clue words, show the picture.
  help(el, problem, misses) {
    if (misses < 1) return;
    el.querySelector('details.rules').open = true;
    const storyEl = el.querySelector('.word-problem.story');
    if (storyEl) storyEl.innerHTML = clueText(storyText(problem), true);
    const slot = el.querySelector('.picture-slot');
    if (slot.hidden) {
      slot.innerHTML = addTimesPicture(problem);
      slot.hidden = false;
    }
  },

  solved(p) {
    if (p.kind === 'expr') {
      const step2 = p.after ? `${p.c} ${p.outer} ${p.s1}` : `${p.s1} ${p.outer} ${p.c}`;
      return `${p.innerText} = ${p.s1}, then ${step2} = ${p.answer}.`;
    }
    if (p.kind === 'oneStep') {
      if (p.op === '+') return `Same kind of thing put together, so add: ${p.x} + ${p.y} = ${p.answer}.`;
      return `"Each" means equal groups, so multiply: ${p.left} × ${p.right} = ${p.answer}.`;
    }
    const [n1, n2, n3] = p.nums;
    return `(${n1} ${p.op1} ${n2}) ${p.op2} ${n3} = ${p.answer}.`;
  },
};
