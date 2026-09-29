// Share the Carrots: division as equal sharing. You know how many bunnies
// (groups) and share the carrots out one at a time, like dealing cards, until
// the pile is gone. Then count how many one bunny got: 12 ÷ 3 = 4.

import { uniquePairs, parseWhole } from '../problems.js';
import { numberInput, plural } from '../visuals.js';
import { carrotSVG, miniBunnySVG } from '../bunnies.js';

const FURS = ['#d6ac82', '#f6f1ea', '#efc57e', '#9a8f88', '#d8d0e8'];

export function makeShareRound(count, rand = Math.random) {
  return uniquePairs(count, { aMin: 2, aMax: 5, bMin: 2, bMax: 6, rand })
    .map(({ a: divisor, b: quotient }) => ({ divisor, quotient, dividend: divisor * quotient, answer: quotient }));
}

export function checkShare({ quotient }, input) {
  const correct = parseWhole(input.answer) === quotient;
  return { correct, wrong: correct ? [] : ['answer'] };
}

export function shareHint({ dividend, divisor, quotient }, misses) {
  if (misses >= 3) return `Each bunny gets ${quotient}: ${divisor} × ${quotient} = ${dividend}. Type ${quotient} to keep going.`;
  if (misses === 2) return `Think multiplication: ${divisor} bunnies × ▢ carrots = ${dividend}. Count the carrots on one plate.`;
  return 'Tap “Give each bunny a carrot” until the pile is gone. Then count the carrots on one plate.';
}

// One carrot from the pile to every bunny. Returns true once the pile is empty.
function dealOnce(el) {
  const pile = el.querySelector('.carrot-pile');
  const plates = [...el.querySelectorAll('.share-plate')];
  if (pile.children.length < plates.length) return true;
  for (const plate of plates) {
    pile.lastElementChild.remove();
    plate.insertAdjacentHTML('beforeend', carrotSVG());
    plate.lastElementChild.classList.add('dealt');
  }
  return pile.children.length === 0;
}

function markShared(el) {
  const button = el.querySelector('.deal-button');
  button.disabled = true;
  button.textContent = 'All shared!';
}

export default {
  id: 'share',
  subject: 'divide',
  title: 'Share the Carrots',
  blurb: 'Share carrots equally',
  icon: () => `<span class="share-icon">${miniBunnySVG(FURS[0])}${carrotSVG().repeat(2)}${miniBunnySVG(FURS[1])}</span>`,

  makeRound: (count) => makeShareRound(count),
  describe: ({ dividend, divisor }) => `Share ${dividend} with ${divisor} bunnies`,
  facts: ({ divisor, quotient }) => [[divisor, quotient]],

  prompt: () => 'Share the carrots so every bunny gets the same amount!',

  render({ dividend, divisor }) {
    const seats = Array.from({ length: divisor }, (_, i) => `
      <div class="share-seat">
        <div class="share-bunny">${miniBunnySVG(FURS[i % FURS.length])}</div>
        <div class="share-plate"></div>
      </div>`).join('');
    return `
      <p class="word-problem">Share ${dividend} carrots equally with ${divisor} bunnies. How many carrots does each bunny get?</p>
      <div class="picture share-scene">
        <div class="carrot-pile" role="img" aria-label="A pile of ${dividend} carrots">${carrotSVG().repeat(dividend)}</div>
        <div class="share-seats">${seats}</div>
      </div>
      <p class="flip-row"><button type="button" class="flip-button deal-button">Give each bunny a carrot</button></p>
      <div class="equation compact"><span class="eq-label">Each bunny gets</span>${numberInput('answer', 'Carrots for each bunny')}</div>`;
  },

  mount(el, problem, ctx) {
    el.querySelector('.deal-button').addEventListener('click', () => {
      if (!dealOnce(el)) return;
      markShared(el);
      ctx.say(`All ${problem.dividend} carrots are shared! How many carrots does each bunny have?`);
      el.querySelector('input[name="answer"]').focus();
    });
  },

  check: checkShare,
  hint: shareHint,

  // After two misses, finish sharing so every plate is full.
  help(el, problem, misses) {
    if (misses < 2) return;
    while (!dealOnce(el));
    markShared(el);
  },

  solved: ({ dividend, divisor, quotient }) => `${dividend} ÷ ${divisor} = ${quotient}. Each bunny gets ${plural(quotient, 'carrot')}!`,
};
