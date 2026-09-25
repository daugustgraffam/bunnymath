// Hutch Stacking: the associative property. a × b × c is drawn as `a` hutches,
// each with `b` shelves of `c` bunnies. You can count all the shelves first,
// (a × b) × c, or one hutch first, a × (b × c), and both give the same total.
// Picking the grouping that keeps the first step small is the real skill.
//
// Problem kinds:
//   choose  – pick which pair to multiply first, then solve in two steps
//   regroup – move the parentheses: (a × b) × c = a × ▢  or  a × (b × c) = ▢ × c

import { randomInt, shuffle, parseWhole, hintFor, skipCountHint } from '../problems.js';
import { numberInput, hutchesHTML, plural } from '../visuals.js';

// A first step counts as easy when its answer is 10 or less, so the second
// step stays inside the times tables (or is a times-10 fact).
const EASY_FIRST = 10;
const MAX_TOTAL = 80;
const SMART_PICK_BONUS = 1;

export const ROUTES = {
  // (a × b) × c: count every shelf, then the bunnies on them.
  left: {
    first: ({ a, b }) => a * b,
    firstText: ({ a, b }) => `${a} × ${b}`,
    grouped: ({ a, b, c }) => `(${a} × ${b}) × ${c}`,
    second: (p, first) => `${first} × ${p.c}`,
    group: 'shelves',
    explain: ({ a, b }) => `First count the shelves: ${plural(a, 'hutch', 'hutches')} × ${b} shelves each.`,
  },
  // a × (b × c): count the bunnies in one hutch, then all the hutches.
  right: {
    first: ({ b, c }) => b * c,
    firstText: ({ b, c }) => `${b} × ${c}`,
    grouped: ({ a, b, c }) => `${a} × (${b} × ${c})`,
    second: (p, first) => `${p.a} × ${first}`,
    group: 'hutches',
    explain: ({ b, c }) => `First count one hutch: ${b} shelves × ${c} bunnies each.`,
  },
};

const otherRoute = (route) => (route === 'left' ? 'right' : 'left');

export function easyRoutes(problem) {
  return Object.keys(ROUTES).filter((route) => ROUTES[route].first(problem) <= EASY_FIRST);
}

// A smart pick: the only route whose first step is easy.
export function isSmartPick(problem, route) {
  const easy = easyRoutes(problem);
  return easy.length === 1 && easy[0] === route;
}

// Mostly triples where only one grouping is easy, so the choice matters.
export function makeTriple(rand = Math.random) {
  for (;;) {
    const a = randomInt(2, 5, rand);
    const b = randomInt(2, 5, rand);
    const c = randomInt(2, 9, rand);
    const easy = easyRoutes({ a, b, c }).length;
    if (a * b * c > MAX_TOTAL || easy === 0) continue;
    if (easy === 2 && rand() < 0.6) continue;
    return { a, b, c, answer: a * b * c };
  }
}

