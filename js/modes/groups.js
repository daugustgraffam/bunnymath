// Burrow Groups: read a picture of equal groups (burrows) or an array (carrot
// patch) and write it as a multiplication sentence: groups × each = total.

import { uniquePairs, shuffle, parseWhole, skipCountHint } from '../problems.js';
import { numberInput, burrowsHTML, patchHTML } from '../visuals.js';

const KINDS = {
  groups: {
    groupsCaption: 'burrows',
    eachCaption: 'bunnies in each',
    totalCaption: 'bunnies in all',
    prompt: 'How many burrows? How many bunnies in each? How many bunnies in all?',
    countGroups: 'Count the burrows. That’s the first number.',
    countEach: 'How many bunnies are in just one burrow?',
    totalsWhere: 'Check the numbers under the burrows.',
    solved: (a, b) => `${a} burrows with ${b} bunnies in each`,
  },
  array: {
    groupsCaption: 'rows',
    eachCaption: 'carrots in each row',
    totalCaption: 'carrots in all',
    prompt: 'How many rows? How many carrots in each row? How many carrots in all?',
    countGroups: 'Count the rows from top to bottom. That’s the first number.',
    countEach: 'How many carrots are in just one row?',
    totalsWhere: 'Check the numbers next to the rows.',
    solved: (a, b) => `${a} rows with ${b} carrots in each`,
  },
};

// Starts with a burrow picture, then mixes burrows and carrot patches.
export function makeGroupsRound(count, rand = Math.random) {
  const rest = Array.from({ length: count - 1 }, (_, i) => (i % 2 ? 'groups' : 'array'));
  const kinds = ['groups', ...shuffle(rest, rand)];
  const pairs = uniquePairs(count, { aMin: 2, aMax: 6, bMin: 2, bMax: 9, rand });
  return pairs.map((pair, i) => ({ ...pair, kind: kinds[i] }));
}

export function checkGroups({ a, b, answer }, input) {
  const groups = parseWhole(input.groups);
  const each = parseWhole(input.each);
  const total = parseWhole(input.total);
  const wrong = [];
  if (groups !== a) wrong.push('groups');
  if (each !== b) wrong.push('each');
  if (total !== answer) wrong.push('total');
  return { correct: wrong.length === 0, wrong, swapped: a !== b && groups === b && each === a };
}

export function groupsHint(problem, misses, result) {
  const { a, b, answer } = problem;
  const kind = KINDS[problem.kind];
  if (misses >= 3) return `It's ${a} × ${b} = ${answer}. Type those in to keep going.`;
  if (result.swapped) {
    return `So close! The first number is how many ${kind.groupsCaption}. The second is how many are in each one.`;
  }
  if (result.wrong.includes('groups')) return kind.countGroups;
  if (result.wrong.includes('each')) return kind.countEach;
  if (misses === 1) return `That's ${a} groups of ${b}. Try skip counting by ${b}!`;
  return `${skipCountHint(problem)} ${kind.totalsWhere}`;
}

function picture(problem, options) {
  return problem.kind === 'groups'
    ? burrowsHTML(problem.a, problem.b, { item: 'bunny', ...options })
    : patchHTML(problem.a, problem.b, options);
}

function blank(name, caption) {
  return `<label class="blank">${numberInput(name, caption)}<span class="caption">${caption}</span></label>`;
}

export default {
  id: 'groups',
  title: 'Burrow Groups',
  blurb: 'Turn pictures into multiplication',
  icon: () => burrowsHTML(2, 2, { item: 'bunny' }),

  makeRound: (count) => makeGroupsRound(count),

  prompt: (problem) => KINDS[problem.kind].prompt,

  render(problem) {
    const kind = KINDS[problem.kind];
    return `
      <div class="picture">${picture(problem)}</div>
      <div class="equation compact">
        ${blank('groups', kind.groupsCaption)}<span>×</span>
        ${blank('each', kind.eachCaption)}<span>=</span>
        ${blank('total', kind.totalCaption)}
      </div>`;
  },

  check: checkGroups,
  hint: groupsHint,

  help(el, problem, misses) {
    if (misses < 2) return;
    el.querySelector('.picture').innerHTML = picture(problem, { totals: true, showLast: misses >= 3 });
  },

  solved: ({ kind, a, b, answer }) => `${KINDS[kind].solved(a, b)} is ${a} × ${b} = ${answer}.`,
};
