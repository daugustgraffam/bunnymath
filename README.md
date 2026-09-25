# Bunny Math

A lightweight multiplication practice game for third graders. Correct answers earn
carrots; carrots win over shy bunnies. Each field holds 25 bunnies in 5 rows of 5;
once you've met them all, Bun Bun travels on to a new field. The bunnies-met counter
counts in multiples of 25 (`2 × 25 + 7 = 57`).

**Play it:** https://daugustgraffam.github.io/bunnymath/

No build step and no dependencies — plain HTML, CSS and JavaScript modules.

The live site deploys from `main` via GitHub Pages; every push updates it.

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

Every mode gives a 3-step hint ladder: a nudge, then a visual (skip-count totals or
a flip), then the answer. First-try answers earn 2 carrots; answers after a hint earn 1.

## Layout

- `js/main.js` — screens, meadow, and the round engine shared by all modes
- `js/modes/` — one file per game mode; `facts.js` documents the mode shape
- `js/problems.js` — shared problem helpers and Quick Facts hints (pure, tested)
- `js/visuals.js` — markup for answer boxes, burrows and carrot patches
- `js/world.js` — fields and their 25 bunnies, generated from the field number (tested)
- `js/rewards.js` — carrots, meeting bunnies, saved progress in `localStorage` (tested)
- `js/bunnies.js` — SVG art for bunnies, accessories, carrots and hearts
