// SVG art: bunnies, carrots, hearts. Returns markup strings.

const OUTLINE = '#5b4636';
const EAR_PINK = '#f6b3c3';
const CHEEK = '#f7a1b5';
const NOSE = '#e57f97';

function flower(x, y, color) {
  const petals = [0, 72, 144, 216, 288].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return `<circle cx="${(x + 3.2 * Math.cos(rad)).toFixed(1)}" cy="${(y + 3.2 * Math.sin(rad)).toFixed(1)}" r="2.8" fill="${color}"/>`;
  });
  return `${petals.join('')}<circle cx="${x}" cy="${y}" r="2" fill="#ffd166"/>`;
}

// Colors a scarf, bow tie or ear bow can come in.
export const ACCESSORY_COLORS = [
  '#e05a5a', '#f2994a', '#f2d24c', '#5fae5a', '#3aa6a0', '#4a90d9', '#9b6fd1', '#ff7eb6',
];

// A darker version of a #rrggbb color, for knots and shading.
export function shade(hex, amount = 0.2) {
  const channels = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount)));
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// Each accessory draws an `under` layer (between body and head, e.g. a blanket
// the paws hold) and/or an `over` layer (on top of the face, e.g. glasses).
// Accessories with a `defaultColor` can be recolored: their layers are functions
// of the color, and bunnies saved without a color get the default.
export const ACCESSORIES = {
  blanket: {
    // White blanket with a green border: green panels with a white inset on top.
    under: `<path d="M40 86 C24 94 18 122 24 140 Q34 146 46 140 C48 124 50 104 52 92 Z M80 86 C96 94 102 122 96 140 Q86 146 74 140 C72 124 70 104 68 92 Z" fill="#5fae5a" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M42 91 C29 98 24 122 29 135 Q35 139 41 135 C43 122 45 104 47 95 Z M78 91 C91 98 96 122 91 135 Q85 139 79 135 C77 122 75 104 73 95 Z" fill="#fdfcf7"/>
    <path d="M33 106 Q36 118 33 128 M87 106 Q84 118 87 128" fill="none" stroke="#e3ddd0" stroke-width="1.8" stroke-linecap="round"/>`,
  },
  bowtie: {
    defaultColor: '#3aa6a0',
    over: (color) => `<path d="M60 101 L47 94 L47 108 Z M60 101 L73 94 L73 108 Z" fill="${color}" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="60" cy="101" r="3.5" fill="${shade(color)}" stroke="${OUTLINE}" stroke-width="1.8"/>`,
  },
  glasses: {
    over: `<g fill="none" stroke="#3d3d6b" stroke-width="2.2" stroke-linecap="round">
      <circle cx="49" cy="65" r="8.5" fill="#fff" fill-opacity=".2"/><circle cx="71" cy="65" r="8.5" fill="#fff" fill-opacity=".2"/>
      <path d="M57.5 64 q2.5 -3 5 0 M40.5 63 l-8 -3 M79.5 63 l8 -3"/>
    </g>`,
  },
  flowerCrown: {
    over: `<path d="M35 53 Q60 30 85 53" fill="none" stroke="#6aa84f" stroke-width="2.5" stroke-linecap="round"/>
      ${flower(38, 50, '#f48fb1')}${flower(48, 42, '#fff176')}${flower(60, 39, '#b39ddb')}${flower(72, 42, '#fff176')}${flower(82, 50, '#f48fb1')}`,
  },
  partyHat: {
    over: `<g transform="rotate(8 60 40)">
      <path d="M48 42 L60 12 L72 42 Z" fill="#7cc6fe" stroke="${OUTLINE}" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="56" cy="34" r="2" fill="#ff7eb6"/><circle cx="64" cy="28" r="2" fill="#ffd166"/><circle cx="61" cy="38" r="2" fill="#ffd166"/><circle cx="59" cy="22" r="1.8" fill="#ff7eb6"/>
      <circle cx="60" cy="12" r="4.5" fill="#ffd166" stroke="${OUTLINE}" stroke-width="2"/>
    </g>`,
  },
  earBow: {
    defaultColor: '#ff7eb6',
    over: (color) => `<path d="M46 43 L36 37 L36 50 Z M46 43 L56 37 L56 50 Z" fill="${color}" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="46" cy="43" r="3" fill="${shade(color)}" stroke="${OUTLINE}" stroke-width="1.6"/>`,
  },
  scarf: {
    defaultColor: '#e05a5a',
    over: (color) => `<g stroke="${OUTLINE}" stroke-width="2.2" stroke-linejoin="round">
      <path d="M66 100 L74 128 L64 130 L58 103 Z" fill="${color}"/>
      <path d="M34 92 Q60 106 86 92 L86 102 Q60 116 34 102 Z" fill="${color}"/>
    </g>
    <path d="M35 97 Q60 111 85 97 M60.5 112 L63 122 M65 117 L67.5 126" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>`,
  },
};

