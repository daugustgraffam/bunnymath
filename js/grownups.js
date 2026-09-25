// The grown-up page: a read-only view of the practice history (stats.js) and
// the game save (rewards.js) on this device.

import { loadStats, clearStats, factKey, factStatus, dayKey, MASTERED_STREAK } from './stats.js';
import { loadState, totalMet } from './rewards.js';
import { FIELD_SIZE } from './world.js';
import facts from './modes/facts.js';
import groups from './modes/groups.js';
import flip from './modes/flip.js';
import hutch from './modes/hutch.js';
import fence from './modes/fence.js';
import crates from './modes/crates.js';

const MODES = [facts, groups, flip, hutch, fence, crates];
const MAX_FACTOR = 10;
const RECENT_SHOWN = 25;
const SHAKY_SHOWN = 10;

const STATUS = {
  mastered: { symbol: '✓', label: 'Mastered', note: `right on the first try the last ${MASTERED_STREAK} times` },
  learning: { symbol: '•', label: 'Learning', note: 'practiced, not enough yet to say' },
  shaky: { symbol: '!', label: 'Needs practice', note: 'needed help recently' },
  new: { symbol: '', label: 'Not yet', note: 'hasn’t come up yet' },
};

const RESULT = {
  first: { symbol: '✓', label: 'First try', status: 'mastered' },
  helped: { symbol: '•', label: 'After a hint', status: 'learning' },
  shown: { symbol: '!', label: 'Answer shown', status: 'shaky' },
};

