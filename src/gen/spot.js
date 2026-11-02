// Spot the wrong: den samme gangen, igjen og igjen. Er alt som før, går man videre gjennom døren i enden. Er noe
// feil, snur man og går tilbake gjennom døren bak seg. Åtte riktige på rad, så er man ute; én feil, og det
// begynner på nytt. Endringene kommer fra «Make it wrong» (gen/wrong.js), de tydelige først. Ren logikk.
import { TILE, LIGHT, createLevel, cloneLevel } from '../core/level.js';
import { autoLights } from '../core/ops.js';
import { DOOR } from '../core/doors.js';
import { placeObject } from '../core/objects.js';
import { yawFromDir } from '../core/spawn.js';
import { getTheme } from '../core/themes.js';
import { LOOKS } from '../core/looks.js';
import { randInt } from '../core/rng.js';
import { fillRect } from './util.js';
import { applyChange } from './wrong.js';

export const SPOT = { GOAL: 8, CHANCE: 0.6 }; // rett på rad for å komme ut; sjansen for at noe er feil
export const SPOT_THEMES = ['backrooms', 'office', 'hotel', 'school', 'ward', 'basement'];

const [W, H] = [36, 16];
const [Z0, Z1] = [6, 9]; // gangen
const DOOR_Z = 7;

const ITEMS = {
  backrooms: ['woodenchair', 'plasticchair', 'tv', 'clock', 'boombox', 'woodenchair'],
  office: ['moderndesk', 'officechair', 'whiteboard', 'pottedplant', 'clock', 'soda'],
  hotel: ['armchair', 'sofa', 'pottedplant', 'clock', 'yucca', 'tvbench'],
  school: ['schoolcabinet', 'whiteboard', 'plasticchair', 'clock', 'desk2', 'plasticchair'],
  ward: ['hospitalbed', 'waitingchairs', 'medicalcabinet', 'clock', 'medicaltrolley', 'pottedplant'],
  basement: ['sofa', 'armchair', 'tvbench', 'clock', 'hifi', 'pottedplant'],
};

// Fra det man ser med en gang til det man må lete etter. Lengre rekke gir vanskeligere endringer.
const TIERS = [
  ['lonePillar', 'objectGone', 'wrongLook', 'wrongTint', 'stairsNowhere', 'objectTwin', 'objectTipped'],
  ['lightOut', 'tilePatch', 'outOfPlace', 'facingWall', 'lightFlicker', 'objectGone', 'wallGap', 'doorRemoved', 'lightPair'],
  ['ceilingDown', 'ceilingUp', 'lightOffGrid', 'doorChanged', 'dimmer', 'fog', 'facingWall', 'objectMoved', 'floorRaised'],
];

// Endringer som bare gjelder denne modusen (de andre står i gen/wrong.js).
const OWN = {
  objectGone(level, rand) {
    const list = level.objects.filter((o) => o.id !== 'clock');
    if (!list.length) return null;
    const gone = list[Math.floor(rand() * list.length)];
    level.objects = level.objects.filter((o) => o !== gone);
    return { what: 'Something that used to stand here is gone', cells: [[gone.x, gone.z]] };
  },
  wrongLook(level, rand) {
    const looks = LOOKS[level.theme];
    if (!looks) return null;
    level.look = 1 + ((level.look + Math.floor(rand() * (looks.length - 2))) % (looks.length - 1));
    return { what: 'The walls were not this colour before', cells: [] };
  },
  wrongTint(level) {
    level.tint = 'red';
    return { what: 'The light had the wrong colour', cells: [] };
  },
};

