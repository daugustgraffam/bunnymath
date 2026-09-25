import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCESSORIES, ACCESSORY_COLORS, COLORED_ACCESSORIES, bunnySVG, shade } from '../js/bunnies.js';
import { BUN_BUN, FIELD_SIZE, generateField, fieldName } from '../js/world.js';

const fieldBunnies = (field) => generateField(field).bunnies;

test('Bun Bun is light brown with her blanket', () => {
  assert.equal(BUN_BUN.accessory, 'blanket');
  assert.ok(bunnySVG(BUN_BUN).includes(ACCESSORIES.blanket.under));
});

test('each field has 25 differently named bunnies', () => {
  for (let field = 0; field < 30; field++) {
    const bunnies = fieldBunnies(field);
    assert.equal(bunnies.length, FIELD_SIZE);
    assert.equal(new Set(bunnies.map((b) => b.name)).size, FIELD_SIZE, `field ${field}`);
  }
});

test('Bun Bun stays unique: no one else is named Bun Bun or wears her blanket', () => {
  for (let field = 0; field < 30; field++) {
    for (const bunny of fieldBunnies(field)) {
      assert.notEqual(bunny.name, 'Bun Bun');
      assert.notEqual(bunny.accessory, 'blanket');
      if (bunny.accessory) assert.ok(ACCESSORIES[bunny.accessory], bunny.accessory);
    }
  }
});

test('field bunnies mix looks: some accessories, several fur colors', () => {
  const bunnies = fieldBunnies(0);
  const withAccessory = bunnies.filter((b) => b.accessory).length;
  assert.ok(withAccessory > 5 && withAccessory < 22, `${withAccessory} with accessories`);
  assert.ok(new Set(bunnies.map((b) => b.fur)).size >= 5);
});

test('fields have distinct names for a long while', () => {
  const names = Array.from({ length: 24 }, (_, i) => fieldName(i));
  assert.equal(new Set(names).size, 24);
  assert.equal(fieldName(0), 'Clover Meadow');
});

test('scarves, bow ties and ear bows come in colors', () => {
  assert.deepEqual([...COLORED_ACCESSORIES].sort(), ['bowtie', 'earBow', 'scarf']);
  const seen = new Set();
  for (let field = 0; field < 30; field++) {
    for (const bunny of fieldBunnies(field)) {
      if (COLORED_ACCESSORIES.includes(bunny.accessory)) {
        assert.ok(ACCESSORY_COLORS.includes(bunny.accessoryColor), `${bunny.name}: ${bunny.accessoryColor}`);
        seen.add(bunny.accessoryColor);
      } else {
        assert.equal(bunny.accessoryColor, undefined, `${bunny.name} has a color but no colored accessory`);
      }
    }
  }
  assert.equal(seen.size, ACCESSORY_COLORS.length, 'every color shows up');
});

test('accessory color is drawn, with a darker knot; saves without a color keep the original', () => {
  const blue = bunnySVG({ accessory: 'bowtie', accessoryColor: '#4a90d9' });
  assert.ok(blue.includes('fill="#4a90d9"') && blue.includes(`fill="${shade('#4a90d9')}"`));
  assert.ok(bunnySVG({ accessory: 'bowtie' }).includes('fill="#3aa6a0"'));
  assert.equal(shade('#ffffff', 0.5), '#808080');
});

test('a big name pool keeps fields from sharing many names', () => {
  let shared = 0;
  for (let field = 0; field < 50; field++) {
    const names = new Set(fieldBunnies(field).map((b) => b.name));
    shared += fieldBunnies(field + 1).filter((b) => names.has(b.name)).length;
  }
  assert.ok(shared / 50 < 5, `neighboring fields share ${shared / 50} names on average`);
});
