import { pick, shuffle } from './problems.js';
import { bunnySVG, bushSVG, carrotSVG, heartSVG, miniBunnySVG } from './bunnies.js';
import { plural, useNumpad } from './visuals.js';
import { BUN_BUN, FIELD_SIZE, FIELD_COLUMNS } from './world.js';
import facts from './modes/facts.js';
import groups from './modes/groups.js';
import flip from './modes/flip.js';
import hutch from './modes/hutch.js';
import fence from './modes/fence.js';
import crates from './modes/crates.js';
import { loadStats, saveStats, recordProblem } from './stats.js';
import {
  loadState, saveState, clearState, earnCarrots, feedVisitor, totalMet,
  HEARTS_TO_FULL, CARROTS_FIRST_TRY, CARROTS_WITH_HELP,
} from './rewards.js';

const MODES = [facts, groups, flip, hutch, fence, crates];
const ROUND_LENGTH = 5;
const PRAISE = ['Yes!', 'Hoppy day!', 'You got it!', 'Carrot-tastic!', 'Great thinking!'];
const GREETINGS = ['says hi!', 'waves a paw!', 'wiggles their nose!', 'does a happy hop!'];
const TRAVEL_MS = 3200;
const CELEBRATE_MS = 1600;

const $ = (id) => document.getElementById(id);

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = getStorage();
let state = loadState(storage);
const stats = loadStats(storage); // practice history for the grown-up page
let round = null; // { mode, problems, helpers, index, misses, answered, carrotsEarned, firstTry, token }
let viewField = state.field; // the field on screen; earlier fields can be revisited
let traveling = false; // true from the 25th friend until the new field is shown