/** Gangen med sidenisjer, to små rom og møbler. Lik gjennom hele forsøket: den må kunne læres utenat. */
export function spotBase(theme, rand) {
  const level = createLevel({ theme, w: W, h: H, height: getTheme(theme).defaultHeight, name: 'Spot the wrong' });
  fillRect(level, 2, Z0, W - 3, Z1, TILE.FLOOR);
  const niches = [];
  [[5, -1], [13, 1], [21, -1], [27, 1]].forEach(([x, side], k) => {
    const [a, b] = [x + randInt(rand, 0, 1), x + 4 + randInt(rand, 0, 1)];
    const [z0, z1] = side < 0 ? [Z0 - 3, Z0 - 1] : [Z1 + 1, Z1 + 3];
    fillRect(level, a, z0, b, z1, TILE.FLOOR);
    niches.push({ a, b, wall: side < 0 ? z0 : z1, k });
  });
  // To dører til små rom: de er med på det man må huske.
  for (const [x, z, roomZ] of [[10, Z0 - 1, Z0 - 3], [24, Z1 + 1, Z1 + 3]]) {
    fillRect(level, x - 1, Math.min(z, roomZ), x + 1, Math.max(z, roomZ), TILE.WALL);
    fillRect(level, x - 1, roomZ, x + 1, roomZ + (roomZ < z ? 1 : -1), TILE.FLOOR);
    fillRect(level, x, z, x, z, TILE.DOOR);
    level.meta[z * W + x] = DOOR.CLOSED;
  }
  for (const [x] of [[1], [W - 2]]) {
    fillRect(level, x, DOOR_Z, x, DOOR_Z, TILE.DOOR);
    level.meta[DOOR_Z * W + x] = DOOR.CLOSED;
  }
  level.spot = { back: 1, onward: W - 2 };
  level.spawn = { x: 3.5, z: DOOR_Z + 0.5, a: yawFromDir(1, 0) };
  autoLights(level, { spacing: getTheme(theme).lightSpacing, state: LIGHT.ON });
  const items = ITEMS[theme] ?? ITEMS.backrooms;
  niches.forEach(({ a, b, wall }, k) => {
    for (let i = 0; i < 2; i++) placeObject(level, a + 1 + i * 2, wall, items[(k * 2 + i) % items.length]);
  });
  // Langs selve gangen også, så det meste som endrer seg, kan ses uten å gå inn i en nisje.
  [[8, Z1], [12, Z0], [17, Z1], [20, Z0], [31, Z1]].forEach(([x, z], k) => placeObject(level, x, z, items[(k + 1) % items.length]));
  return level;
}

/** Rutene som ikke skal røres: døren man kom inn, endedørene og ruten rett foran dem. */
function keepCells(level) {
  const keep = new Set();
  for (const x of [level.spot.back, level.spot.back + 1, level.spot.back + 2, level.spot.onward, level.spot.onward - 1]) {
    for (let z = Z0; z <= Z1; z++) keep.add(z * level.w + x);
  }
  return keep;
}

/** Endringen for en rekke på `streak`: blant de tydelige først. last: forrige endring, så den ikke kommer to ganger. */
export function pickChange(streak, rand, last = null) {
  const tier = Math.min(TIERS.length - 1, Math.floor(streak / 3));
  const list = [...new Set([...TIERS[tier], ...(tier ? TIERS[tier - 1] : [])])].filter((n) => n !== last);
  return list[Math.floor(rand() * list.length)];
}

/**
 * Neste runde. first: den første i forsøket og etter en feil – da er alt som det skal, så man får se gangen.
 * @returns {{ level, change: { name, what } | null }}
 */
export function spotRound(base, streak, rand, { first = false, last = null } = {}) {
  const level = cloneLevel(base);
  level.objects = [...base.objects];
  if (first || rand() >= SPOT.CHANCE) return { level, change: null };
  for (let tries = 0; tries < 12; tries++) {
    const name = pickChange(streak, rand, last);
    const done = OWN[name] ? OWN[name](level, rand) : applyChange(level, name, rand, keepCells(level));
    if (done) return { level, change: { name, what: done.what } };
  }
  return { level, change: null };
}

/** Riktig valg? turnedBack: gikk man gjennom døren bak seg? */
export const spotRight = (change, turnedBack) => !!change === turnedBack;

/** Beste resultat: { wins, bestTime, bestStreak }. */
export function recordSpot(records = {}, { streak, time = null }) {
  const won = streak >= SPOT.GOAL;
  return {
    wins: (records.wins ?? 0) + (won ? 1 : 0),
    bestTime: won ? Math.min(records.bestTime ?? Infinity, time) : records.bestTime ?? null,
    bestStreak: Math.max(records.bestStreak ?? 0, streak),
  };
}
