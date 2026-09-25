// Fence It: the distributive property. A big carrot patch like 7 × 8 is hard,
// but a fence can split it into two easy patches: 7 × 5 and 7 × 3. Solve each
// side, add them up, and you have 7 × 8.
//
// Problem kinds:
//   split – place the fence yourself, then solve both sides and add
//   fill  – the fence is already at 5: a × b = a × 5 + a × ▢  (or  + ▢)

import { shuffle, parseWhole, hintFor, pick } from '../problems.js';
import { numberInput, plural } from '../visuals.js';
import { carrotSVG } from '../bunnies.js';

const ROW_CHOICES = [3, 4, 6, 7, 8, 9];
const COLUMN_CHOICES = [6, 7, 8, 9];
const FRIENDLY_SIDE = 5;
const SMART_SPLIT_BONUS = 1;

export function isSmartSplit({ b }, split) {
  return split === FRIENDLY_SIDE || b - split === FRIENDLY_SIDE;
}

// The two sides of a split: a × left and a × right.
export function sides({ a, b }, split) {
  return { left: split, right: b - split, leftProduct: a * split, rightProduct: a * (b - split) };
}

// Starts with two splits so the fence is introduced before the fill-ins.
export function makeFenceRound(count, rand = Math.random) {
  const rest = Array.from({ length: Math.max(0, count - 2) }, (_, i) => (i % 2 ? 'split' : 'fill'));
  const kinds = ['split', 'split', ...shuffle(rest, rand)].slice(0, count);
  const seen = new Set();
  const problems = [];
  while (problems.length < count) {
    const a = pick(ROW_CHOICES, rand);
    const b = pick(COLUMN_CHOICES, rand);
    if (seen.has(`${a}x${b}`)) continue;
    seen.add(`${a}x${b}`);
    const problem = { a, b, answer: a * b, kind: kinds[problems.length] };
    if (problem.kind === 'fill') {
      // A missing product of a × 1 would just repeat the rows, so ask for the part instead.
      problem.missing = b - FRIENDLY_SIDE > 1 && rand() < 0.5 ? 'product' : 'part';
      problem.expected = problem.missing === 'part' ? b - FRIENDLY_SIDE : a * (b - FRIENDLY_SIDE);
    }
    problems.push(problem);
  }
  return problems;
}

export function checkFence(problem, input) {
  if (problem.kind === 'fill') {
    const correct = parseWhole(input.answer) === problem.expected;
    return { correct, wrong: correct ? [] : ['answer'] };
  }
  const { leftProduct, rightProduct } = sides(problem, problem.split);
  const wrong = [];
  if (parseWhole(input.left) !== leftProduct) wrong.push('left');
  if (parseWhole(input.right) !== rightProduct) wrong.push('right');
  if (parseWhole(input.total) !== problem.answer) wrong.push('total');
  const correct = wrong.length === 0;
  return { correct, wrong, bonus: correct && isSmartSplit(problem, problem.split) ? SMART_SPLIT_BONUS : 0 };
}

// "Add the tens: 30 + 20 = 50. Add the ones: 5 + 1 = 6. Put them together!"
// Two one-digit numbers have no tens to split, so count up instead.
export function additionHint(x, y) {
  if (x < 10 && y < 10) return `Start at ${x} and count up ${y} more.`;
  const tens = [x - (x % 10), y - (y % 10)];
  const ones = [x % 10, y % 10];
  return `Add the tens: ${tens[0]} + ${tens[1]} = ${tens[0] + tens[1]}. `
    + `Add the ones: ${ones[0]} + ${ones[1]} = ${ones[0] + ones[1]}. Put them together!`;
}

export function fenceHint(problem, misses, result) {
  const { a, b } = problem;
  if (problem.kind === 'fill') {
    const right = b - FRIENDLY_SIDE;
    if (problem.missing === 'part') {
      if (misses >= 3) return `${b} = 5 + ${right}, so it's ${a} × ${right}. Type ${right} to keep going.`;
      if (misses === 2) return 'Count the columns on the right side of the fence.';
      return `The fence splits ${b} columns into 5 and the rest. How many columns are on the right?`;
    }
    if (misses >= 3) return `The right side is ${a} × ${right} = ${a * right}. Type ${a * right} to keep going.`;
    if (misses === 2) return `Right side: ${hintFor({ a, b: right, answer: a * right }, 2)}`;
    return `The box is the right side of the fence: ${a} rows of ${right}.`;
  }

  const { left, right, leftProduct, rightProduct } = sides(problem, problem.split);
  if (misses >= 3) {
    return `${a} × ${left} = ${leftProduct}, ${a} × ${right} = ${rightProduct}, and ${leftProduct} + ${rightProduct} = ${problem.answer}. Type those in to keep going.`;
  }
  if (result.wrong.includes('left')) return `Left side: ${hintFor({ a, b: left, answer: leftProduct }, misses)}`;
  if (result.wrong.includes('right')) return `Right side: ${hintFor({ a, b: right, answer: rightProduct }, misses)}`;
  if (misses === 1) return `Both sides are right! Now add ${leftProduct} + ${rightProduct}.`;
  return additionHint(leftProduct, rightProduct);
}

