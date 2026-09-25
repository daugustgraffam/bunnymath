// Practice history for the grown-up page: how every times-table fact is going,
// which games get played, time per day, and a short log of recent problems.
//
// Kept in its own storage slot, apart from the game save, so a problem here can
// never break the game. Everything is aggregated except the recent log, which is
// capped, so it stays small however long a child plays.

export const STATS_KEY = 'bunnymath.stats.v1';
export const RECENT_LIMIT = 100;
export const FACT_HISTORY = 5; // outcomes remembered per fact
export const MASTERED_STREAK = 3; // first-try answers in a row to count as mastered
export const MAX_PROBLEM_MS = 3 * 60 * 1000; // longer than this counts as a break, not play

// Outcome of one problem: right on the first try, right after a hint, or the
// answer had to be shown (third miss).
export function outcomeOf(misses) {
  if (misses === 0) return 'first';
  return misses >= 3 ? 'shown' : 'helped';
}
const OUTCOME_LETTER = { first: 'f', helped: 'h', shown: 's' };

// 7 × 8 and 8 × 7 are one fact.
export function factKey(a, b) {
  return `${Math.min(a, b)}x${Math.max(a, b)}`;
}

// Local calendar day, YYYY-MM-DD.
export function dayKey(time) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function newStats() {
  return { facts: {}, modes: {}, days: {}, recent: [] };
}

// Records one finished problem.
//   mode: game id; text: short description ("7 × 8"); facts: [[a, b], …] it exercised
//   misses: wrong tries before the right answer; tries: the wrong answers, as text
//   bonus: smart-pick carrots; ms: time on the problem; now: when it was answered
export function recordProblem(stats, { mode, text, facts, misses, tries = [], bonus = 0, ms = 0, now = Date.now() }) {
  const outcome = outcomeOf(misses);
  const first = outcome === 'first' ? 1 : 0;
  const playMs = Math.min(Math.max(ms, 0), MAX_PROBLEM_MS);

  const seenKeys = new Set();
  for (const [a, b] of facts) {
    const key = factKey(a, b);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const fact = stats.facts[key] ?? { seen: 0, first: 0, helped: 0, shown: 0, last: 0, history: '' };
    fact.seen += 1;
    fact[outcome] += 1;
    fact.last = now;
    fact.history = (fact.history + OUTCOME_LETTER[outcome]).slice(-FACT_HISTORY);
    stats.facts[key] = fact;
  }

  const game = stats.modes[mode] ?? { problems: 0, first: 0, bonus: 0, ms: 0, last: 0 };
  game.problems += 1;
  game.first += first;
  game.bonus += bonus;
  game.ms += playMs;
  game.last = now;
  stats.modes[mode] = game;

  const day = dayKey(now);
  const today = stats.days[day] ?? { problems: 0, first: 0, ms: 0 };
  today.problems += 1;
  today.first += first;
  today.ms += playMs;
  stats.days[day] = today;

  stats.recent.unshift({ time: now, mode, text, outcome, tries: tries.slice(0, 3), bonus });
  stats.recent.length = Math.min(stats.recent.length, RECENT_LIMIT);
}

// How a fact is going, from its last few outcomes:
//   mastered – the last 3 were all right on the first try
//   shaky    – one of the last 3 needed help
//   learning – seen, but not enough yet to say
//   new      – never practiced
export function factStatus(fact) {
  if (!fact || fact.seen === 0) return 'new';
  const lastThree = fact.history.slice(-MASTERED_STREAK);
  if (lastThree.length === MASTERED_STREAK && /^f+$/.test(lastThree)) return 'mastered';
  if (/[hs]/.test(lastThree)) return 'shaky';
  return 'learning';
}

function isValidStats(s) {
  return (
    s !== null && typeof s === 'object' &&
    [s.facts, s.modes, s.days].every((part) => part !== null && typeof part === 'object' && !Array.isArray(part)) &&
    Array.isArray(s.recent)
  );
}

export function loadStats(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STATS_KEY));
    if (isValidStats(saved)) return saved;
  } catch {
    // Missing, blocked or corrupt: start a fresh history.
  }
  return newStats();
}

export function saveStats(stats, storage) {
  try {
    storage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // History just won't persist this session.
  }
}

export function clearStats(storage) {
  try {
    storage.removeItem(STATS_KEY);
  } catch {
    // Nothing to clear.
  }
}
