// Flip the Patch: the commutative property. Turning a carrot patch on its side
// swaps rows and columns but never changes how many carrots there are.
//
// Problem kinds:
//   flip    – see a × b = n, click to flip the patch, then answer b × a
//   missing – a × b = b × ▢
//   match   – which card is the same as a × b?

import { uniquePairs, shuffle, parseWhole } from '../problems.js';
import { numberInput, patchHTML } from '../visuals.js';

// Starts with a flip so the idea is shown before it's tested.
export function makeFlipRound(count, rand = Math.random) {
  const rest = Array.from({ length: count - 1 }, (_, i) => ['match', 'missing', 'flip'][i % 3]);
  const kinds = ['flip', ...shuffle(rest, rand)];
  const used = new Set();
  const pairs = uniquePairs(count, {
    aMin: 2,
    aMax: 9,
    rand,
    // No squares (nothing to flip) and no 3×4 and 4×3 in the same round.
    accept: (a, b) => {
      const key = [a, b].sort().join('x');
      if (a === b || used.has(key)) return false;
      used.add(key);
      return true;
    },
  });
  return pairs.map((pair, i) => {
    const problem = { ...pair, kind: kinds[i] };
    if (problem.kind === 'match') problem.choices = makeChoices(pair.a, pair.b, rand);
    return problem;
  });
}

// One flipped fact plus three look-alikes that don't equal a × b.
export function makeChoices(a, b, rand = Math.random) {
  const candidates = [
    { text: `${a} + ${b}`, value: a + b, adds: true },
    { text: `${a} × ${a}`, value: a * a },
    { text: `${b} × ${b}`, value: b * b },
    { text: `${a} × ${b + 1}`, value: a * (b + 1) },
    { text: `${a + 1} × ${b}`, value: (a + 1) * b },
  ];
  const texts = new Set([`${b} × ${a}`]);
  const distractors = shuffle(candidates, rand).filter((c) => {
    if (c.value === a * b || texts.has(c.text)) return false;
    texts.add(c.text);
    return true;
  });
  return shuffle([{ text: `${b} × ${a}`, correct: true }, ...distractors.slice(0, 3)], rand);
}

export function checkFlip(problem, input) {
  if (problem.kind === 'match') {
    const choice = problem.choices[Number(input.choice)];
    const correct = Boolean(choice?.correct);
    return { correct, wrong: correct ? [] : ['choice'], adds: Boolean(choice?.adds) };
  }
  const expected = problem.kind === 'missing' ? problem.a : problem.answer;
  const correct = parseWhole(input.answer) === expected;
  return { correct, wrong: correct ? [] : ['answer'] };
}

export function flipHint({ kind, a, b, answer }, misses, result) {
  if (kind === 'flip') {
    if (misses >= 3) return `It's ${answer}, the same as before! Type ${answer} to keep going.`;
    if (misses === 2) return 'How many carrots were there before the flip? Look at the first number sentence.';
    return 'Flipping the patch doesn’t add or take away any carrots!';
  }
  if (kind === 'missing') {
    if (misses >= 3) return `${a} × ${b} = ${b} × ${a}. Type ${a} to keep going.`;
    if (misses === 2) return 'Watch the patch flip! How many carrots are in each row now?';
    return 'Flipping swaps the two numbers. Which number is missing?';
  }
  if (misses >= 3) return `It's ${b} × ${a}! Click it to keep going.`;
  if (misses === 2) return 'Watch the patch flip! Which card matches it now?';
  if (result.adds) return 'That one adds instead of multiplying. Find the same two numbers, just flipped!';
  return 'Find the card with the same two numbers, just flipped around!';
}

// Rotates the patch a quarter turn, then redraws it upright as cols × rows.
function spinPatch(el, rows, cols, done) {
  const wrap = el.querySelector('.patch-wrap');
  if (wrap.dataset.flipped) return;
  wrap.dataset.flipped = 'yes';
  // Room for the patch's long side, so it doesn't sweep over the text while turning.
  const picture = wrap.parentElement;
  picture.style.minHeight = `${Math.max(rows, cols) * 30 + 32}px`;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    picture.style.minHeight = '';
    wrap.style.transition = 'none';
    wrap.classList.remove('spinning');
    wrap.innerHTML = patchHTML(cols, rows);
    void wrap.offsetWidth;
    wrap.style.transition = '';
    done?.();
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
    return;
  }
  wrap.classList.add('spinning');
  wrap.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, 1500);
}

function patchPicture({ a, b }) {
  return `<div class="picture"><div class="patch-wrap">${patchHTML(a, b)}</div></div>`;
}

const PROMPTS = {
  flip: ({ a, b }) => `This patch has ${a} rows of ${b} carrots. Click “Flip the patch!” to turn it.`,
  missing: () => 'Fill in the missing number!',
  match: () => 'Which card means the same thing?',
};

const RENDERERS = {
  flip: ({ a, b, answer }) => `
    <p class="sentence">${a} rows of ${b}: <strong>${a} × ${b} = ${answer}</strong></p>
    <p class="flip-row"><button type="button" class="flip-button">Flip the patch! ↻</button></p>
    <div class="equation after-flip" hidden>
      <span>${b} × ${a}</span><span>=</span>${numberInput('answer', 'Your answer', { disabled: true })}
    </div>`,
  missing: ({ a, b }) => `
    <div class="equation">
      <span>${a} × ${b}</span><span>=</span><span>${b} ×</span>${numberInput('answer', 'Missing number')}
    </div>`,
  match: ({ a, b, choices }) => `
    <p class="sentence">Which one is the same as <strong>${a} × ${b}</strong>?</p>
    <div class="choices">
      ${choices.map((c, i) => `<button type="submit" class="choice" value="${i}">${c.text}</button>`).join('')}
    </div>`,
};

export default {
  id: 'flip',
  title: 'Flip the Patch',
  blurb: 'See why 3 × 7 = 7 × 3',
  icon: () => patchHTML(2, 3),

  makeRound: (count) => makeFlipRound(count),

  prompt: (problem) => PROMPTS[problem.kind](problem),

  render: (problem) => patchPicture(problem) + RENDERERS[problem.kind](problem),

  mount(el, problem, ctx) {
    if (problem.kind !== 'flip') return;
    ctx.setCheckVisible(false);
    const button = el.querySelector('.flip-button');
    button.addEventListener('click', () => {
      button.disabled = true;
      spinPatch(el, problem.a, problem.b, () => {
        button.closest('.flip-row').hidden = true;
        const equation = el.querySelector('.after-flip');
        const input = equation.querySelector('input');
        equation.hidden = false;
        input.disabled = false;
        ctx.setCheckVisible(true);
        ctx.say(`Now it's ${problem.b} rows of ${problem.a}. How many carrots are there?`);
        input.focus();
      });
    });
  },

  check: checkFlip,
  hint: flipHint,

  help(el, problem, misses) {
    if (misses === 2 && problem.kind !== 'flip') spinPatch(el, problem.a, problem.b);
  },

  solved({ kind, a, b, answer }) {
    if (kind === 'flip') return `${b} × ${a} = ${answer}, just like ${a} × ${b}! Flipping doesn't change the total.`;
    if (kind === 'missing') return `${a} × ${b} = ${b} × ${a}. Flipping swaps the numbers!`;
    return `${a} × ${b} = ${b} × ${a}. Same carrots, just flipped!`;
  },
};
