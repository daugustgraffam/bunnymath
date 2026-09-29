// Hop Back: division as repeated subtraction. A bunny starts at the big number
// on a number line and hops back by the divisor until it lands on 0. The number
// of hops is the answer: 12 − 4 − 4 − 4 = 0, three hops, so 12 ÷ 4 = 3.

import { uniquePairs, parseWhole } from '../problems.js';
import { numberInput, plural } from '../visuals.js';
import { miniBunnySVG } from '../bunnies.js';

const WIDTH = 640;
const LEFT = 30;
const SPAN = 580;
const AXIS_Y = 100;

export function makeHopRound(count, rand = Math.random) {
  return uniquePairs(count, { aMin: 2, aMax: 6, bMin: 2, bMax: 8, rand })
    .map(({ a: divisor, b: quotient }) => ({ divisor, quotient, dividend: divisor * quotient, answer: quotient }));
}

export function checkHop({ quotient }, input) {
  const correct = parseWhole(input.answer) === quotient;
  return { correct, wrong: correct ? [] : ['answer'] };
}

export function hopHint({ dividend, divisor, quotient }, misses) {
  if (misses >= 3) return `It takes ${quotient} hops: ${quotient} × ${divisor} = ${dividend}. Type ${quotient} to keep going.`;
  if (misses === 2) return `Think multiplication: ▢ hops of ${divisor} make ${dividend}. Count the jumps on the line.`;
  return `Hop back by ${divisor} each time until the bunny lands on 0. Count the hops.`;
}

const xAt = (n, dividend) => LEFT + (n * SPAN) / dividend;

// A number line from 0 to the dividend, labeled at every multiple of the divisor.
function numberLine({ dividend, divisor }) {
  const ticks = [];
  for (let n = 0; n <= dividend; n++) {
    const x = xAt(n, dividend).toFixed(1);
    const major = n % divisor === 0;
    ticks.push(`<line x1="${x}" y1="${AXIS_Y - (major ? 9 : 5)}" x2="${x}" y2="${AXIS_Y + (major ? 9 : 5)}" class="${major ? 'nl-major' : 'nl-minor'}"/>`);
    if (major) ticks.push(`<text x="${x}" y="${AXIS_Y + 30}" class="nl-label">${n}</text>`);
  }
  const bunny = miniBunnySVG('#d6ac82').replace('<svg ', '<svg x="-15" y="-38" width="30" height="35" ');
  return `
    <svg class="number-line" viewBox="0 0 ${WIDTH} 140" role="img" aria-label="A number line from 0 to ${dividend}, counting by ${divisor}s">
      <line x1="${LEFT}" y1="${AXIS_Y}" x2="${LEFT + SPAN}" y2="${AXIS_Y}" class="nl-axis"/>
      ${ticks.join('')}
      <g class="nl-hops"></g>
      <g class="nl-bunny" style="transform: translate(${xAt(dividend, dividend)}px, ${AXIS_Y - 4}px)">${bunny}</g>
    </svg>`;
}

// One hop back. Returns true once the bunny is at 0.
function hopOnce(el, { dividend, divisor }) {
  const line = el.querySelector('.number-line');
  const at = Number(line.dataset.at ?? dividend);
  if (at <= 0) return true;
  const to = at - divisor;
  const [x1, x2] = [xAt(at, dividend), xAt(to, dividend)];
  const mid = (x1 + x2) / 2;
  line.querySelector('.nl-hops').insertAdjacentHTML('beforeend',
    `<path d="M${x1.toFixed(1)} ${AXIS_Y - 6} Q${mid.toFixed(1)} ${AXIS_Y - 62} ${x2.toFixed(1)} ${AXIS_Y - 6}" class="nl-hop"/>`);
  line.querySelector('.nl-bunny').style.transform = `translate(${x2}px, ${AXIS_Y - 4}px)`;
  line.dataset.at = String(to);
  return to <= 0;
}

function markLanded(el) {
  const button = el.querySelector('.hop-button');
  button.disabled = true;
  button.textContent = 'Landed on 0!';
}

export default {
  id: 'hopback',
  subject: 'divide',
  title: 'Hop Back',
  blurb: 'Hop back to 0 and count the hops',
  icon: () => `<svg class="hop-icon" viewBox="0 0 90 40" aria-hidden="true">
    <line x1="5" y1="32" x2="85" y2="32" stroke="#6b4730" stroke-width="3"/>
    <path d="M80 30 Q67 6 54 30 M54 30 Q41 6 28 30 M28 30 Q15 6 2 30" fill="none" stroke="#f28c28" stroke-width="3"/>
  </svg>`,

  makeRound: (count) => makeHopRound(count),
  describe: ({ dividend, divisor }) => `Hop back from ${dividend} by ${divisor}s`,
  facts: ({ divisor, quotient }) => [[divisor, quotient]],

  prompt: ({ divisor }) => `Hop back by ${divisor}s until you reach 0!`,

  render: (p) => `
    <p class="word-problem">Start at ${p.dividend}. Hop back ${p.divisor} at a time until you reach 0. How many hops does it take?</p>
    <div class="picture hop-scene">${numberLine(p)}</div>
    <p class="flip-row"><button type="button" class="flip-button hop-button">Hop back ${p.divisor}</button></p>
    <div class="equation compact"><span class="eq-label">Hops</span>${numberInput('answer', 'How many hops')}</div>`,

  mount(el, problem, ctx) {
    el.querySelector('.hop-button').addEventListener('click', () => {
      if (!hopOnce(el, problem)) return;
      markLanded(el);
      ctx.say('The bunny landed on 0! How many hops did it take?');
      el.querySelector('input[name="answer"]').focus();
    });
  },

  check: checkHop,
  hint: hopHint,

  // After two misses, finish the hops so they can be counted.
  help(el, problem, misses) {
    if (misses < 2) return;
    while (!hopOnce(el, problem));
    markLanded(el);
  },

  solved: ({ dividend, divisor, quotient }) =>
    `${plural(quotient, 'hop')} of ${divisor} from ${dividend} to 0, so ${dividend} ÷ ${divisor} = ${quotient}.`,
};