export const COLORED_ACCESSORIES = Object.keys(ACCESSORIES).filter((key) => ACCESSORIES[key].defaultColor);

// The markup for one accessory layer ('under' or 'over'), in the given color.
export function accessoryLayer(accessory, layer, color) {
  const art = ACCESSORIES[accessory];
  const markup = art?.[layer] ?? '';
  return typeof markup === 'function' ? markup(color ?? art.defaultColor) : markup;
}

// mood: 'calm' (open eyes) or 'happy' (closed, smiling eyes)
// accessory: a key of ACCESSORIES, or undefined for none
// accessoryColor: for recolorable accessories; defaults to the accessory's own color
export function bunnySVG({ fur = '#f6f1ea', mood = 'calm', label = 'A bunny', accessory, accessoryColor } = {}) {
  const under = accessoryLayer(accessory, 'under', accessoryColor);
  const over = accessoryLayer(accessory, 'over', accessoryColor);
  const eyes =
    mood === 'happy'
      ? `<path d="M44 67 q5 -7 10 0 M66 67 q5 -7 10 0" fill="none" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>`
      : `<circle cx="49" cy="65" r="4.5" fill="${OUTLINE}"/><circle cx="71" cy="65" r="4.5" fill="${OUTLINE}"/>
         <circle cx="50.5" cy="63.5" r="1.5" fill="#fff"/><circle cx="72.5" cy="63.5" r="1.5" fill="#fff"/>`;
  const mouth =
    mood === 'happy'
      ? `<path d="M53 80 q7 9 14 0 z" fill="${NOSE}" stroke="${OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/>`
      : `<path d="M60 77.5 v2.5 M54 80 q3 3.5 6 0 q3 3.5 6 0" fill="none" stroke="${OUTLINE}" stroke-width="1.8" stroke-linecap="round"/>`;

  return `<svg viewBox="0 0 120 150" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
  <g class="ears" stroke="${OUTLINE}" stroke-width="2.5">
    <ellipse cx="45" cy="30" rx="10" ry="26" fill="${fur}" transform="rotate(-12 45 50)"/>
    <ellipse cx="45" cy="33" rx="4.5" ry="17" fill="${EAR_PINK}" stroke="none" transform="rotate(-12 45 50)"/>
    <ellipse cx="75" cy="30" rx="10" ry="26" fill="${fur}" transform="rotate(12 75 50)"/>
    <ellipse cx="75" cy="33" rx="4.5" ry="17" fill="${EAR_PINK}" stroke="none" transform="rotate(12 75 50)"/>
  </g>
  <ellipse cx="60" cy="112" rx="34" ry="30" fill="${fur}" stroke="${OUTLINE}" stroke-width="2.5"/>
  <ellipse cx="60" cy="118" rx="20" ry="19" fill="#fff" fill-opacity=".45"/>
  ${under}
  <ellipse cx="42" cy="140" rx="13" ry="7" fill="${fur}" stroke="${OUTLINE}" stroke-width="2.5"/>
  <ellipse cx="78" cy="140" rx="13" ry="7" fill="${fur}" stroke="${OUTLINE}" stroke-width="2.5"/>
  <ellipse cx="50" cy="116" rx="6" ry="8" fill="${fur}" stroke="${OUTLINE}" stroke-width="2"/>
  <ellipse cx="70" cy="116" rx="6" ry="8" fill="${fur}" stroke="${OUTLINE}" stroke-width="2"/>
  <circle cx="60" cy="68" r="30" fill="${fur}" stroke="${OUTLINE}" stroke-width="2.5"/>
  <circle cx="42" cy="78" r="5" fill="${CHEEK}" fill-opacity=".55"/>
  <circle cx="78" cy="78" r="5" fill="${CHEEK}" fill-opacity=".55"/>
  ${eyes}
  <ellipse cx="60" cy="75" rx="3.5" ry="2.6" fill="${NOSE}"/>
  ${mouth}
  ${over}
</svg>`;
}