// Restart a CSS animation class on an element.
function animate(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function drawBunny(bunny, mood = bunny.mood ?? 'calm') {
  const { fur, accessory, accessoryColor, name } = bunny;
  return bunnySVG({ fur, mood, accessory, accessoryColor, label: name });
}

function showScreen(name) {
  for (const screen of document.querySelectorAll('.screen')) {
    screen.hidden = screen.id !== `${name}-screen`;
  }
}

// ---------- Counters ----------

function renderCounters() {
  $('carrot-total').textContent = state.carrots;
  $('met-total').textContent = totalMet(state);
}

function celebrateCarrots(n) {
  renderCounters();
  const counter = $('carrot-count');
  animate(counter, 'bump');
  const plus = document.createElement('span');
  plus.className = 'float-plus';
  plus.textContent = `+${n}`;
  plus.addEventListener('animationend', () => plus.remove());
  counter.append(plus);
}

// Fields come from the save, never regenerated, so bunnies a kid has seen stay put.
const fieldBunnies = (field) => state.fields[field].bunnies;
const fieldName = (field) => state.fields[field].name;
const fieldTheme = (field) => state.fields[field].theme;

// "2 × 25 + 7 = 57 bunnies met" — the running total as multiples of 25.
function metMath() {
  const total = totalMet(state);
  if (state.field === 0) return `${plural(total, 'bunny', 'bunnies')} met so far`;
  const fields = `${state.field} × ${FIELD_SIZE}`;
  return state.met ? `${fields} + ${state.met} = ${total} bunnies met` : `${fields} = ${total} bunnies met`;
}

// ---------- Meadow ----------

function currentVisitor() {
  return fieldBunnies(state.field)[state.met];
}

function meadowMessage() {
  if (viewField !== state.field) return `Visiting ${fieldName(viewField)}. Everyone here is already your friend!`;
  const visitor = currentVisitor();
  if (state.carrots === 0) return `${visitor.name} is peeking out of the bushes! Play a game below to earn carrots.`;
  const left = HEARTS_TO_FULL - state.visitorFed;
  return `${visitor.name} is shy. Feed ${plural(left, 'more carrot')} to make friends!`;
}

function heartsMarkup(fed) {
  const hearts = Array.from({ length: HEARTS_TO_FULL }, (_, h) => heartSVG(h < fed)).join('');
  return `<div class="hearts" role="img" aria-label="${fed} of ${HEARTS_TO_FULL} hearts">${hearts}</div>`;
}

// The shy visitor hides behind a bush and rises out a little with each heart.
function shyOffset(fed) {
  return `${(HEARTS_TO_FULL - fed) * 9}%`;
}

function renderVisitor({ fresh = false } = {}) {
  const panel = $('visitor-panel');
  if (viewField !== state.field) {
    panel.innerHTML = `
      <div class="visitor-away">
        <p>You met all ${FIELD_SIZE} bunnies in ${fieldName(viewField)}!</p>
        <p>Bun Bun is off making friends in ${fieldName(state.field)} now.</p>
        <button type="button" id="go-current" class="small-button">Go to Bun Bun →</button>
      </div>`;
    return;
  }
  const visitor = currentVisitor();
  panel.innerHTML = `
    <div class="pair">
      <div class="guide">
        <div class="bunny guide-bunny">${drawBunny(BUN_BUN, 'happy')}</div>
        <p class="bunny-name">Bun Bun</p>
      </div>
      <div class="visitor">
        <div class="visitor-stage">
          <div id="visitor-bunny" class="bunny visitor-bunny ${fresh ? 'peek' : ''}" style="--shy:${shyOffset(state.visitorFed)}">${drawBunny(visitor, 'calm')}</div>
          ${bushSVG()}
        </div>
        <p class="bunny-name">${visitor.name}</p>
        <div id="visitor-hearts">${heartsMarkup(state.visitorFed)}</div>
      </div>
    </div>
    <button type="button" id="feed-button" class="feed-button" ${state.carrots === 0 ? 'disabled' : ''}>${carrotSVG()} Feed ${visitor.name}</button>`;
}

// Updates hearts in place so the visitor can glide up out of the bush.
function updateVisitor() {
  $('visitor-bunny').style.setProperty('--shy', shyOffset(state.visitorFed));
  $('visitor-hearts').innerHTML = heartsMarkup(state.visitorFed);
  $('feed-button').disabled = state.carrots === 0;
}

function renderField({ arrivedSlot = null, freshVisitor = false } = {}) {
  const field = viewField;
  const isCurrent = field === state.field;
  const met = isCurrent ? state.met : FIELD_SIZE;
  const theme = fieldTheme(field);
  const meadow = $('meadow');
  meadow.style.setProperty('--grass-top', theme.top);
  meadow.style.setProperty('--grass-bottom', theme.bottom);
  meadow.style.setProperty('--flower', theme.flower);

  $('field-name').textContent = `Field ${field + 1}: ${fieldName(field)}`;
  $('met-math').textContent = metMath();
  $('prev-field').disabled = traveling || field === 0;
  $('next-field').disabled = traveling || isCurrent;

  $('field-grid').innerHTML = fieldBunnies(field).map((bunny, slot) => {
    if (slot >= met) {
      const next = isCurrent && slot === met ? 'next' : '';
      return `<div class="field-spot ${next}" aria-hidden="true"></div>`;
    }
    const arrived = slot === arrivedSlot ? 'arrive-pop' : '';
    return `<button type="button" class="field-bunny bunny ${arrived}" data-slot="${slot}"
      style="--delay:${(slot % 7) * 0.9}s" aria-label="${bunny.name}">${drawBunny(bunny)}</button>`;
  }).join('');
  $('field-grid').style.setProperty('--columns', FIELD_COLUMNS);
  $('grid-caption').textContent =
    `${met} of ${FIELD_SIZE} bunnies met · ${FIELD_SIZE / FIELD_COLUMNS} rows of ${FIELD_COLUMNS}`;

  renderVisitor({ fresh: freshVisitor });
}

function showField(field) {
  viewField = field;
  renderField();
  $('meadow-message').textContent = meadowMessage();
}

function showMeadow() {
  round = null;
  renderCounters();
  showField(traveling ? viewField : state.field);
  showScreen('meadow');
}

function feed() {
  if (traveling) return;
  const visitor = currentVisitor();
  const result = feedVisitor(state);
  if (!result.ok) return;
  saveState(state, storage);
  renderCounters();

  if (!result.met) {
    updateVisitor();
    animate($('visitor-bunny'), 'hop');
    $('meadow-message').textContent = meadowMessage();
    return;
  }

  animate($('met-count'), 'bump');
  if (result.fieldComplete === null) {
    renderField({ arrivedSlot: result.met.slot, freshVisitor: true });
    $('meadow-message').textContent =
      `You made friends with ${visitor.name}! ${state.met} of ${FIELD_SIZE} bunnies met in ${fieldName(state.field)}.`;
    $('feed-button').focus();
    return;
  }

  // The 25th friend: show the full field, then Bun Bun travels on.
  traveling = true;
  viewField = result.fieldComplete;
  renderField({ arrivedSlot: result.met.slot });
  $('visitor-panel').innerHTML = `
    <div class="visitor-away">
      <div class="bunny guide-bunny hop">${drawBunny(BUN_BUN, 'happy')}</div>
      <p>All ${FIELD_SIZE} bunnies are your friends!</p>
    </div>`;
  $('meadow-message').textContent = `You made friends with ${visitor.name}, the last bunny in ${fieldName(viewField)}!`;
  setTimeout(() => playTravel(result.fieldComplete, arriveInNewField), reducedMotion() ? 0 : CELEBRATE_MS);
}

function arriveInNewField() {
  traveling = false;
  viewField = state.field;
  renderField({ freshVisitor: true });
  $('meadow-message').textContent =
    `Welcome to ${fieldName(state.field)}! ${currentVisitor().name} is peeking out to say hello.`;
  $('feed-button').focus();
}

function onMeadowClick(event) {
  if (event.target.closest('#feed-button')) {
    feed();
    return;
  }
  if (event.target.closest('#go-current')) {
    showField(state.field);
    return;
  }
  const friend = event.target.closest('.field-bunny');
  if (friend) {
    const bunny = fieldBunnies(viewField)[Number(friend.dataset.slot)];
    $('meadow-message').textContent = `${bunny.name} ${pick(GREETINGS)}`;
    animate(friend, 'hop');
  }
}

// ---------- Travel to the next field ----------

function playTravel(completedField, done) {
  const next = completedField + 1;
  const nextName = fieldName(next);
  const theme = fieldTheme(next);
  const scene = $('travel-scene');
  const button = $('travel-done');

  $('travel-title').textContent = `You met all ${FIELD_SIZE} bunnies in ${fieldName(completedField)}!`;
  $('travel-math').textContent =
    `${plural(next, 'field')} × ${FIELD_SIZE} bunnies = ${next * FIELD_SIZE} bunnies met`;
  $('travel-message').textContent = 'Bun Bun is hopping off to find more friends...';
  $('travel-bunny').innerHTML = drawBunny(BUN_BUN, 'happy');
  $('travel-sign-text').textContent = nextName;
  scene.style.setProperty('--hill-far', theme.top);
  scene.style.setProperty('--hill-near', theme.bottom);
  scene.classList.remove('arrived');
  scene.classList.add('moving');
  button.hidden = true;
  $('travel').hidden = false;
  $('travel-card').focus();

  setTimeout(() => {
    scene.classList.remove('moving');
    scene.classList.add('arrived');
    $('travel-message').textContent =
      `Bun Bun made it to ${nextName}! ${FIELD_SIZE} new bunnies are waiting to meet you.`;
    button.textContent = `Explore ${nextName}`;
    button.hidden = false;
    button.focus();
  }, reducedMotion() ? 0 : TRAVEL_MS);

  button.onclick = () => {
    $('travel').hidden = true;
    done();
  };
}

function renderModePicker() {
  $('mode-picker').innerHTML = MODES.map((mode) => `
    <button class="mode-card" data-mode="${mode.id}">
      <span class="mode-icon" aria-hidden="true">${mode.icon()}</span>
      <span class="mode-title">${mode.title}</span>
      <span class="mode-blurb">${mode.blurb}</span>
    </button>`).join('');
}

function onPickMode(event) {
  const card = event.target.closest('.mode-card');
  if (card && !traveling) startRound(MODES.find((mode) => mode.id === card.dataset.mode));
}

// ---------- Number pad (touch screens) ----------
//
// Touch devices get an on-screen number pad instead of the system keyboard,
// which would cover half the game. Add ?numpad to the address to try it on a computer.

const USE_NUMPAD = window.matchMedia('(pointer: coarse)').matches
  || new URLSearchParams(window.location.search).has('numpad');
let activeInput = null; // the answer box the pad types into

function editableInputs() {
  return [...$('problem').querySelectorAll('input:not(:disabled):not([readonly])')];
}

function isEditable(input) {
  return Boolean(input) && $('problem').contains(input) && !input.disabled && !input.readOnly;
}

function setActiveInput(input) {
  activeInput?.classList.remove('active');
  activeInput = input;
  input?.classList.add('active');
  updateNumpad();
}

// The pad is only live while there's a box to type into.
function updateNumpad() {
  if (!USE_NUMPAD) return;
  const live = editableInputs().length > 0;
  for (const key of $('numpad').querySelectorAll('button')) key.disabled = !live;
  if (!live) activeInput?.classList.remove('active');
}

function onNumpad(event) {
  const key = event.target.closest('button')?.dataset.key;
  if (!key) return;
  const boxes = editableInputs();
  const input = isEditable(activeInput) ? activeInput : boxes.find((box) => box.value === '') ?? boxes[0];
  if (!input) return;
  if (key === 'next') {
    setActiveInput(boxes[(boxes.indexOf(input) + 1) % boxes.length]);
    return;
  }
  setActiveInput(input);
  if (key === 'back') {
    input.value = input.value.slice(0, -1);
  } else {
    // Like typing over a selected answer: the first digit into a wrong box starts fresh.
    if (input.classList.contains('wrong')) input.value = '';
    if (input.value.length < input.maxLength) input.value += key;
  }
  // Modes listen for typing (e.g. the step-2 mirror boxes), so announce the change.
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// ---------- Practice round ----------
//
// The engine is shared by every mode; see js/modes/facts.js for the mode shape.

function currentProblem() {
  return round.problems[round.index];
}

// Bun Bun plus a few friends from the current field take turns asking questions.
function roundHelpers() {
  const friends = fieldBunnies(state.field).slice(0, state.met);
  return [BUN_BUN, ...shuffle(friends).slice(0, ROUND_LENGTH - 1)];
}

function helperBunny() {
  return round.helpers[round.index % round.helpers.length];
}

function setHelper(mood) {
  $('helper-bunny').innerHTML = drawBunny(helperBunny(), mood);
  $('helper-name').textContent = helperBunny().name;
}

function say(text) {
  $('speech').textContent = text;
}

function focusFirst(el) {
  el.querySelector('input:not(:disabled), button:not(:disabled)')?.focus();
}

function startRound(mode) {
  round = {
    mode,
    problems: mode.makeRound(ROUND_LENGTH),
    helpers: roundHelpers(),
    index: 0,
    misses: 0,
    answered: false,
    carrotsEarned: 0,
    firstTry: 0,
    token: null,
  };
  renderCounters();
  showScreen('play');
  showProblem();
}

function showProblem() {
  const { mode } = round;
  const problem = currentProblem();
  const el = $('problem');
  const token = {};
  round.token = token;
  round.misses = 0;
  round.tries = []; // wrong answers on this problem, for the grown-up page
  round.startedAt = Date.now();
  round.answered = false;

  $('round-progress').textContent = `${mode.title} · Question ${round.index + 1} of ${round.problems.length}`;
  activeInput = null;
  el.innerHTML = mode.render(problem);
  const check = $('check-button');
  check.textContent = 'Check';
  check.hidden = Boolean(problem.choices);
  setHelper('calm');
  say(mode.prompt(problem));

  // Mode callbacks can fire after an animation; ignore them once the problem is gone.
  const isCurrent = () => round?.token === token;
  mode.mount?.(el, problem, {
    say: (text) => isCurrent() && say(text),
    // Modes show Check when they reveal answer boxes, so wake the number pad too.
    setCheckVisible: (visible) => {
      if (!isCurrent()) return;
      check.hidden = !visible;
      updateNumpad();
    },
  });
  focusFirst(el);
  updateNumpad();
}

function onAnswer(event) {
  event.preventDefault();
  if (!round) return;
  if (round.answered) {
    nextProblem();
    return;
  }

  const el = $('problem');
  const problem = currentProblem();
  const submitter = event.submitter;
  const inputs = [...el.querySelectorAll('input:not(:disabled)')];
  const blank = inputs.find((input) => input.value.trim() === '');
  if (blank) {
    say(inputs.length > 1 ? 'Fill in every box first!' : 'Type a number in the box first!');
    blank.focus();
    return;
  }

  const answer = Object.fromEntries(inputs.map((input) => [input.name, input.value]));
  if (submitter?.classList.contains('choice')) answer.choice = submitter.value;
  else if (problem.choices || $('check-button').hidden) return;

  const result = round.mode.check(problem, answer);
  if (result.correct) {
    onCorrect(el, problem, result, submitter);
  } else {
    round.tries.push(submitter?.classList.contains('choice') ? submitter.textContent : Object.values(answer).join(', '));
    onWrong(el, problem, result, submitter);
  }
}

// Adds a finished problem to the practice history. The history is extra;
// if anything goes wrong here the game carries on without it.
function recordForGrownups(problem, result) {
  const { mode } = round;
  try {
    recordProblem(stats, {
      mode: mode.id,
      text: mode.describe(problem),
      facts: mode.facts(problem),
      misses: round.misses,
      tries: round.tries,
      bonus: result.bonus ?? 0,
      ms: Date.now() - round.startedAt,
    });
    saveStats(stats, storage);
  } catch (error) {
    console.warn('Could not record practice history', error);
  }
}

function onCorrect(el, problem, result, submitter) {
  const earned = (round.misses === 0 ? CARROTS_FIRST_TRY : CARROTS_WITH_HELP) + (result.bonus ?? 0);
  round.answered = true;
  round.carrotsEarned += earned;
  if (round.misses === 0) round.firstTry += 1;
  earnCarrots(state, earned);
  saveState(state, storage);
  recordForGrownups(problem, result);

  for (const input of el.querySelectorAll('input')) {
    input.readOnly = true;
    input.classList.remove('wrong');
    input.classList.add('correct');
  }
  if (submitter?.classList.contains('choice')) submitter.classList.add('correct');
  for (const choice of el.querySelectorAll('.choice')) choice.disabled = true;

  const check = $('check-button');
  check.hidden = false;
  check.textContent = round.index + 1 < round.problems.length ? 'Next →' : 'Finish →';
  // Typed answers keep focus in the box so Enter moves on; choice cards hand focus to Next.
  if (!el.querySelector('input')) check.focus();

  round.mode.celebrate?.(el, problem, result);
  updateNumpad();
  say(`${pick(PRAISE)} ${round.mode.solved(problem, result)} You earned ${plural(earned, 'carrot')}!`);
  setHelper('happy');
  animate($('helper-bunny'), 'hop');
  celebrateCarrots(earned);
}

function onWrong(el, problem, result, submitter) {
  round.misses += 1;
  for (const input of el.querySelectorAll('input.wrong')) input.classList.remove('wrong');
  for (const name of result.wrong) {
    if (name === 'choice') {
      submitter.classList.add('wrong');
      submitter.disabled = true;
      continue;
    }
    const input = el.querySelector(`input[name="${name}"]`);
    input.classList.add('wrong');
    animate(input, 'shake');
  }

  say(`Not quite. ${round.mode.hint(problem, round.misses, result)}`);
  round.mode.help?.(el, problem, round.misses);
  animate($('helper-bunny'), 'think');

  const firstWrong = el.querySelector('input.wrong');
  if (firstWrong) {
    firstWrong.focus();
    firstWrong.select();
  } else {
    focusFirst(el);
  }
}

function nextProblem() {
  round.index += 1;
  if (round.index < round.problems.length) {
    showProblem();
  } else {
    endRound();
  }
}

function endRound() {
  $('round-end-bunny').innerHTML = drawBunny(BUN_BUN, 'happy');
  $('round-summary').textContent =
    `You earned ${plural(round.carrotsEarned, 'carrot')} and got ${round.firstTry} of ${round.problems.length} on the first try!`;
  showScreen('round-end');
  animate($('round-end-bunny'), 'hop');
  // Short delay so the Enter that finished the round doesn't also press this button.
  setTimeout(() => $('back-to-meadow').focus(), 300);
}

// ---------- Setup ----------

function resetProgress() {
  if (!window.confirm('Start over? This clears all carrots and bunnies you have met.')) return;
  clearState(storage);
  state = loadState(null);
  showMeadow();
}

document.querySelector('.carrot-icon').innerHTML = carrotSVG();
document.querySelector('.met-icon').innerHTML = miniBunnySVG(BUN_BUN.fur);
$('meadow').addEventListener('click', onMeadowClick);
$('prev-field').addEventListener('click', () => showField(Math.max(0, viewField - 1)));
$('next-field').addEventListener('click', () => showField(Math.min(state.field, viewField + 1)));
$('mode-picker').addEventListener('click', onPickMode);
$('answer-form').addEventListener('submit', onAnswer);
$('problem').addEventListener('input', (event) => event.target.classList.remove('wrong'));
$('problem').addEventListener('focusin', (event) => {
  if (USE_NUMPAD && event.target.matches('input')) setActiveInput(event.target);
});
$('numpad').addEventListener('click', onNumpad);
$('numpad').hidden = !USE_NUMPAD;
useNumpad(USE_NUMPAD);
// iOS Safari only shows :active press styles when a touchstart listener exists.
document.addEventListener('touchstart', () => {}, { passive: true });
$('quit-round').addEventListener('click', showMeadow);
$('back-to-meadow').addEventListener('click', showMeadow);
$('reset-progress').addEventListener('click', resetProgress);

renderModePicker();
showMeadow();