// ---------- Markup ----------

// Gaps are tinted like the side they're on, so each side reads as one block.
function gapClass(k, split) {
  if (split === null) return '';
  return k === split ? 'fence' : k < split ? 'side-left' : 'side-right';
}

// Columns of carrots with a gap between each pair; gap k sits after k columns.
// With `interactive`, the gaps are buttons you click (or drag across) to place the fence.
export function fencePatchHTML(rows, cols, split = null, { interactive = false } = {}) {
  const carrots = carrotSVG().repeat(rows);
  const parts = [];
  for (let c = 0; c < cols; c++) {
    const side = split === null ? '' : c < split ? 'side-left' : 'side-right';
    parts.push(`<div class="fence-col ${side}">${carrots}</div>`);
    if (c === cols - 1) break;
    const k = c + 1;
    const state = gapClass(k, split);
    parts.push(interactive
      ? `<button type="button" class="fence-gap ${state}" data-split="${k}" aria-label="Fence after ${plural(k, 'column')}"></button>`
      : `<div class="fence-gap ${state}"></div>`);
  }
  return `<div class="fence-patch" role="img" aria-label="${plural(rows, 'row')} of ${plural(cols, 'carrot')}">${parts.join('')}</div>`;
}

function sideLabels(problem, split) {
  if (split === null) return '<span>Click between two columns to put up a fence.</span>';
  const { left, right } = sides(problem, split);
  return `<span class="side-label left">${problem.a} × ${left}</span><span class="side-label right">${problem.a} × ${right}</span>`;
}

function splitSteps(problem) {
  const { a } = problem;
  const { left, right } = sides(problem, problem.split);
  return `
    <div class="equation compact step">
      <span class="step-label">Left</span><span>${a} × ${left}</span><span>=</span>${numberInput('left', 'Left side')}
    </div>
    <div class="equation compact step">
      <span class="step-label">Right</span><span>${a} × ${right}</span><span>=</span>${numberInput('right', 'Right side')}
    </div>
    <div class="equation compact step">
      <span class="step-label">Add</span><span class="mirror" data-mirror="left">?</span><span>+</span>
      <span class="mirror" data-mirror="right">?</span><span>=</span>${numberInput('total', 'Total')}
    </div>`;
}

function setFence(el, problem, split) {
  el.querySelectorAll('.fence-col').forEach((col, c) => {
    col.classList.toggle('side-left', c < split);
    col.classList.toggle('side-right', c >= split);
  });
  el.querySelectorAll('.fence-gap').forEach((gap) => {
    gap.classList.remove('fence', 'side-left', 'side-right');
    gap.classList.add(gapClass(Number(gap.dataset.split), split));
  });
  el.querySelector('.fence-labels').innerHTML = sideLabels(problem, split);
  el.querySelector('.split-button').disabled = false;
}

// The gap nearest a pointer position, for dragging the fence along.
function nearestGap(el, clientX) {
  let best = null;
  for (const gap of el.querySelectorAll('.fence-gap')) {
    const box = gap.getBoundingClientRect();
    const distance = Math.abs(box.left + box.width / 2 - clientX);
    if (!best || distance < best.distance) best = { gap, distance };
  }
  return best && Number(best.gap.dataset.split);
}