// A small bunny face for counting pictures.
export function miniBunnySVG(fur = '#f6f1ea') {
  return `<svg class="mini-bunny" viewBox="0 0 24 28" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <g stroke="${OUTLINE}" stroke-width="1.3">
    <ellipse cx="8.5" cy="8" rx="3" ry="7" fill="${fur}" transform="rotate(-10 8.5 12)"/>
    <ellipse cx="15.5" cy="8" rx="3" ry="7" fill="${fur}" transform="rotate(10 15.5 12)"/>
  </g>
  <ellipse cx="8.5" cy="8.5" rx="1.3" ry="4.5" fill="${EAR_PINK}" transform="rotate(-10 8.5 12)"/>
  <ellipse cx="15.5" cy="8.5" rx="1.3" ry="4.5" fill="${EAR_PINK}" transform="rotate(10 15.5 12)"/>
  <circle cx="12" cy="18.5" r="8" fill="${fur}" stroke="${OUTLINE}" stroke-width="1.3"/>
  <circle cx="9" cy="17.5" r="1.3" fill="${OUTLINE}"/><circle cx="15" cy="17.5" r="1.3" fill="${OUTLINE}"/>
  <ellipse cx="12" cy="20.5" rx="1.3" ry="1" fill="${NOSE}"/>
</svg>`;
}

// A leafy bush for shy visitors to hide behind.
export function bushSVG() {
  // One leafy outline with uneven bumps (no side-by-side round lobes), plus a
  // few leaf strokes, highlights and flowers.
  return `<svg class="bush" viewBox="0 0 140 60" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 62 L3 46 Q-1 35 11 33 Q12 22 25 23 Q29 11 42 15 Q49 5 60 11 Q67 3 78 9 Q88 4 93 15 Q105 12 108 23 Q121 20 124 32 Q138 33 137 46 L140 62 Z"
    fill="#5c9e3f" stroke="#3f7a2a" stroke-width="2.5" stroke-linejoin="round"/>
  <g fill="#7cc05a" opacity=".7">
    <ellipse cx="44" cy="20" rx="7" ry="3.5"/><ellipse cx="74" cy="14" rx="7" ry="3.5"/>
    <ellipse cx="104" cy="26" rx="6" ry="3"/><ellipse cx="20" cy="31" rx="5" ry="2.5"/>
  </g>
  <path d="M26 38 q4 -5 8 0 M55 27 q4 -5 8 0 M86 25 q4 -5 8 0 M112 39 q4 -5 8 0 M40 48 q4 -5 8 0 M72 44 q4 -5 8 0 M98 50 q4 -5 8 0"
    fill="none" stroke="#3f7a2a" stroke-width="2" stroke-linecap="round"/>
  <circle cx="36" cy="28" r="3" fill="#f7a1b5"/><circle cx="67" cy="20" r="3" fill="#fff6a8"/>
  <circle cx="118" cy="40" r="3" fill="#f7a1b5"/><circle cx="14" cy="44" r="3" fill="#fff6a8"/>
</svg>`;
}

// A crate of 10 carrots, labeled "10".
export function crateSVG() {
  return `<svg class="crate" viewBox="0 0 32 30" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 7 q-1 -5 -3 -6 M9 7 q1 -5 3 -6 M16 6 q-1 -5 -3 -6 M16 6 q1 -5 3 -6 M23 7 q-1 -5 -3 -6 M23 7 q1 -5 3 -6"
    fill="none" stroke="#4caf50" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="9" cy="10" rx="3.2" ry="3" fill="#f28c28"/><ellipse cx="16" cy="9" rx="3.2" ry="3" fill="#f28c28"/>
  <ellipse cx="23" cy="10" rx="3.2" ry="3" fill="#f28c28"/>
  <rect x="2" y="10" width="28" height="18" rx="2" fill="#c8955e" stroke="#6b4730" stroke-width="1.6"/>
  <path d="M2 16 H30 M2 22 H30" stroke="#a87844" stroke-width="1"/>
  <text x="16" y="23" font-size="10" font-weight="bold" text-anchor="middle" fill="#fff" stroke="#6b4730" stroke-width="0.5"
    font-family="Arial Rounded MT Bold, Trebuchet MS, sans-serif">10</text>
</svg>`;
}

export function carrotSVG() {
  return `<svg class="carrot" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 8 Q9 2 7 3 M12 8 Q12 1 13 1 M12 8 Q15 2 17 3" fill="none" stroke="#4caf50" stroke-width="2" stroke-linecap="round"/>
  <path d="M7 8 Q12 6 17 8 L12.5 22 Q12 23 11.5 22 Z" fill="#f28c28" stroke="#b85c12" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M9.5 12 h3 M11 16 h2" stroke="#b85c12" stroke-width="1" stroke-linecap="round"/>
</svg>`;
}

export function heartSVG(filled) {
  return `<svg class="heart ${filled ? 'filled' : ''}" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 21 C5 15 2 12 2 8 A5 5 0 0 1 12 6 A5 5 0 0 1 22 8 C22 12 19 15 12 21 Z"
    fill="${filled ? '#f06292' : 'none'}" stroke="#d14d7b" stroke-width="2" stroke-linejoin="round"/>
</svg>`;
}
