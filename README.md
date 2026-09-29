# Bunny Math

A lightweight multiplication practice game for third graders. Correct answers earn
carrots; carrots win over shy bunnies. Each field holds 25 bunnies in 5 rows of 5;
once you've met them all, Bun Bun travels on to a new field. The bunnies-met counter
counts in multiples of 25 (`2 × 25 + 7 = 57`).

**Play it:** https://daugustgraffam.github.io/bunnymath/

No build step and no dependencies — plain HTML, CSS and JavaScript modules.

The live site deploys from `main` via GitHub Pages; every push updates it. A small
service worker (`sw.js`) makes every load check for the newest files first, so a
browser never mixes an old cached page with new code after an update, and the game
still opens offline with the last version it loaded.

## For grown-ups

The **For grown-ups** link at the bottom of the game (or `grownups.html`) shows
what's been practiced on that device: a 0–10 times-table grid marking each fact
mastered / learning / needs practice (counting practice from every game), the
facts that needed help recently, per-game and per-day totals, and the last 25
answers with any wrong tries. It's read-only; the history lives in its own
storage slot, apart from the game save.

## Tablets

Touch screens get an on-screen number pad instead of the system keyboard (add
`?numpad` to the address to try it on a computer). On an iPad or iPhone, use
Share → **Add to Home Screen**: it opens full-screen like an app, and Safari won't
clear saved progress after a week away, which it can do for sites in a browser tab.

## Run locally

Browsers block JavaScript modules opened straight from a `file://` path, so serve the
folder with any static server:

```bash
npm start
```

Then open http://localhost:8321.

## Test

```bash
npm test
```

## Game modes

- **Quick Facts** — plain `a × b = ?` practice, 0–10
- **Burrow Groups** — read a picture of equal groups (burrows of bunnies) or an
  array (a carrot patch) and write it as `groups × each = total`
- **Flip the Patch** — the commutative property: flip a carrot patch and see that
  `a × b = b × a`; also missing-number and "which card matches?" problems
- **Hutch Stacking** — the associative property: `a × b × c` drawn as hutches of
  shelves of bunnies. Pick which pair to multiply first, `(a × b) × c` or
  `a × (b × c)`, then solve in two steps; picking the grouping that keeps step 1
  at 10 or less earns a bonus carrot. Also "move the parentheses" problems
- **Fence It** — the distributive property: drag (or click, or arrow-key) a fence
  across a big carrot patch like `7 × 8` to split it into `7 × 5 + 7 × 3`, solve
  both sides and add. A side of 5 earns a bonus carrot. Also fill-ins like
  `6 × 7 = 6 × 5 + 6 × ▢`
- **Carrot Crates** — multiplying by multiples of 10: crates hold 10 carrots, so
  `4 × 30` is `4 × 3 tens = 12 tens = 120`

- **Practice Test** — 10 questions in the style of a third-grade assessment on the
  multiplication properties: which two facts find an array's total, Yes/No "is
  the Distributive Property used correctly?", pick-all-that-work fact splits,
  rebuilding a big array from two smaller ones, three-factor and two-part word
  problems, and fill-in equations (doubles, combining, a 10s fact as two 5s).
  Original questions with new numbers every time, each with a picture of how the
  math is built in the story's own words (beds holding rows of carrots, two parts
  joined by +, a whole patch beside its two pieces). Every question has an "Add or
  multiply?" rules card that opens after a miss, when story clue words also light
  up ("each" → ×, two same-kind amounts joined by "and" → +). Two question types
  practice just that choice: "which expression matches the story?" and "after the
  ( ), what's next?" (the sign outside the parentheses decides)

### Division (beginning, no remainders)

A **× Multiplication / ÷ Division** switch on the meadow picks which games show;
carrots, fields and bunnies met are shared.

- **Share the Carrots** — equal sharing: deal carrots one at a time to each bunny
  until the pile is gone, then count one plate (12 ÷ 3 = 4 each)
- **Burrow Homes** — equal groups: fill burrows with 4 bunnies each until everyone
  has a home, then count the burrows (12 ÷ 4 = 3 burrows)
- **Hop Back** — repeated subtraction: hop back by 4 from 12 to 0 on a number line
  and count the hops
- **Fact Families** — division undoes multiplication: a fact triangle and array;
  `3 × ▢ = 12, so 12 ÷ 3 = ▢`, fill in all four family facts, pick the helper fact
- **Quick ÷ Facts** — division facts within 100, hints that "think multiplication"
  (`8 × ▢ = 56`), plus the ÷ 1, 0 ÷ n and n ÷ n rules

The grown-up page has a separate division facts grid (12 ÷ 3 and 12 ÷ 4 are
different facts to learn).

Every mode gives a 3-step hint ladder: a nudge, then a visual (skip-count totals or
a flip), then the answer. First-try answers earn 2 carrots; answers after a hint earn 1.

## Layout

- `js/main.js` — screens, meadow, and the round engine shared by all modes
- `js/modes/` — one file per game mode; `facts.js` documents the mode shape
- `js/problems.js` — shared problem helpers and Quick Facts hints (pure, tested)
- `js/visuals.js` — markup for answer boxes, burrows and carrot patches
- `js/stats.js` — practice history for the grown-up page (tested)
- `js/grownups.js` — the grown-up page
- `js/world.js` — fields and their 25 bunnies, generated from the field number (tested)
- `js/rewards.js` — carrots, meeting bunnies, saved progress in `localStorage` (tested)
- `js/bunnies.js` — SVG art for bunnies, accessories, carrots and hearts
