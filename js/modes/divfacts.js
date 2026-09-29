// Quick ÷ Facts: plain division facts within 100, no remainders. Every hint
// turns the fact back into multiplication, the way division is learned.

import { makeDivRound, divHint, parseWhole, pick } from '../problems.js';
import { numberInput, burrowsHTML, plural } from '../visuals.js';

const ASKS = ['Think multiplication!', 'What do you think?', 'Take your time!', 'You can do it!'];

export default {
  id: 'divfacts',
  subject: 'divide',
  title: 'Quick ÷ Facts',
  blurb: 'Answer division facts',
  icon: () => '<span class="mode-icon-text">12÷3</span>',

  makeRound: (count) => makeDivRound(count),
  describe: ({ dividend, divisor }) => `${dividend} ÷ ${divisor}`,
  facts: ({ divisor, quotient }) => [[divisor, quotient]],

  prompt: () => pick(ASKS),

  render: ({ dividend, divisor }) => `
    <div class="equation">
      <span>${dividend} ÷ ${divisor}</span><span>=</span>${numberInput('answer', 'Your answer')}
    </div>
    <div class="picture" hidden></div>`,

  check({ quotient }, input) {
    const correct = parseWhole(input.answer) === quotient;
    return { correct, wrong: correct ? [] : ['answer'] };
  },

  hint: (problem, misses) => divHint(problem, misses),

  // After two misses, show the carrots sorted into groups of the divisor: count the groups.
  help(el, { dividend, divisor, quotient }, misses) {
    if (misses < 2 || divisor < 2 || quotient < 2) return;
    const picture = el.querySelector('.picture');
    picture.innerHTML = `<p class="picture-caption">${dividend} carrots in groups of ${divisor}. How many groups?</p>${burrowsHTML(quotient, divisor)}`;
    picture.hidden = false;
  },

  solved: ({ dividend, divisor, quotient }) =>
    `${dividend} ÷ ${divisor} = ${quotient}, because ${plural(quotient, 'group')} of ${divisor} make ${dividend}.`,
};
