// Velger planløsning for temaene i LAYOUTS: én for hele bygget, eller to side om side
// (lobby med romfløy bak). Velger også utseendet (core/looks.js). Rommet starter som massiv vegg, og delene bindes
// sammen til slutt (gen/floorplan.js). classic = temaets gamle oppsett. level.plan er rommene til møbleringen;
// den fjernes når nivået er ferdig. Ren logikk.
import { LIGHT } from '../core/level.js';
import { mulberry32 } from '../core/rng.js';
import { autoLights } from '../core/ops.js';
import { getTheme } from '../core/themes.js';
import { looksOf } from '../core/looks.js';
import { hangDoors } from './doors.js';
import { joinRegions } from './floorplan.js';
import { keepLargestRegion } from './util.js';
import { wing, lobby, conference as hotelConference, staff } from './hotel-layouts.js';
import { open, cells, conference as officeConference, archive } from './office-layouts.js';
import { cathedral, lagoon, abyss, canals } from './pool-layouts.js';
import { ballsea, softmaze, tower, blacklight } from './play-layouts.js';
import { classrooms, gym, auditorium, library, cafeteria } from './school-layouts.js';
import { nightingale, surgery, isolation, morgue } from './ward-layouts.js';
import { bays, flooded, crypt } from './garage-layouts.js';
import { maze, pillars, canyon, lowrooms, halls, slope } from './level0-layouts.js';
import { foodcourt, promenade, service } from './mall-layouts.js';
import { storage, boiler, shelter, laundry } from './basement-layouts.js';
import { concourse, checkin, baggage } from './airport-layouts.js';

const MIX_SIZE = 40; // så lang må den lengste siden være for to planløsninger
const MIX_CHANCE = 0.4;

