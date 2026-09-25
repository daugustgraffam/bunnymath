// The world: an endless row of fields, 25 bunnies in each. Bun Bun is the one
// bunny who never changes.
//
// A field is generated once, when Bun Bun first arrives, and the result is saved
// (see rewards.js). After that the saved copy is the truth, so these lists can be
// edited freely: changes only affect fields nobody has reached yet.

import { ACCESSORIES, ACCESSORY_COLORS, COLORED_ACCESSORIES } from './bunnies.js';
import { shuffle, pick } from './problems.js';

export const FIELD_SIZE = 25;
export const FIELD_COLUMNS = 5;

export const BUN_BUN = { name: 'Bun Bun', fur: '#d6ac82', accessory: 'blanket' };

const NAMES = [
  'Clover', 'Biscuit', 'Pepper', 'Hazel', 'Juniper', 'Nutmeg', 'Daisy', 'Mochi', 'Pickle', 'Waffles',
  'Maple', 'Pip', 'Cocoa', 'Snowball', 'Buttons', 'Poppy', 'Willow', 'Peanut', 'Toffee', 'Honey',
  'Bean', 'Clementine', 'Marshmallow', 'Cinnamon', 'Ginger', 'Pumpkin', 'Sprout', 'Pudding', 'Muffin', 'Noodle',
  'Pebble', 'Olive', 'Basil', 'Sage', 'Fig', 'Dumpling', 'Sesame', 'Jellybean', 'Lulu', 'Rosie',
  'Benny', 'Milo', 'Luna', 'Ziggy', 'Penny', 'Dot', 'Scout', 'Bramble', 'Acorn', 'Marigold',
  'Truffle', 'Nibbles', 'Snickerdoodle', 'Bubbles', 'Wiggles', 'Tulip', 'Pancake', 'Cupcake', 'Cookie', 'Brownie',
  'Butterscotch', 'Caramel', 'Custard', 'Gumdrop', 'Macaron', 'Meringue', 'Pretzel', 'Popcorn', 'Scone', 'Sprinkles',
  'Taffy', 'Pistachio', 'Cashew', 'Almond', 'Walnut', 'Chestnut', 'Apricot', 'Blueberry', 'Cherry', 'Cranberry',
  'Kiwi', 'Mango', 'Peaches', 'Plum', 'Raisin', 'Radish', 'Turnip', 'Parsnip', 'Lettuce', 'Celery',
  'Pea', 'Nugget', 'Crumpet', 'Bagel', 'Churro', 'Gnocchi', 'Ravioli', 'Paprika', 'Saffron', 'Vanilla',
  'Mocha', 'Fudge', 'Marzipan', 'Praline', 'Sorbet', 'Sundae', 'Aster', 'Bluebell', 'Buttercup', 'Dandelion',
  'Fern', 'Holly', 'Iris', 'Ivy', 'Lilac', 'Lily', 'Magnolia', 'Moss', 'Pansy', 'Petunia',
  'Primrose', 'Rosemary', 'Snapdragon', 'Thistle', 'Thyme', 'Violet', 'Wren', 'Robin', 'Sparrow', 'Finch',
  'Birch', 'Cedar', 'Aspen', 'Rowan', 'Sunny', 'Breezy', 'Frost', 'Snowflake', 'Puddle', 'Brook',
  'Pinecone', 'Twig', 'Sprig', 'Blossom', 'Petal', 'Comet', 'Moonbeam', 'Stella', 'Nova', 'Dottie',
  'Freckles', 'Hopscotch', 'Binky', 'Chester', 'Cooper', 'Dexter', 'Duncan', 'Echo', 'Felix', 'Gus',
  'Harvey', 'Henry', 'Hugo', 'Jasper', 'Kit', 'Kiki', 'Lola', 'Mabel', 'Maisie', 'Mimi',
  'Oscar', 'Otis', 'Ozzie', 'Percy', 'Pixie', 'Pogo', 'Poppet', 'Quincy', 'Ruby', 'Rufus',
  'Sadie', 'Skipper', 'Tilly', 'Toby', 'Trixie', 'Tucker', 'Zoey', 'Doodle', 'Fizz', 'Giggles',
  'Jingles', 'Squeaky', 'Twinkle', 'Whiskers', 'Wobble', 'Zippy', 'Dash', 'Rocket', 'Scooter', 'Bingo',
  'Domino', 'Pom-Pom', 'Tiptoe', 'Cuddles', 'Snuggles',
];

const FURS = [
  '#f6f1ea', '#efc57e', '#9a8f88', '#b97d50', '#d8d0e8', '#a86f4c',
  '#f3dcbc', '#ffffff', '#c9c1b8', '#7d6f67', '#e8b89a', '#e9d8b4',
];

// Bun Bun's blanket is hers alone.
const SHARED_ACCESSORIES = Object.keys(ACCESSORIES).filter((key) => key !== 'blanket');
const ACCESSORY_CHANCE = 0.55;

const FIELD_PREFIXES = ['Clover', 'Sunflower', 'Mossy', 'Daisy', 'Buttercup', 'Willow', 'Maple', 'Bluebell', 'Honey', 'Thistle', 'Poppy', 'Fern'];
const FIELD_SUFFIXES = ['Meadow', 'Hill', 'Glen', 'Dell', 'Valley', 'Hollow', 'Field', 'Patch'];

const THEMES = [
  { top: '#9bd672', bottom: '#74b94d', flower: '#fff6a8' },
  { top: '#b5d86a', bottom: '#8fb845', flower: '#ffd166' },
  { top: '#8ccf8a', bottom: '#5fa865', flower: '#f7a1b5' },
  { top: '#a6dca0', bottom: '#6fbf8a', flower: '#c5b3f0' },
  { top: '#c2d97a', bottom: '#9cb452', flower: '#ff9f68' },
  { top: '#93d3b0', bottom: '#5eaf8c', flower: '#ffffff' },
];

// Small seeded random generator (mulberry32).
export function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// 24 distinct names before any repeat.
export function fieldName(field) {
  return `${FIELD_PREFIXES[field % FIELD_PREFIXES.length]} ${FIELD_SUFFIXES[(field * 3) % FIELD_SUFFIXES.length]}`;
}

export function fieldTheme(field) {
  return { ...THEMES[field % THEMES.length] };
}

// A new field: its name, colors, and the 25 bunnies in the order you meet them.
// Seeded by the field number so tests (and the v2 save migration) are repeatable.
export function generateField(field) {
  const rand = seededRandom(field * 7919 + 17);
  const names = shuffle(NAMES, rand).slice(0, FIELD_SIZE);
  const bunnies = names.map((name) => {
    const bunny = { name, fur: pick(FURS, rand) };
    if (rand() < ACCESSORY_CHANCE) {
      bunny.accessory = pick(SHARED_ACCESSORIES, rand);
      if (COLORED_ACCESSORIES.includes(bunny.accessory)) bunny.accessoryColor = pick(ACCESSORY_COLORS, rand);
    }
    bunny.mood = rand() < 0.35 ? 'happy' : 'calm';
    return bunny;
  });
  return { name: fieldName(field), theme: fieldTheme(field), bunnies };
}
