// Carrot Crates: multiplying by multiples of 10. Every crate holds 10 carrots,
// so 4 × 30 is 4 groups of 3 crates: 4 × 3 = 12 crates, or 12 tens, or 120.
//
// Problem kinds:
//   tens    – a × (t tens) = ▢ tens = ▢ carrots
//   quick   – a × 30 = ▢
//   missing – a × ▢ = 120

import { uniquePairs, shuffle, parseWhole, hintFor, skipCountHint } from '../problems.js';
import { numberInput, cratesHTML, plural } from '../visuals.js';
import { crateSVG } from '../bunnies.js';

// Starts with the step-by-step "tens" problems, then mixes in the shortcuts.
export function makeCratesRound(count, rand = Math.random) {
  const rest = Array.from({ length: Math.max(0, count - 2) }, (_, i) => ['quick', 'missing'][i % 2]);
  const kinds = ['tens', 'tens', ...shuffle(rest, rand)].slice(0, count);
  return uniquePairs(count, { aMin: 2, aMax: 9, rand }).map(({ a, b: tens }, i) => ({
    a,
    tens,
    multiple: tens * 10,
    answer: a * tens * 10,
    kind: kinds[i],
  }));
}

export function checkCrates(problem, input) {
  const { kind, a, tens, multiple, answer } = problem;
  if (kind === 'tens') {
    const wrong = [];
    if (parseWhole(input.tens) !== a * tens) wrong.push('tens');
    if (parseWhole(input.total) !== answer) wrong.push('total');
    return { correct: wrong.length === 0, wrong };
  }
  const expected = kind === 'missing' ? multiple : answer;
  const correct = parseWhole(input.answer) === expected;
  return { correct, wrong: correct ? [] : ['answer'] };
}

export function cratesHint(problem, misses, result) {
  const { kind, a, tens, multiple, answer } = problem;
  const crates = a * tens;
  if (kind === 'tens') {
    if (misses >= 3) return `${a} × ${tens} = ${crates}, so it's ${crates} tens = ${answer}. Type those in to keep going.`;
    if (result.wrong.includes('tens')) {
      if (misses === 2) return `Crates: ${hintFor({ a, b: tens, answer: crates }, 2)}`;
      return `Each crate is 1 ten. ${a} groups of ${tens} crates: how many crates in all?`;
    }
    if (misses === 2) return `Put a 0 on the end of ${crates}!`;
    return `${crates} tens means ${crates} crates with 10 carrots in each.`;
  }
  if (kind === 'missing') {
    if (misses >= 3) return `${a} × ${multiple} = ${answer}. Type ${multiple} to keep going.`;
    if (misses === 2) return `${a} × ${tens} = ${crates}. So how many tens go in the box?`;
    return `${answer} is ${crates} tens. ${a} × how many tens makes ${crates} tens?`;
  }
  if (misses >= 3) return `${a} × ${multiple} = ${answer}. Type ${answer} to keep going.`;
  if (misses === 2) return skipCountHint({ a, b: multiple });
  return `${multiple} is ${tens} tens. What is ${a} × ${tens}? Then make it tens!`;
}

function picture(problem, options) {
  const caption = `${plural(problem.a, 'group')} of ${plural(problem.tens, 'crate')} · 10 carrots in each crate`;
  return `${cratesHTML(problem.a, problem.tens, options)}<p class="picture-caption">${caption}</p>`;
}

export default {
  id: 'crates',
  title: 'Carrot Crates',
  blurb: 'Multiply by 10s, 20s, 30s…',
  icon: () => `<span class="crate-icon">${crateSVG().repeat(3)}</span>`,

  makeRound: (count) => makeCratesRound(count),

  prompt({ kind, tens, multiple }) {
    if (kind === 'tens') return `Each crate holds 10 carrots, so ${multiple} is ${tens} tens! How many tens, and how many carrots?`;
    if (kind === 'missing') return 'What number goes in the box?';
    return 'How many carrots in all?';
  },

  render(problem) {
    const { kind, a, tens, multiple, answer } = problem;
    let equation;
    if (kind === 'tens') {
      equation = `
        <div class="equation compact">
          <span>${a} × ${tens} tens</span><span>=</span>
          <label class="blank">${numberInput('tens', 'How many tens')}<span class="caption">tens</span></label>
          <span>=</span>
          <label class="blank">${numberInput('total', 'How many carrots')}<span class="caption">carrots</span></label>
        </div>`;
    } else if (kind === 'missing') {
      equation = `<div class="equation compact"><span>${a} ×</span>${numberInput('answer', 'Missing number')}<span>= ${answer}</span></div>`;
    } else {
      equation = `<div class="equation compact"><span>${a} × ${multiple}</span><span>=</span>${numberInput('answer', 'Your answer')}</div>`;
    }
    return `<div class="picture crate-picture">${picture(problem)}</div>${equation}`;
  },

  check: checkCrates,
  hint: cratesHint,

  help(el, problem, misses) {
    if (misses < 2) return;
    // Tens problems count crates until the tens box is right, then carrots.
    const tensBox = el.querySelector('input[name="tens"]');
    const countCrates = tensBox && parseWhole(tensBox.value) !== problem.a * problem.tens;
    el.querySelector('.crate-picture').innerHTML = picture(problem, { totals: true, showLast: misses >= 3, unit: countCrates ? 1 : 10 });
  },

  solved({ kind, a, tens, multiple, answer }) {
    if (kind === 'tens') return `${a} × ${tens} tens = ${a * tens} tens = ${answer} carrots!`;
    return `${a} × ${multiple} = ${answer}. That's ${a} × ${tens} = ${a * tens}, in tens!`;
  },
};