// min: [lengste, korteste side]; pairs: det som kan stå ved siden av.
export const LAYOUTS = {
  hotel: {
    wing: { build: wing, min: [22, 11], pairs: ['lobby', 'conference', 'staff'] },
    lobby: { build: lobby, min: [26, 20], pairs: ['wing', 'conference'] },
    conference: { build: hotelConference, min: [24, 26], pairs: ['wing', 'lobby'] },
    staff: { build: staff, min: [16, 12], pairs: ['wing'] },
  },
  office: {
    open: { build: open, min: [20, 12], pairs: ['cells', 'archive'] },
    cells: { build: cells, min: [28, 24], pairs: ['open', 'conference'] },
    conference: { build: officeConference, min: [24, 15], pairs: ['cells', 'archive'] },
    archive: { build: archive, min: [18, 14], pairs: ['open', 'conference'] },
  },
  // dim: andelen av lysene som er døde i planløsningen.
  pool: {
    classic: { min: [0, 0], pairs: [] },
    cathedral: { build: cathedral, min: [26, 18], pairs: ['canals'] },
    lagoon: { build: lagoon, min: [22, 18], pairs: ['abyss'] },
    abyss: { build: abyss, min: [20, 14], dim: 0.55, look: 4, pairs: ['lagoon', 'canals'] }, // look: alltid svarte fliser
    canals: { build: canals, min: [24, 18], pairs: ['cathedral', 'abyss'] },
  },
  playroom: {
    classic: { min: [0, 0], pairs: [] },
    ballsea: { build: ballsea, min: [20, 14], pairs: ['softmaze'] },
    softmaze: { build: softmaze, min: [20, 14], pairs: ['ballsea', 'tower'] },
    tower: { build: tower, min: [22, 18], pairs: ['softmaze'] },
    blacklight: { build: blacklight, min: [28, 16], dim: 1, pairs: [] },
  },
  school: {
    classic: { min: [0, 0], pairs: [] },
    classrooms: { build: classrooms, min: [20, 14], pairs: ['gym', 'auditorium', 'library', 'cafeteria'] },
    gym: { build: gym, min: [22, 16], pairs: ['classrooms'] },
    auditorium: { build: auditorium, min: [20, 22], pairs: ['classrooms'] },
    library: { build: library, min: [20, 14], pairs: ['classrooms', 'cafeteria'] },
    cafeteria: { build: cafeteria, min: [20, 16], pairs: ['classrooms', 'library'] },
  },
  ward: {
    classic: { min: [0, 0], pairs: [] },
    nightingale: { build: nightingale, min: [24, 20], pairs: ['surgery', 'isolation'] },
    surgery: { build: surgery, min: [22, 16], pairs: ['nightingale', 'morgue'] },
    isolation: { build: isolation, min: [20, 10], dim: 0.4, pairs: ['morgue', 'nightingale'] },
    morgue: { build: morgue, min: [20, 12], dim: 0.5, pairs: ['isolation', 'surgery'] },
  },
  // weight: Level 0 skal oftest være de gule rommene man kjenner.
  backrooms: {
    classic: { min: [0, 0], pairs: [], weight: 4 },
    maze: { build: maze, min: [20, 14], pairs: ['pillars', 'lowrooms'] },
    pillars: { build: pillars, min: [24, 16], pairs: ['maze', 'canyon'] },
    canyon: { build: canyon, min: [24, 16], pairs: ['pillars', 'lowrooms'] },
    lowrooms: { build: lowrooms, min: [20, 14], pairs: ['maze', 'canyon'] },
    halls: { build: halls, min: [24, 14], weight: 2, look: 1, pairs: ['maze', 'pillars'] }, // look: blekt tapet, som i et kontorbygg
    slope: { build: slope, min: [40, 14], pairs: [] }, // alltid alene: alt oppe er hevet, og ingen annen del skal bindes til det
  },
  garage: {
    classic: { min: [0, 0], pairs: [] },
    bays: { build: bays, min: [24, 14], pairs: ['crypt', 'flooded'] },
    flooded: { build: flooded, min: [20, 14], dim: 0.3, pairs: ['bays', 'crypt'] },
    crypt: { build: crypt, min: [20, 14], dim: 0.45, pairs: ['bays', 'flooded'] },
  },
  // Atriet med gallerier (classic) er kjøpesenteret man kjenner, så det trekkes oftest.
  mall: {
    classic: { min: [0, 0], pairs: [], weight: 2 },
    foodcourt: { build: foodcourt, min: [24, 18], pairs: ['promenade', 'service'] },
    promenade: { build: promenade, min: [26, 20], dim: 0.35, pairs: ['foodcourt', 'service'] },
    service: { build: service, min: [20, 14], dim: 0.25, pairs: ['promenade', 'foodcourt'] },
  },
  basement: {
    classic: { min: [0, 0], pairs: [] },
    storage: { build: storage, min: [18, 12], dim: 0.25, pairs: ['boiler', 'laundry'] },
    boiler: { build: boiler, min: [18, 14], dim: 0.3, pairs: ['storage', 'shelter'] },
    shelter: { build: shelter, min: [22, 16], dim: 0.3, pairs: ['boiler', 'storage'] },
    laundry: { build: laundry, min: [18, 12], pairs: ['storage', 'shelter'] },
  },
  // Flyplassen: oftest den lange gangen med gater; innsjekking og bagasjehall står gjerne ved siden av den.
  airport: {
    concourse: { build: concourse, min: [28, 16], weight: 2, pairs: ['checkin', 'baggage'] },
    checkin: { build: checkin, min: [22, 16], pairs: ['concourse', 'baggage'] },
    baggage: { build: baggage, min: [22, 16], pairs: ['concourse', 'checkin'] },
  },
};

// Hvor mange av lysene som er døde eller blinker i rommene der det skal være mørkt.
const DIM = { archive: 0.6, storage: 0.45, laundry: 0.2, stockroom: 0.3, cage: 0.3, drying: 0.35 };

const fits = ({ min }, rect) => {
  const [a, b] = [rect.x1 - rect.x0 + 1, rect.z1 - rect.z0 + 1];
  return Math.max(a, b) >= min[0] && Math.min(a, b) >= min[1];
};

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

/** To deler med en vegg imellom, delt på tvers av den lengste siden. */
function split(rect, rand) {
  const wide = rect.x1 - rect.x0 >= rect.z1 - rect.z0;
  const [lo, hi] = wide ? [rect.x0, rect.x1] : [rect.z0, rect.z1];
  const cut = lo + Math.floor((hi - lo) * (0.4 + rand() * 0.2));
  return wide ? [{ ...rect, x1: cut - 1 }, { ...rect, x0: cut + 1 }] : [{ ...rect, z1: cut - 1 }, { ...rect, z0: cut + 1 }];
}

