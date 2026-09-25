// Quick Facts: plain "a × b = ?" practice, 0–10.
//
// Every mode exports the same shape, used by the round engine in main.js:
//   id, title, blurb, icon()          – mode picker card
//   makeRound(count) → problems       – pure
//   prompt(problem) → text            – what the helper bunny says first
//   render(problem) → markup          – the problem area; inputs are named
//   mount?(el, problem, ctx)          – optional interactivity (ctx.say, ctx.setCheckVisible)
//   check(problem, answer) → { correct, wrong: [input names or 'choice'], bonus?, ... }  – pure;
//                                       bonus is extra carrots for a correct answer
//   hint(problem, misses, result) → text  – pure
//   help?(el, problem, misses)        – optional visual help after a miss
//   celebrate?(el, problem, result)   – optional extra display once solved
//   solved(problem, result) → text    – shown with the praise

import { makeRound, hintFor, parseWhole, pick } from '../problems.js';
import { numberInput, burrowsHTML, plural } from '../visuals.js';

const ASKS = ['Can you solve this one?', 'What do you think?', 'Take your time!', 'You can do it!'];

export default {
  id: 'facts',
  title: 'Quick Facts',
  blurb: 'Answer multiplication facts',
  icon: () => '<span class="mode-icon-text">3×4</span>',

  makeRound: (count) => makeRound(count),

  prompt: () => pick(ASKS),

  render: ({ a, b }) => `
    <div class="equation">
      <span>${a} × ${b}</span><span>=</span>${numberInput('answer', 'Your answer')}
    </div>
    <div class="picture" hidden></div>`,

  check({ answer }, input) {
    const correct = parseWhole(input.answer) === answer;
    return { correct, wrong: correct ? [] : ['answer'] };
  },

  hint: (problem, misses) => hintFor(problem, misses),

  help(el, { a, b }, misses) {
    if (misses < 2) return;
    const picture = el.querySelector('.picture');
    const caption = a === 0 ? '' : `<p class="picture-caption">${plural(a, 'burrow')} with ${plural(b, 'carrot')} in each</p>`;
    picture.innerHTML = caption + burrowsHTML(a, b);
    picture.hidden = false;
  },

  solved: ({ a, b, answer }) => `${a} × ${b} = ${answer}.`,
};
