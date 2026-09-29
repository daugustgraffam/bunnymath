// Fact Families: division undoes multiplication. 3, 4 and 12 make one family:
// 3 × 4 = 12, 4 × 3 = 12, 12 ÷ 3 = 4, 12 ÷ 4 = 3. A fact triangle holds the
// three numbers (the product on top), and an array shows why.
//
// Problem kinds:
//   unknown – 3 × ▢ = 12, so 12 ÷ 3 = ▢   (the missing factor is the quotient)
//   family  – fill in all four facts of the family
//   helper  – which × fact helps solve 12 ÷ 3?

import { uniquePairs, shuffle, parseWhole } from '../problems.js';
import { numberInput, patchHTML } from '../visuals.js';

export function makeFamilyRound(count, rand = Math.random) {
  const rest = Array.from({ length: Math.max(0, count - 1) }, (_, i) => ['family', 'helper', 'unknown'][i % 3]);
  const kinds = ['unknown', ...shuffle(rest, rand)].slice(0, count);
  const used = new Set();
  const pairs = uniquePairs(count, {
    aMin: 2,
    aMax: 9,
    rand,
    // No squares (a family needs two different numbers) and no family twice.
    accept: (a, b) => {
      const key = [a, b].sort().join('x');
      if (a === b || used.has(key)) return false;
      used.add(key);
      return true;
    },
  });
  return pairs.map(({ a, b }, i) => {
    const problem = { kind: kinds[i], a, b, product: a * b, answer: b };
    if (problem.kind === 'helper') problem.choices = helperChoices(a, b, rand);
    return problem;
  });
}

// The × fact that solves product ÷ a, and three that don't.
function helperChoices(a, b, rand) {
  const p = a * b;
  return shuffle([
    { text: `${a} × ${b} = ${p}`, correct: true },
    { text: `${a} + ${p - a} = ${p}`, correct: false },
    { text: `${a} × ${b + 1} = ${a * (b + 1)}`, correct: false },
    { text: `${p} × ${a} = ${p * a}`, correct: false },
  ], rand);
}

export function checkFamily(problem, input) {
  const { kind, a, b, product } = problem;
  if (kind === 'helper') {
    const correct = Boolean(problem.choices[Number(input.choice)]?.correct);
    return { correct, wrong: correct ? [] : ['choice'] };
  }
  const expected = kind === 'unknown'
    ? { factor: b, quotient: b }
    : { times1: product, times2: product, divide1: b, divide2: a };
  const wrong = Object.keys(expected).filter((name) => parseWhole(input[name]) !== expected[name]);
  return { correct: wrong.length === 0, wrong };
}

export function familyHint(problem, misses, result) {
  const { kind, a, b, product: p } = problem;
  if (kind === 'unknown') {
    if (misses >= 3) return `${a} × ${b} = ${p}, so ${p} ÷ ${a} = ${b}. Type ${b} in both boxes.`;
    if (misses === 2) return `Count by ${a}s up to ${p}, holding up a finger for each count. How many fingers?`;
    return `What number times ${a} makes ${p}? The same number goes in both boxes!`;
  }
  if (kind === 'helper') {
    if (misses >= 3) return `${a} × ${b} = ${p} is the helper, so ${p} ÷ ${a} = ${b}.`;
    return `Division undoes multiplication. Find the × fact that uses ${a} and makes ${p}.`;
  }
  if (misses >= 3) return `${a} × ${b} = ${p}, ${b} × ${a} = ${p}, ${p} ÷ ${a} = ${b}, ${p} ÷ ${b} = ${a}.`;
  if (result.wrong.some((name) => name.startsWith('times'))) {
    return 'Multiplying the two bottom numbers of the triangle gives the top number.';
  }
  return 'Dividing the top number by one bottom number gives the other bottom number.';
}

// A fact triangle: the product on top, the two factors at the bottom.
function triangleSVG(top, left, right) {
  return `<svg class="fact-triangle" viewBox="0 0 200 172" role="img" aria-label="Fact triangle: ${top} on top, ${left} and ${right} at the bottom">
    <path d="M100 8 L192 164 L8 164 Z" fill="#fff4e6" stroke="#c8955e" stroke-width="5" stroke-linejoin="round"/>
    <line x1="52" y1="106" x2="148" y2="106" stroke="#e0c79d" stroke-width="3"/>
    <text x="100" y="92" class="ft-number ft-top">${top}</text>
    <text x="58" y="150" class="ft-number">${left}</text>
    <text x="142" y="150" class="ft-number">${right}</text>
    <text x="100" y="146" class="ft-signs">× ÷</text>
  </svg>`;
}

function picture({ a, b, product }, missing) {
  return `<div class="picture qp family-picture">
      ${triangleSVG(product, a, missing ? '?' : b)}
      <div class="family-array">${patchHTML(a, b)}<p class="picture-caption">${a} rows of ${b}</p></div>
    </div>`;
}

function sentence(parts, name, label) {
  return `<div class="equation compact step"><span>${parts}</span><span>=</span>${numberInput(name, label)}</div>`;
}

const RENDERERS = {
  unknown: (p) => `
    ${picture(p, true)}
    <div class="equation compact step"><span>${p.a} ×</span>${numberInput('factor', 'Missing factor')}<span>= ${p.product}</span></div>
    ${sentence(`${p.product} ÷ ${p.a}`, 'quotient', 'Quotient')}`,
  family: (p) => `
    ${picture(p, false)}
    <p class="word-problem">${p.a}, ${p.b} and ${p.product} are a fact family. Fill in all four facts.</p>
    ${sentence(`${p.a} × ${p.b}`, 'times1', 'First multiplication fact')}
    ${sentence(`${p.b} × ${p.a}`, 'times2', 'Second multiplication fact')}
    ${sentence(`${p.product} ÷ ${p.a}`, 'divide1', 'First division fact')}
    ${sentence(`${p.product} ÷ ${p.b}`, 'divide2', 'Second division fact')}`,
  helper: (p) => `
    ${picture(p, true)}
    <p class="word-problem">Which multiplication fact helps you solve <strong>${p.product} ÷ ${p.a}</strong>?</p>
    <div class="choices wide-choices">${p.choices.map((c, i) =>
      `<button type="submit" class="choice" value="${i}">${c.text}</button>`).join('')}</div>`,
};

const PROMPTS = {
  unknown: 'Division is multiplication backwards!',
  family: 'Three numbers, four facts!',
  helper: 'Which × fact is hiding inside this ÷ problem?',
};

export default {
  id: 'family',
  subject: 'divide',
  title: 'Fact Families',
  blurb: 'Use × facts to solve ÷',
  icon: () => triangleSVG(12, 3, 4),

  makeRound: (count) => makeFamilyRound(count),

  describe({ kind, a, b, product }) {
    if (kind === 'unknown') return `${a} × ▢ = ${product}, ${product} ÷ ${a} = ▢`;
    if (kind === 'helper') return `Helper fact for ${product} ÷ ${a}`;
    return `Fact family ${a}, ${b}, ${product}`;
  },

  // Division facts (divisor, quotient) the problem practiced.
  facts: ({ kind, a, b }) => (kind === 'family' ? [[a, b], [b, a]] : [[a, b]]),

  prompt: (p) => PROMPTS[p.kind],
  render: (p) => RENDERERS[p.kind](p),
  check: checkFamily,
  hint: familyHint,

  solved({ kind, a, b, product }) {
    if (kind === 'family') return `${a}, ${b} and ${product}: two × facts and two ÷ facts, one family!`;
    return `${a} × ${b} = ${product}, so ${product} ÷ ${a} = ${b}.`;
  },
};
