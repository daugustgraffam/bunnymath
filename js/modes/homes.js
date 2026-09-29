// Burrow Homes: division as making equal groups. You know how many bunnies
// fit in each burrow and fill burrows until everyone has a home. Then count
// the burrows: 12 bunnies, 4 in each burrow → 12 ÷ 4 = 3 burrows.
// (Share the Carrots is the other kind of division: there you know the
// number of groups and find how many are in each.)

import { uniquePairs, parseWhole } from '../problems.js';
import { numberInput, plural } from '../visuals.js';
import { miniBunnySVG } from '../bunnies.js';

const FURS = ['#d6ac82', '#f6f1ea', '#efc57e', '#9a8f88', '#b97d50', '#d8d0e8'];

export function makeHomesRound(count, rand = Math.random) {
  return uniquePairs(count, { aMin: 2, aMax: 6, bMin: 2, bMax: 7, rand })
    .map(({ a: divisor, b: quotient }) => ({ divisor, quotient, dividend: divisor * quotient, answer: quotient }));
}

export function checkHomes({ quotient }, input) {
  const correct = parseWhole(input.answer) === quotient;
  return { correct, wrong: correct ? [] : ['answer'] };
}

export function homesHint({ dividend, divisor, quotient }, misses) {
  if (misses >= 3) return `They need ${quotient} burrows: ${quotient} × ${divisor} = ${dividend}. Type ${quotient} to keep going.`;
  if (misses === 2) return `Think multiplication: ▢ burrows × ${divisor} bunnies = ${dividend}. Count the burrows.`;
  return `Put ${divisor} bunnies in each burrow until everyone has a home. Then count the burrows.`;
}

// Moves one burrow's worth of bunnies from the line into a new burrow.
// Returns true once nobody is left waiting.
function fillOne(el, divisor) {
  const waiting = el.querySelector('.waiting-bunnies');
  if (waiting.children.length === 0) return true;
  const burrow = document.createElement('div');
  burrow.className = 'burrow home-burrow';
  for (let i = 0; i < divisor && waiting.firstElementChild; i++) burrow.append(waiting.firstElementChild);
  el.querySelector('.homes').append(burrow);
  return waiting.children.length === 0;
}

function markHoused(el) {
  const button = el.querySelector('.fill-button');
  button.disabled = true;
  button.textContent = 'Everyone has a home!';
}

export default {
  id: 'homes',
  subject: 'divide',
  title: 'Burrow Homes',
  blurb: 'Make equal groups',
  icon: () => `<span class="homes-icon"><span class="burrow">${miniBunnySVG(FURS[0]).repeat(2)}</span><span class="burrow">${miniBunnySVG(FURS[1]).repeat(2)}</span></span>`,

  makeRound: (count) => makeHomesRound(count),
  describe: ({ dividend, divisor }) => `${dividend} bunnies, ${divisor} per burrow`,
  facts: ({ divisor, quotient }) => [[divisor, quotient]],

  prompt: () => 'Every bunny needs a home!',

  render({ dividend, divisor }) {
    const bunnies = Array.from({ length: dividend }, (_, i) => miniBunnySVG(FURS[i % FURS.length])).join('');
    return `
      <p class="word-problem">${dividend} bunnies need homes. ${divisor} bunnies fit in each burrow. How many burrows do they need?</p>
      <div class="picture homes-scene">
        <div class="waiting-bunnies" role="img" aria-label="${dividend} bunnies waiting">${bunnies}</div>
        <div class="homes burrows"></div>
      </div>
      <p class="flip-row"><button type="button" class="flip-button fill-button">Fill a burrow with ${plural(divisor, 'bunny', 'bunnies')}</button></p>
      <div class="equation compact"><span class="eq-label">Burrows needed</span>${numberInput('answer', 'Burrows needed')}</div>`;
  },

  mount(el, problem, ctx) {
    el.querySelector('.fill-button').addEventListener('click', () => {
      if (!fillOne(el, problem.divisor)) return;
      markHoused(el);
      ctx.say('Everyone has a home! How many burrows did it take?');
      el.querySelector('input[name="answer"]').focus();
    });
  },

  check: checkHomes,
  hint: homesHint,

  // After two misses, fill the rest of the burrows.
  help(el, problem, misses) {
    if (misses < 2) return;
    while (!fillOne(el, problem.divisor));
    markHoused(el);
  },

  solved: ({ dividend, divisor, quotient }) => `${dividend} ÷ ${divisor} = ${quotient}. ${plural(quotient, 'burrow')} of ${divisor} bunnies!`,
};