export default {
  id: 'fence',
  title: 'Fence It',
  blurb: 'Split a big fact into two easy ones',
  icon: () => fencePatchHTML(3, 4, 2),

  makeRound: (count) => makeFenceRound(count),

  describe(problem) {
    const { a, b } = problem;
    if (problem.kind === 'fill') return `${a} × ${b} = ${a} × 5 + ${problem.missing === 'part' ? `${a} × ▢` : '▢'}`;
    const { left, right } = sides(problem, problem.split);
    return `${a} × ${b} = ${a} × ${left} + ${a} × ${right}`;
  },

  // The big fact plus the side(s) the child worked out.
  facts(problem) {
    const { a, b } = problem;
    if (problem.kind === 'fill') return [[a, b], [a, b - FRIENDLY_SIDE]];
    const { left, right } = sides(problem, problem.split);
    return [[a, b], [a, left], [a, right]];
  },

  prompt(problem) {
    if (problem.kind === 'fill') return 'The fence split this patch at 5. What goes in the box?';
    return `This patch is ${problem.a} × ${problem.b}. Put up a fence to split it into two easier patches. Tip: a side of 5 is extra easy!`;
  },

  render(problem) {
    const { a, b } = problem;
    if (problem.kind === 'fill') {
      const box = numberInput('answer', 'Missing number');
      const last = problem.missing === 'part' ? `<span>${a} ×</span>${box}` : box;
      return `
        <div class="picture">${fencePatchHTML(a, b, FRIENDLY_SIDE)}
          <p class="fence-labels"><span class="side-label left">${a} × 5</span><span class="side-label right">${problem.missing === 'part' ? `${a} × ?` : '?'}</span></p>
        </div>
        <div class="equation compact"><span>${a} × ${b}</span><span>=</span><span>${a} × 5 +</span>${last}</div>`;
    }
    return `
      <div class="picture">${fencePatchHTML(a, b, null, { interactive: true })}
        <p class="fence-labels">${sideLabels(problem, null)}</p>
      </div>
      <button type="button" class="flip-button split-button" disabled>Split here!</button>
      <div class="steps"></div>`;
  },

  mount(el, problem, ctx) {
    if (problem.kind !== 'split') return;
    ctx.setCheckVisible(false);
    const patch = el.querySelector('.fence-patch');
    let split = null;
    let dragging = false;
    const place = (k) => {
      if (k === null || problem.split !== undefined) return;
      split = k;
      setFence(el, problem, k);
    };

    // Press anywhere on the patch and drag: the fence follows to the nearest gap.
    patch.addEventListener('pointerdown', (event) => {
      if (problem.split !== undefined) return;
      dragging = true;
      patch.setPointerCapture(event.pointerId);
      place(nearestGap(el, event.clientX));
    });
    patch.addEventListener('pointermove', (event) => {
      if (dragging) place(nearestGap(el, event.clientX));
    });
    const stopDragging = () => { dragging = false; };
    patch.addEventListener('pointerup', stopDragging);
    patch.addEventListener('pointercancel', stopDragging);
    // Keyboard: Enter/Space on a gap places the fence there; arrows move it.
    patch.addEventListener('click', (event) => {
      const gap = event.target.closest('.fence-gap');
      if (gap) place(Number(gap.dataset.split));
    });
    patch.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const from = split ?? Number(document.activeElement?.dataset.split ?? Math.floor(problem.b / 2));
      const next = Math.min(problem.b - 1, Math.max(1, from + (event.key === 'ArrowLeft' ? -1 : 1)));
      place(next);
      el.querySelector(`.fence-gap[data-split="${next}"]`).focus();
    });

    el.querySelector('.split-button').addEventListener('click', (event) => {
      if (split === null) return;
      problem.split = split;
      event.currentTarget.hidden = true;
      el.querySelectorAll('.fence-gap').forEach((gap) => { gap.disabled = true; });
      patch.classList.add('locked');

      const steps = el.querySelector('.steps');
      steps.innerHTML = splitSteps(problem);
      for (const side of ['left', 'right']) {
        const input = steps.querySelector(`input[name="${side}"]`);
        const mirror = steps.querySelector(`[data-mirror="${side}"]`);
        input.addEventListener('input', () => { mirror.textContent = input.value.trim() || '?'; });
      }
      ctx.setCheckVisible(true);
      const { left, right } = sides(problem, split);
      ctx.say(`Now solve each side: ${problem.a} × ${left} and ${problem.a} × ${right}. Then add them up!`);
      steps.querySelector('input').focus();
    });
  },

  check: checkFence,
  hint: fenceHint,

  celebrate(el, problem) {
    const split = problem.kind === 'fill' ? FRIENDLY_SIDE : problem.split;
    const { left, right, leftProduct, rightProduct } = sides(problem, split);
    const box = document.createElement('div');
    box.className = 'both-ways';
    box.innerHTML = `<p class="both-title">${problem.a} × ${problem.b} = ${problem.answer}</p>
      <p class="way">${problem.a} × ${left} + ${problem.a} × ${right} = ${leftProduct} + ${rightProduct} = ${problem.answer}</p>`;
    el.append(box);
  },

  solved(problem) {
    if (problem.kind === 'fill') return `Splitting ${problem.b} into 5 + ${problem.b - FRIENDLY_SIDE} makes it easy!`;
    const { left, right } = sides(problem, problem.split);
    if (isSmartSplit(problem, problem.split)) {
      return `Smart fence! A side of 5 made it easy. Bonus carrot!`;
    }
    return `${problem.a} × ${left} and ${problem.a} × ${right} add up to ${problem.answer}!`;
  },
};