const $ = (id) => document.getElementById(id);

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const storage = getStorage();

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function minutes(ms) {
  const total = Math.round(ms / 60000);
  if (ms > 0 && total === 0) return 'under 1 min';
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${total % 60} min`;
}

function percent(part, whole) {
  return whole ? `${Math.round((100 * part) / whole)}%` : '—';
}

function when(time) {
  const date = new Date(time);
  const clock = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (dayKey(time) === dayKey(Date.now())) return `Today ${clock}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${clock}`;
}

// ---------- Summary tiles ----------

function renderTiles(stats, state) {
  const games = Object.values(stats.modes);
  const problems = games.reduce((sum, g) => sum + g.problems, 0);
  const first = games.reduce((sum, g) => sum + g.first, 0);
  const ms = games.reduce((sum, g) => sum + g.ms, 0);
  const today = stats.days[dayKey(Date.now())];
  const totalFacts = ((MAX_FACTOR + 1) * (MAX_FACTOR + 2)) / 2;
  const mastered = Object.values(stats.facts).filter((f) => factStatus(f) === 'mastered').length;
  const fieldsDone = state.field;

  const tiles = [
    { label: 'Problems solved', value: problems },
    { label: 'Right on the first try', value: percent(first, problems), sub: problems ? `${first} of ${problems}` : '' },
    { label: 'Time practicing', value: minutes(ms), sub: `today: ${minutes(today?.ms ?? 0)}` },
    { label: 'Days played', value: Object.keys(stats.days).length },
    { label: 'Facts mastered', value: mastered, sub: `of ${totalFacts} (times tables 0–10)` },
    { label: 'Bunnies met', value: totalMet(state), sub: fieldsDone ? `${fieldsDone} full field${fieldsDone === 1 ? '' : 's'} of ${FIELD_SIZE}` : `in the first field` },
  ];
  $('gu-tiles').innerHTML = tiles.map((t) => `
    <div class="gu-tile">
      <p class="gu-tile-label">${t.label}</p>
      <p class="gu-tile-value">${t.value}</p>
      ${t.sub ? `<p class="gu-tile-sub">${t.sub}</p>` : ''}
    </div>`).join('');
}

// ---------- Times-table grid ----------

function factDetail(a, b, fact) {
  const heading = `${a} × ${b} = ${a * b}`;
  const status = factStatus(fact);
  if (status === 'new') return `${heading} · hasn’t come up yet.`;
  const parts = [`${fact.first} right on the first try`];
  if (fact.helped) parts.push(`${fact.helped} after a hint`);
  if (fact.shown) parts.push(`${fact.shown} with the answer shown`);
  return `${heading} · ${STATUS[status].label}: ${STATUS[status].note}. Practiced ${fact.seen} time${fact.seen === 1 ? '' : 's'} (${parts.join(', ')}). Last seen ${when(fact.last)}.`;
}

function renderGrid(stats) {
  $('gu-legend').innerHTML = ['mastered', 'learning', 'shaky', 'new'].map((key) =>
    `<span class="gu-legend-item"><span class="fact-cell status-${key}" aria-hidden="true">${STATUS[key].symbol}</span>${STATUS[key].label}</span>`).join('');

  const header = Array.from({ length: MAX_FACTOR + 1 }, (_, b) => `<span class="fact-head" role="columnheader">${b}</span>`).join('');
  const rows = Array.from({ length: MAX_FACTOR + 1 }, (_, a) => {
    const cells = Array.from({ length: MAX_FACTOR + 1 }, (_, b) => {
      const status = factStatus(stats.facts[factKey(a, b)]);
      return `<button type="button" class="fact-cell status-${status}" role="gridcell" data-a="${a}" data-b="${b}"
        aria-label="${a} times ${b}: ${STATUS[status].label}">${STATUS[status].symbol}</button>`;
    }).join('');
    return `<span class="fact-head" role="rowheader">${a}</span>${cells}`;
  }).join('');
  $('fact-grid').innerHTML = `<span class="fact-head corner" aria-hidden="true">×</span>${header}${rows}`;
}

function showFact(cell) {
  if (!cell?.matches('.fact-cell[data-a]')) return;
  const a = Number(cell.dataset.a);
  const b = Number(cell.dataset.b);
  const stats = loadStats(storage);
  $('fact-detail').textContent = factDetail(a, b, stats.facts[factKey(a, b)]);
  for (const other of $('fact-grid').querySelectorAll('.selected')) other.classList.remove('selected');
  cell.classList.add('selected');
}

// ---------- Lists and tables ----------

function renderShaky(stats) {
  const shaky = Object.entries(stats.facts)
    .filter(([, fact]) => factStatus(fact) === 'shaky')
    .sort(([, x], [, y]) => y.last - x.last)
    .slice(0, SHAKY_SHOWN);
  if (shaky.length === 0) {
    $('gu-shaky').innerHTML = '<p class="gu-note">Nothing right now. Facts show up here when they needed a hint recently.</p>';
    return;
  }
  $('gu-shaky').innerHTML = `<ul class="gu-shaky">${shaky.map(([key, fact]) => {
    const [a, b] = key.split('x').map(Number);
    const lastFew = fact.history.slice(-MASTERED_STREAK);
    const needed = lastFew.replace(/f/g, '').length;
    const note = lastFew.length === 1 ? 'needed help the one time it came up' : `needed help ${needed} of the last ${lastFew.length} times`;
    return `<li><strong>${a} × ${b} = ${a * b}</strong> <span class="gu-muted">${note}</span></li>`;
  }).join('')}</ul>`;
}

function renderGames(stats) {
  const rows = MODES.map((mode) => {
    const game = stats.modes[mode.id];
    if (!game) return `<tr><th scope="row">${mode.title}</th><td class="gu-muted" colspan="5">Not played yet</td></tr>`;
    return `<tr><th scope="row">${mode.title}</th><td>${game.problems}</td><td>${percent(game.first, game.problems)}</td>
      <td>${game.bonus || '—'}</td><td>${minutes(game.ms)}</td><td>${when(game.last)}</td></tr>`;
  }).join('');
  $('gu-games').innerHTML = `<thead><tr><th scope="col">Game</th><th scope="col">Problems</th><th scope="col">First try</th>
    <th scope="col">Smart picks</th><th scope="col">Time</th><th scope="col">Last played</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderDays(stats) {
  const rows = Array.from({ length: 7 }, (_, i) => {
    const time = Date.now() - i * 24 * 60 * 60 * 1000;
    const day = stats.days[dayKey(time)];
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday'
      : new Date(time).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    if (!day) return `<tr><th scope="row">${label}</th><td class="gu-muted" colspan="3">No practice</td></tr>`;
    return `<tr><th scope="row">${label}</th><td>${day.problems}</td><td>${percent(day.first, day.problems)}</td><td>${minutes(day.ms)}</td></tr>`;
  }).join('');
  $('gu-days').innerHTML = `<thead><tr><th scope="col">Day</th><th scope="col">Problems</th><th scope="col">First try</th><th scope="col">Time</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderRecent(stats) {
  const titles = Object.fromEntries(MODES.map((m) => [m.id, m.title]));
  const recent = stats.recent.slice(0, RECENT_SHOWN);
  if (recent.length === 0) {
    $('gu-recent').innerHTML = '<tbody><tr><td class="gu-muted">Nothing yet.</td></tr></tbody>';
    return;
  }
  const rows = recent.map((entry) => {
    const result = RESULT[entry.outcome] ?? RESULT.helped;
    const tries = entry.tries.length ? `tried ${entry.tries.map(escapeHTML).join('; ')}` : '';
    return `<tr><td>${when(entry.time)}</td><td>${titles[entry.mode] ?? escapeHTML(entry.mode)}</td><td>${escapeHTML(entry.text)}</td>
      <td><span class="gu-result"><span class="fact-cell status-${result.status}" aria-hidden="true">${result.symbol}</span>${result.label}</span></td>
      <td class="gu-muted">${tries}</td></tr>`;
  }).join('');
  $('gu-recent').innerHTML = `<thead><tr><th scope="col">When</th><th scope="col">Game</th><th scope="col">Problem</th>
    <th scope="col">Result</th><th scope="col">Wrong tries</th></tr></thead><tbody>${rows}</tbody>`;
}

// ---------- Page ----------

function render() {
  const stats = loadStats(storage);
  const state = loadState(storage);
  const problems = Object.values(stats.modes).reduce((sum, g) => sum + g.problems, 0);
  $('gu-empty').hidden = problems > 0;
  renderTiles(stats, state);
  renderGrid(stats);
  renderShaky(stats);
  renderGames(stats);
  renderDays(stats);
  renderRecent(stats);
}

$('fact-grid').addEventListener('click', (event) => showFact(event.target.closest('.fact-cell')));
$('fact-grid').addEventListener('pointerover', (event) => {
  if (event.pointerType === 'mouse') showFact(event.target.closest('.fact-cell'));
});
$('fact-grid').addEventListener('focusin', (event) => showFact(event.target.closest('.fact-cell')));
$('gu-clear').addEventListener('click', () => {
  if (!window.confirm('Clear the practice history on this device? Bunnies and carrots stay.')) return;
  clearStats(storage);
  $('fact-detail').textContent = 'Tap a square to see how that fact is going.';
  render();
});
// Refresh if the game is being played in another tab.
window.addEventListener('storage', render);

render();
