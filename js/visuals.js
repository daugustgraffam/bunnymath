// Markup builders shared by the game modes: answer boxes, burrows, carrot patches.

import { carrotSVG, crateSVG, miniBunnySVG } from './bunnies.js';

const BURROW_FURS = ['#d6ac82', '#f6f1ea', '#efc57e', '#9a8f88', '#b97d50', '#d8d0e8'];

export function plural(n, word, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

export function numberInput(name, label, { disabled = false } = {}) {
  return `<input class="answer-input" name="${name}" type="text" inputmode="numeric" maxlength="3"
    autocomplete="off" aria-label="${label}" ${disabled ? 'disabled' : ''}>`;
}

// Running totals under each group: 3, 6, 9, ? (the last is hidden unless showLast).
function runningTotal(index, count, size, { totals, showLast }) {
  if (!totals) return '';
  const last = index === count - 1;
  return `<span class="running-total">${last && !showLast ? '?' : (index + 1) * size}</span>`;
}

// `groups` burrows with `each` carrots (or bunnies) inside.
export function burrowsHTML(groups, each, { item = 'carrot', totals = false, showLast = false } = {}) {
  if (groups === 0) return '<p class="picture-caption">0 burrows, so there is nothing at all!</p>';
  const burrows = Array.from({ length: groups }, (_, g) => {
    const thing = item === 'bunny' ? miniBunnySVG(BURROW_FURS[g % BURROW_FURS.length]) : carrotSVG();
    const inside = each === 0 ? '<span class="empty">empty</span>' : thing.repeat(each);
    return `<div class="burrow-slot"><div class="burrow">${inside}</div>${runningTotal(g, groups, each, { totals, showLast })}</div>`;
  });
  const things = item === 'bunny' ? 'bunnies' : 'carrots';
  return `<div class="burrows" role="img" aria-label="${plural(groups, 'burrow')} with ${each} ${things} in each">${burrows.join('')}</div>`;
}

// A carrot patch (array): `rows` rows with `cols` carrots in each row.
export function patchHTML(rows, cols, { totals = false, showLast = false } = {}) {
  const rowMarkup = Array.from({ length: rows }, (_, r) =>
    `<div class="patch-row">${carrotSVG().repeat(cols)}${runningTotal(r, rows, cols, { totals, showLast })}</div>`);
  return `<div class="patch" role="img" aria-label="${plural(rows, 'row')} of ${plural(cols, 'carrot')}">${rowMarkup.join('')}</div>`;
}

// `hutches` hutches, each with `shelves` shelves of `each` bunnies: the picture
// for a × b × c. `group` highlights one grouping: 'shelves' for (a × b) × c
// (count every shelf first) or 'hutches' for a × (b × c) (count one hutch
// first). `numbers` labels the shelves 1, 2, 3… or each hutch with its total.
export function hutchesHTML(hutches, shelves, each, { group = null, numbers = false } = {}) {
  let shelfNumber = 0;
  const hutchMarkup = Array.from({ length: hutches }, (_, h) => {
    const bunny = miniBunnySVG(BURROW_FURS[h % BURROW_FURS.length]);
    const shelfMarkup = Array.from({ length: shelves }, () => {
      shelfNumber += 1;
      const badge = numbers && group === 'shelves' ? `<span class="shelf-number">${shelfNumber}</span>` : '';
      return `<div class="shelf">${badge}${bunny.repeat(each)}</div>`;
    }).join('');
    const count = numbers && group === 'hutches' ? `<span class="hutch-count">${shelves * each}</span>` : '';
    return `<div class="hutch-slot"><div class="hutch">${shelfMarkup}</div>${count}</div>`;
  });
  const label = `${plural(hutches, 'hutch', 'hutches')} with ${plural(shelves, 'shelf', 'shelves')} of ${each} bunnies`;
  return `<div class="hutches ${group ? `by-${group}` : ''}" role="img" aria-label="${label}">${hutchMarkup.join('')}</div>`;
}

// `groups` groups of `crates` crates, 10 carrots in each crate: the picture for
// a × (tens × 10). With `totals`, each group is labeled with a running count
// (3, 6, 9, ? crates, or 30, 60, 90, ? carrots).
// `unit` sets what the totals count: 1 for crates (tens), 10 for carrots.
export function cratesHTML(groups, crates, { totals = false, showLast = false, unit = 1 } = {}) {
  const groupMarkup = Array.from({ length: groups }, (_, g) =>
    `<div class="crate-slot"><div class="crate-group">${crateSVG().repeat(crates)}</div>${runningTotal(g, groups, crates * unit, { totals, showLast })}</div>`);
  const label = `${plural(groups, 'group')} of ${plural(crates, 'crate')}, 10 carrots in each crate`;
  return `<div class="crate-groups" role="img" aria-label="${label}">${groupMarkup.join('')}</div>`;
}