/** Planløsningene som skal bygges: [[navn, rektangel], …]. wanted: 'wing' eller 'lobby+wing' (tester). */
function choose(table, rect, rand, wanted) {
  if (wanted) {
    const names = wanted.split('+');
    const parts = names.length > 1 ? split(rect, rand) : [rect];
    return names.map((name, k) => [name, parts[k]]);
  }
  const whole = Object.keys(table).filter((id) => fits(table[id], rect));
  if (!whole.length) return null;
  const longest = Math.max(rect.x1 - rect.x0, rect.z1 - rect.z0) + 1;
  // Der det gamle oppsettet skal være det vanligste (weight), er blandinger sjeldne.
  if (longest >= MIX_SIZE && rand() < (table.classic?.weight ? MIX_CHANCE / 4 : MIX_CHANCE)) {
    const [a, b] = split(rect, rand);
    const pairs = Object.keys(table).flatMap((id) => (fits(table[id], a) ? table[id].pairs.filter((p) => fits(table[p], b)).map((p) => [id, p]) : []));
    if (pairs.length) {
      const [x, y] = pick(rand, pairs);
      return [[x, a], [y, b]];
    }
  }
  return [[pick(rand, whole.flatMap((id) => Array(table[id].weight ?? 1).fill(id))), rect]];
}

/** Slukker en andel av lysene i en del av bygget. */
function dimPart(level, rand, r, share) {
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      const i = z * level.w + x;
      if (level.lights[i] && rand() < share) level.lights[i] = LIGHT.BROKEN;
    }
  }
}

function dimRooms(level, rand) {
  for (const r of level.plan ?? []) {
    const share = DIM[r.kind];
    if (!share) continue;
    for (let z = r.z0; z <= r.z1; z++) {
      for (let x = r.x0; x <= r.x1; x++) {
        const i = z * level.w + x;
        if (level.lights[i] !== LIGHT.ON) continue;
        const d = rand();
        if (d < share) level.lights[i] = LIGHT.BROKEN;
        else if (d < share + 0.12) level.lights[i] = LIGHT.FLICKER;
      }
    }
  }
}

/**
 * Bygger rommet med planløsningene i temaet. Returnerer false når ingen får plass (da bruker
 * stilen det gamle oppsettet). wanted: bestemt planløsning.
 */
export function buildLayout(level, rand, { wanted = null, doors = {}, flicker = 0.05, broken = 0.05 } = {}) {
  const table = LAYOUTS[level.theme];
  const rect = { x0: 1, z0: 1, x1: level.w - 2, z1: level.h - 2 };
  // Eget frø til valget: de gamle oppsettene (classic) bruker rand akkurat som før.
  const pickRand = mulberry32((level.seed ?? 1) ^ 0x1a70);
  const chosen = choose(table, rect, pickRand, wanted);
  if (!chosen) return false;
  // Level 0 beholder det gule tapetet halvparten av gangene.
  const plain = level.theme === 'backrooms' && pickRand() < 0.5;
  level.look = plain ? 0 : Math.floor(pickRand() * (looksOf(level.theme)?.length ?? 1));
  if (chosen.some(([name]) => !table[name].build)) return false;
  if (chosen.length === 1 && table[chosen[0][0]].look) level.look = table[chosen[0][0]].look;
  const ctx = { level, rand, doors: [], locked: [], after: [], lights: [] };
  level.plan = [];
  level.objects = [];
  for (const [name, part] of chosen) table[name].build(ctx, part);
  joinRegions(ctx);
  keepLargestRegion(level);
  for (const step of ctx.after) step(); // glassvegger: etter at veggene er ferdige
  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker, broken });
  for (const step of ctx.lights) step(); // egne lys i planløsningen (hallene i Level 0)
  for (const o of level.objects) if (o.id === 'glasswall') for (const k of [-1, 0, 1]) level.lights[(o.z + (o.rot & 1 ? k : 0)) * level.w + o.x + (o.rot & 1 ? 0 : k)] = LIGHT.NONE;
  dimRooms(level, rand);
  for (const [name, part] of chosen) if (table[name].dim) dimPart(level, rand, part, table[name].dim);
  const hung = (list) => list.filter(([x, z]) => level.tiles[z * level.w + x]); // joinRegions kan ha gravd dem bort
  hangDoors(level, rand, { ...doors, cells: hung(ctx.doors) });
  hangDoors(level, rand, { closed: 1, cells: hung(ctx.locked) });
  level.layout = chosen.map(([name]) => name).join('+');
  if (!level.plan.length) delete level.plan; // ingen rom med funksjon: temaets vanlige møblering
  return true;
}