// Starts with two choose problems, then mixes in regrouping.
export function makeHutchRound(count, rand = Math.random) {
  const rest = Array.from({ length: Math.max(0, count - 2) }, (_, i) => (i % 2 ? 'choose' : 'regroup'));
  const kinds = ['choose', 'choose', ...shuffle(rest, rand)].slice(0, count);
  const seen = new Set();
  const problems = [];
  while (problems.length < count) {
    const triple = makeTriple(rand);
    const key = `${triple.a}x${triple.b}x${triple.c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const kind = kinds[problems.length];
    const problem = { ...triple, kind };
    if (kind === 'regroup') {
      // Regroup toward the easy side so the missing number is friendly.
      const target = pickRegroupTarget(triple, rand);
      problem.from = otherRoute(target);
      problem.expected = ROUTES[target].first(triple);
    }
    problems.push(problem);
  }
  return problems;
}

function pickRegroupTarget(triple, rand) {
  const easy = easyRoutes(triple);
  return easy.length === 1 ? easy[0] : (rand() < 0.5 ? 'left' : 'right');
}

export function checkHutch(problem, input) {
  if (problem.kind === 'regroup') {
    const correct = parseWhole(input.answer) === problem.expected;
    return { correct, wrong: correct ? [] : ['answer'] };
  }
  const route = ROUTES[problem.route];
  const wrong = [];
  if (parseWhole(input.first) !== route.first(problem)) wrong.push('first');
  if (parseWhole(input.total) !== problem.answer) wrong.push('total');
  const correct = wrong.length === 0;
  return { correct, wrong, bonus: correct && isSmartPick(problem, problem.route) ? SMART_PICK_BONUS : 0 };
}

// Hint for a second step like 12 × 4: break the bigger number into 10 and the rest.
function secondStepHint(first, other) {
  if (first === 10 || other === 10) return 'Times 10 trick: put a 0 on the end!';
  if (first <= 10) return skipCountHint({ a: other, b: first });
  const ones = first - 10;
  return `Break it apart: 10 × ${other} = ${10 * other}, and ${ones} × ${other} = ${ones * other}. Add them up!`;
}

export function hutchHint(problem, misses, result) {
  if (problem.kind === 'regroup') {
    const target = ROUTES[otherRoute(problem.from)];
    const pair = target.firstText(problem);
    if (misses >= 3) return `${pair} = ${problem.expected}, so the missing number is ${problem.expected}.`;
    if (misses === 2) return `The box is ${pair}. ${skipCountHint(pairFactors(problem, target))}`;
    return `The numbers stay in the same order. Only the parentheses move. What is ${pair}?`;
  }

  const route = ROUTES[problem.route];
  const first = route.first(problem);
  const other = problem.route === 'left' ? problem.c : problem.a;
  if (misses >= 3) {
    return `${route.firstText(problem)} = ${first}, and ${route.second(problem, first)} = ${problem.answer}. Type those in to keep going.`;
  }
  if (result.wrong.includes('first')) {
    const [x, y] = route.firstText(problem).split(' × ').map(Number);
    return `Step 1: ${hintFor({ a: x, b: y, answer: x * y }, misses)}`;
  }
  if (misses === 1) return `Step 1 is right! Now step 2: ${route.second(problem, first)}.`;
  return `Step 2: ${secondStepHint(first, other)}`;
}

function pairFactors(problem, route) {
  const [a, b] = route.firstText(problem).split(' × ').map(Number);
  return { a, b };
}

// ---------- Markup ----------

function picture(problem, options) {
  const caption = `${plural(problem.a, 'hutch', 'hutches')}, ${problem.b} shelves in each, ${problem.c} bunnies on each shelf`;
  return `${hutchesHTML(problem.a, problem.b, problem.c, options)}<p class="picture-caption">${caption}</p>`;
}

function routeSteps(problem, routeKey) {
  const route = ROUTES[routeKey];
  const mirror = '<span class="mirror" data-mirror>?</span>';
  const second = routeKey === 'left' ? `${mirror}<span>× ${problem.c}</span>` : `<span>${problem.a} ×</span>${mirror}`;
  return `
    <div class="equation compact step">
      <span class="step-label">Step 1</span><span>${route.firstText(problem)}</span><span>=</span>${numberInput('first', 'Step 1 answer')}
    </div>
    <div class="equation compact step">
      <span class="step-label">Step 2</span>${second}<span>=</span>${numberInput('total', 'Step 2 answer')}
    </div>`;
}

function bothWays(problem, chosen) {
  return ['left', 'right'].map((key) => {
    const route = ROUTES[key];
    const first = route.first(problem);
    const line = `${route.grouped(problem)} = ${route.second(problem, first)} = ${problem.answer}`;
    return `<p class="way ${key === chosen ? 'chosen' : ''}">${line}</p>`;
  }).join('');
}

export default {
  id: 'hutch',
  title: 'Hutch Stacking',
  blurb: 'Pick which two to multiply first',
  icon: () => hutchesHTML(2, 2, 2),

  makeRound: (count) => makeHutchRound(count),

  describe(problem) {
    const { a, c } = problem;
    if (problem.kind === 'regroup') {
      return `${ROUTES[problem.from].grouped(problem)} = ${problem.from === 'left' ? `${a} × ▢` : `▢ × ${c}`}`;
    }
    return ROUTES[problem.route].grouped(problem);
  },

  // The times-table steps worked out; a big step 2 like 16 × 2 isn't a table fact.
  facts(problem) {
    const routeKey = problem.kind === 'regroup' ? otherRoute(problem.from) : problem.route;
    const route = ROUTES[routeKey];
    const first = route.first(problem);
    const pairs = [route.firstText(problem).split(' × ').map(Number)];
    if (problem.kind === 'choose' && first <= 10) pairs.push([first, routeKey === 'left' ? problem.c : problem.a]);
    return pairs;
  },

  prompt(problem) {
    if (problem.kind === 'regroup') return 'Move the parentheses! What number goes in the box?';
    return 'Which two numbers do you want to multiply first? Pick the easier way!';
  },

  render(problem) {
    const { a, b, c } = problem;
    if (problem.kind === 'regroup') {
      const target = otherRoute(problem.from);
      const lhs = ROUTES[problem.from].grouped(problem);
      const rhs = problem.from === 'left' ? `<span>${a} ×</span>${numberInput('answer', 'Missing number')}`
        : `${numberInput('answer', 'Missing number')}<span>× ${c}</span>`;
      return `
        <div class="picture hutch-picture">${picture(problem, { group: ROUTES[target].group })}</div>
        <div class="equation compact"><span>${lhs}</span><span>=</span>${rhs}</div>`;
    }
    return `
      <div class="picture hutch-picture">${picture(problem)}</div>
      <p class="sentence triple">${a} × ${b} × ${c}</p>
      <div class="route-choices">
        <button type="button" class="route-button" data-route="left">(${a} × ${b}) × ${c}</button>
        <button type="button" class="route-button" data-route="right">${a} × (${b} × ${c})</button>
      </div>
      <div class="steps"></div>`;
  },

  mount(el, problem, ctx) {
    if (problem.kind !== 'choose') return;
    ctx.setCheckVisible(false);
    const buttons = [...el.querySelectorAll('.route-button')];
    for (const button of buttons) {
      button.addEventListener('click', () => {
        const routeKey = button.dataset.route;
        problem.route = routeKey;
        for (const b of buttons) b.disabled = true;
        button.classList.add('chosen');
        el.querySelector('.hutch-picture').innerHTML = picture(problem, { group: ROUTES[routeKey].group });

        const steps = el.querySelector('.steps');
        steps.innerHTML = routeSteps(problem, routeKey);
        const firstInput = steps.querySelector('input[name="first"]');
        const mirror = steps.querySelector('[data-mirror]');
        firstInput.addEventListener('input', () => {
          mirror.textContent = firstInput.value.trim() || '?';
        });
        ctx.setCheckVisible(true);
        ctx.say(`${ROUTES[routeKey].explain(problem)} Then step 2!`);
        firstInput.focus();
      });
    }
  },

  check: checkHutch,
  hint: hutchHint,

  help(el, problem, misses) {
    if (misses < 2) return;
    const routeKey = problem.kind === 'regroup' ? otherRoute(problem.from) : problem.route;
    el.querySelector('.hutch-picture').innerHTML = picture(problem, { group: ROUTES[routeKey].group, numbers: true });
  },

  celebrate(el, problem) {
    const chosen = problem.kind === 'choose' ? problem.route : otherRoute(problem.from);
    const box = document.createElement('div');
    box.className = 'both-ways';
    box.innerHTML = `<p class="both-title">Both ways make ${problem.answer}!</p>${bothWays(problem, chosen)}`;
    el.append(box);
  },

  solved(problem) {
    if (problem.kind === 'regroup') {
      return `${ROUTES[problem.from].grouped(problem)} = ${ROUTES[otherRoute(problem.from)].grouped(problem)}. Moving the parentheses doesn't change the total!`;
    }
    const route = ROUTES[problem.route];
    const other = ROUTES[otherRoute(problem.route)];
    if (isSmartPick(problem, problem.route)) {
      return `Smart pick! ${route.firstText(problem)} = ${route.first(problem)} made step 2 easy. Bonus carrot!`;
    }
    if (isSmartPick(problem, otherRoute(problem.route))) {
      return `Both ways make ${problem.answer}. Next time, try ${other.firstText(problem)} first. It's easier!`;
    }
    return `Both ways make ${problem.answer}!`;
  },
};
