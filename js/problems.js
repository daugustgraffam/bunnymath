// Shared problem helpers and the Quick Facts generator/hints. Pure functions — no DOM.

export const MIN_FACTOR = 0;
export const MAX_FACTOR = 10;

export function randomInt(min, max, rand = Math.random) {
  return min + Math.floor(rand() * (max - min + 1));
}

export function pick(list, rand = Math.random) {
  return list[Math.floor(rand() * list.length)];
}

export function shuffle(list, rand = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Parses a typed whole number; returns null for anything else.
export function parseWhole(input) {
  const trimmed = String(input ?? '').trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

// `count` distinct (a, b) pairs. `accept` can veto a pair; it runs only for
// pairs not already chosen, and every accepted pair is kept.
export function uniquePairs(count, { aMin, aMax, bMin = aMin, bMax = aMax, rand = Math.random, accept = () => true }) {
  const pairs = [];
  const seen = new Set();
  while (pairs.length < count) {
    const a = randomInt(aMin, aMax, rand);
    const b = randomInt(bMin, bMax, rand);
    const key = `${a}x${b}`;
    if (seen.has(key) || !accept(a, b)) continue;
    seen.add(key);
    pairs.push({ a, b, answer: a * b });
  }
  return pairs;
}

export function makeFact({ min = MIN_FACTOR, max = MAX_FACTOR, rand = Math.random } = {}) {
  const a = randomInt(min, max, rand);
  const b = randomInt(min, max, rand);
  return { a, b, answer: a * b };
}

// Facts with a 0 or 1 are quick rules rather than real practice.
export function isEasyFact({ a, b }) {
  return a <= 1 || b <= 1;
}

// A round of unique facts with at most one "easy" (0 or 1) fact.
export function makeRound(count, { min = MIN_FACTOR, max = MAX_FACTOR, rand = Math.random } = {}) {
  let easyUsed = false;
  return uniquePairs(count, {
    aMin: min,
    aMax: max,
    rand,
    accept: (a, b) => {
      if (!isEasyFact({ a, b })) return true;
      if (easyUsed) return false;
      easyUsed = true;
      return true;
    },
  });
}

export function checkAnswer(fact, input) {
  return parseWhole(input) === fact.answer;
}

// "Count by 3s: 3, 6, 9... one more hop!" — stops one hop short of a × b.
export function skipCountHint({ a, b }) {
  const jumps = [];
  for (let i = 1; i < a; i++) jumps.push(b * i);
  return `Count by ${b}s: ${jumps.join(', ')}... one more hop!`;
}

// Hint ladder: 1st miss nudges, 2nd miss skip-counts, 3rd miss gives the answer.
export function hintFor({ a, b, answer }, misses) {
  if (misses >= 3) {
    return `It's ${answer}! ${a} groups of ${b} make ${answer}. Type ${answer} to keep going.`;
  }
  if (misses === 2) {
    if (a <= 1 || b === 0) return 'Look at the burrows below and count the carrots.';
    return skipCountHint({ a, b });
  }
  if (a === 0) return '0 groups means there are no groups at all. How many carrots is that?';
  if (b === 0) return `${a} burrows with 0 carrots in each. How many carrots is that?`;
  if (a === 1) return `Just 1 group of ${b}. How many is that?`;
  if (b === 1) return `${a} groups with 1 carrot in each. How many is that?`;
  if (a === 10 || b === 10) {
    const other = a === 10 ? b : a;
    return `Times 10 trick: put a 0 on the end of ${other}!`;
  }
  return `${a} × ${b} means ${a} groups of ${b}. Try skip counting by ${b}!`;
}

// ---------- Division ----------
//
// Beginning division has no remainders: every problem is a multiplication fact
// run backwards, dividend ÷ divisor = quotient where quotient × divisor = dividend.

// A round of division facts. Divide-by-1, 0 ÷ n and n ÷ n are quick rules, so at
// most `easyLimit` of them per round.
export function makeDivRound(count, {
  divisorMin = 1, divisorMax = 10, quotientMin = 0, quotientMax = 10, easyLimit = 1, rand = Math.random,
} = {}) {
  let easy = 0;
  return uniquePairs(count, {
    aMin: divisorMin,
    aMax: divisorMax,
    bMin: quotientMin,
    bMax: quotientMax,
    rand,
    accept: (divisor, quotient) => {
      if (divisor > 1 && quotient > 1) return true;
      if (easy >= easyLimit) return false;
      easy += 1;
      return true;
    },
  }).map(({ a: divisor, b: quotient }) => ({ divisor, quotient, dividend: divisor * quotient, answer: quotient }));
}

// Hint ladder for a ÷ fact: think multiplication, then count by the divisor, then the answer.
export function divHint({ dividend, divisor, quotient }, misses) {
  if (misses >= 3) {
    return `${dividend} ÷ ${divisor} = ${quotient}, because ${quotient} × ${divisor} = ${dividend}. Type ${quotient} to keep going.`;
  }
  if (dividend === 0) return 'Zero carrots shared out is zero for everyone!';
  if (divisor === 1) return 'Dividing by 1 means one big group. Everything is in it!';
  if (dividend === divisor) return 'Any number divided by itself is 1.';
  if (misses === 2) return `Count by ${divisor}s up to ${dividend}, holding up a finger for each count. How many fingers?`;
  return `Think multiplication: ${divisor} × ▢ = ${dividend}.`;
}
