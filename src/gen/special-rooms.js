// Katalogen over spesialrom (gen/specials.js): hver har id, fits(level, room) og apply(level, rand, room) (false = gikk
// ikke). room = { cells, x0, z0, x1, z1, area, rect, enclosed } – enclosed: et rom mellom vegger, ellers et felt midt i en
// stor flate. themes/not begrenser temaene. Hvert enkelt er sjeldent; de er mange, så noe dukker ofte opp. Ren logikk.
import { TILE, LIGHT, canHaveLight } from '../core/level.js';
import { STAIR_DIRS } from '../core/heights.js';
import { fillZone } from '../core/zones.js';
import { FINISH } from '../core/finishes.js';
import { placeStairs } from '../core/stairs.js';
import { put } from './furnish-sets.js';
import { rotOf } from './room-tools.js';
import { chairPile } from './chair-piles.js';

const CHAIRS = { office: 'officechair', school: 'plasticchair', ward: 'plasticchair', hotel: 'woodenchair', basement: 'woodenchair',
  backrooms: 'woodenchair', garage: 'plasticchair', mall: 'plasticchair', playroom: 'plasticchair', airport: 'plasticchair', pool: 'deckchair' };
const PLANTS = ['pottedplant', 'yucca', 'palmplant', 'pottedpalm'];
const BEDS = { ward: 'hospitalbed', basement: 'bunkbed', school: 'bunkbed' };

/** Det spesialrommene kan sette inn, i alle temaer (i tillegg til temaets egne gjenstander). */
export const SPECIAL_ITEMS = [...new Set([...Object.values(CHAIRS), ...PLANTS, ...Object.values(BEDS), 'double_bed', 'duck', 'tv', 'waitingchairs', 'clock', 'soda', 'archiveshelf', 'fan'])];

const xz = (level, i) => [i % level.w, Math.floor(i / level.w)];
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const room = (min, max = 260) => (level, r) => r.enclosed && r.area >= min && r.area <= max;
const area = (min, max = 260) => (level, r) => r.area >= min && r.area <= max;
const centre = (r) => [Math.floor((r.x0 + r.x1) / 2), Math.floor((r.z0 + r.z1) / 2)];

/** Rutene i rommet som ikke ligger inntil en dør (så ingenting stenger en døråpning). */
function away(level, r) {
  return r.cells.filter((i) => {
    const [x, z] = xz(level, i);
    return level.tiles[i] === TILE.FLOOR && !STAIR_DIRS.some(([dx, dz]) => level.tiles[(z + dz) * level.w + x + dx] === TILE.DOOR);
  });
}

/** Ruter inntil en vegg, med retningen mot veggen: [[x, z, dx, dz], …]. */
function byWalls(level, r) {
  const out = [];
  for (const i of away(level, r)) {
    const [x, z] = xz(level, i);
    for (const [dx, dz] of STAIR_DIRS) if (level.tiles[(z + dz) * level.w + x + dx] === TILE.WALL) { out.push([x, z, dx, dz]); break; }
  }
  return out;
}

/** Alle lysene i rommet: state, eller (for BROKEN) bare de som fantes. */
function lights(level, r, state) {
  for (const i of r.cells) if (level.lights[i] || state !== LIGHT.BROKEN) level.lights[i] = canHaveLight(level.tiles[i]) ? state : 0;
}

function lightAt(level, [x, z], state) {
  const i = z * level.w + x;
  if (canHaveLight(level.tiles[i])) level.lights[i] = state;
}

/** Halvparten av lysene dør, en og annen blinker. */
function dim(level, rand, r) {
  for (const i of r.cells) if (level.lights[i]) level.lights[i] = rand() < 0.5 ? LIGHT.BROKEN : rand() < 0.3 ? LIGHT.FLICKER : LIGHT.ON;
}

const wallRuns = (level, r) => byWalls(level, r).filter(([x, z], k, all) => (x + z) % 2 === 0 || all.length < 8);

export const SPECIALS = [
  // Ankeldypt vann over hele gulvet (i lekerommet: en ballbinge).
  { id: 'flooded', not: ['pool'], fits: room(12, 220), apply(level, rand, r) {
    const cells = r.cells.filter((i) => level.tiles[i] === TILE.FLOOR);
    for (const i of cells) level.tiles[i] = TILE.WATER;
    fillZone(level, 'depth', cells, 0.3 + Math.floor(rand() * 3) / 10);
  } },
  // Et basseng midt i et vanlig rom, med fliser rundt.
  { id: 'poolroom', not: ['pool', 'playroom'], fits: room(24, 160), apply(level, rand, r) {
    const set = new Set(r.cells);
    const inner = r.cells.filter((i) => level.tiles[i] === TILE.FLOOR && [1, -1, level.w, -level.w].every((d) => set.has(i + d)));
    if (inner.length < 8) return false;
    for (const i of inner) level.tiles[i] = TILE.WATER;
    fillZone(level, 'depth', inner, 1.2 + Math.floor(rand() * 6) / 10);
    fillZone(level, 'finish', r.cells.filter((i) => level.tiles[i] === TILE.FLOOR), FINISH.TILES);
    for (let k = 0; k < 3; k++) put(level, 'duck', ...xz(level, pick(rand, inner)), Math.floor(rand() * 4));
  } },
  // Stoler i rader, alle vendt mot den samme veggen.
  { id: 'chairgrid', fits: area(25), apply(level, rand, r) {
    const id = CHAIRS[level.theme] ?? 'plasticchair';
    const rot = Math.floor(rand() * 4);
    let n = 0;
    for (const i of away(level, r)) { const [x, z] = xz(level, i); if ((x - r.x0) % 2 === 1 && (z - r.z0) % 2 === 1 && put(level, id, x, z, rot)) n++; }
    return n >= 6;
  } },
  // Et venterom: rader med seter mot et TV ved veggen.
  { id: 'waitingroom', fits: room(20, 200), apply(level, rand, r) {
    const walls = byWalls(level, r);
    if (!walls.length) return false;
    const [tx, tz, dx, dz] = pick(rand, walls);
    if (!put(level, 'tv', tx, tz, rotOf([-dx, -dz]))) return false;
    let n = 0;
    for (const i of away(level, r)) {
      const [x, z] = xz(level, i);
      const ahead = (x - tx) * -dx + (z - tz) * -dz; // avstand fra TV-et, ut i rommet
      const side = dx ? z - tz : x - tx;
      if (ahead >= 3 && ahead % 2 === 1 && Math.abs(side) % 2 === 0 && put(level, 'waitingchairs', x, z, rotOf([dx, dz]))) n++;
    }
    return n >= 2;
  } },
  // Mørkt: alle lysene er døde, bare ett blinker midt i.
  { id: 'darkroom', fits: room(16), apply(level, rand, r) { lights(level, r, LIGHT.BROKEN); lightAt(level, centre(r), LIGHT.FLICKER); } },
  // Et lite rom med taket langt der oppe.
  { id: 'tallroom', not: ['mall'], fits: room(9, 60), apply(level, rand, r) {
    fillZone(level, 'ceiling', r.cells, 9 + Math.floor(rand() * 50) / 10);
    lights(level, r, LIGHT.NONE);
    lightAt(level, centre(r), LIGHT.ON);
  } },
  // Taket rett over hodet i et stort rom.
  { id: 'lowroom', fits: room(30), apply(level, rand, r) { fillZone(level, 'ceiling', r.cells, 2.1 + Math.floor(rand() * 2) / 10); } },
  // TV-er på gulvet i ring, alle vendt inn mot midten.
  { id: 'tvroom', fits: area(25), apply(level, rand, r) {
    const [cx, cz] = centre(r);
    const ring = [[0, -3], [2, -2], [3, 0], [2, 2], [0, 3], [-2, 2], [-3, 0], [-2, -2]];
    let n = 0;
    for (const [ox, oz] of ring) {
      const face = Math.abs(ox) >= Math.abs(oz) ? [-Math.sign(ox), 0] : [0, -Math.sign(oz)];
      if (put(level, 'tv', cx + ox, cz + oz, rotOf(face))) n++;
    }
    dim(level, rand, r);
    return n >= 5;
  } },
  // Klokker over hele veggene.
  { id: 'clockroom', fits: room(12, 200), apply(level, rand, r) {
    let n = 0;
    for (const [x, z, dx, dz] of wallRuns(level, r)) if (n < 18 && put(level, 'clock', x, z, rotOf([-dx, -dz]))) n++;
    return n >= 6;
  } },
  // Grodd igjen av potteplanter.
  { id: 'plantroom', fits: area(16), apply(level, rand, r) {
    let n = 0;
    for (const i of away(level, r)) { const [x, z] = xz(level, i); if ((x + z) % 2 === 0 && rand() < 0.75 && put(level, pick(rand, PLANTS), x, z, Math.floor(rand() * 4))) n++; }
    dim(level, rand, r);
    return n >= 5;
  } },
  // En rad med brusautomater som summer i et ellers tomt rom.
  { id: 'vending', fits: room(12, 200), apply(level, rand, r) {
    const walls = byWalls(level, r);
    if (!walls.length) return false;
    const [, , dx, dz] = pick(rand, walls);
    let n = 0;
    for (const [x, z, wx, wz] of walls) if (wx === dx && wz === dz && n < 6 && put(level, 'soda', x, z, rotOf([-dx, -dz]))) n++;
    for (const i of r.cells) if (level.lights[i] && rand() < 0.4) level.lights[i] = LIGHT.FLICKER;
    return n >= 2;
  } },
  // Søyler i tett rutenett.
  { id: 'pillarforest', fits: room(60), apply(level, rand, r) {
    for (const i of away(level, r)) { const [x, z] = xz(level, i); if ((x - r.x0) % 2 === 1 && (z - r.z0) % 2 === 1) { level.tiles[i] = TILE.PILLAR; level.lights[i] = 0; } }
  } },
  // Én seng midt i et stort, tomt rom, med ett lys som blinker over.
  { id: 'lonebed', fits: room(30), apply(level, rand, r) {
    const c = centre(r);
    if (!put(level, BEDS[level.theme] ?? 'double_bed', ...c, Math.floor(rand() * 4))) return false;
    lights(level, r, LIGHT.BROKEN);
    lightAt(level, c, LIGHT.FLICKER);
  } },
  // En trapp som går rett inn i veggen.
  { id: 'stairsnowhere', not: ['mall'], fits: room(16), apply(level, rand, r) {
    const walls = byWalls(level, r).filter(([x, z, dx, dz]) => [1, 2, 3, 4].every((k) => level.tiles[(z - dz * k) * level.w + x - dx * k] === TILE.FLOOR));
    if (!walls.length) return false;
    const [x, z, dx, dz] = pick(rand, walls);
    placeStairs(level, [x - dx * 3, z - dz * 3], [x, z], 1);
  } },
  // Ingen taklys, bare LED-striper langs alle veggene i én farge.
  { id: 'ledroom', fits: room(16), apply(level, rand, r) {
    lights(level, r, LIGHT.NONE);
    const color = 1 + Math.floor(rand() * 8);
    for (const i of r.cells) for (const d of [1, -1, level.w, -level.w]) if (level.tiles[i + d] === TILE.WALL) level.leds[i + d] = color;
  } },
  // Hele taket lyser: paneler i stedet for lamper.
  { id: 'panelroom', fits: room(16), apply(level, rand, r) {
    lights(level, r, LIGHT.NONE);
    const type = rand() < 0.5 ? 1 : 3;
    for (const i of r.cells) if (canHaveLight(level.tiles[i])) level.panels[i] = type;
  } },
  // Hauger av stoler, og halvparten av lysene døde.
  { id: 'chairpiles', fits: area(40), apply(level, rand, r) {
    let n = 0;
    for (let t = 0; t < 30 && n < 5; t++) {
      const x = r.x0 + 1 + Math.floor(rand() * Math.max(1, r.x1 - r.x0 - 2));
      const z = r.z0 + 1 + Math.floor(rand() * Math.max(1, r.z1 - r.z0 - 2));
      if (chairPile(level, rand, x, z)) n++;
    }
    dim(level, rand, r);
    return n >= 2;
  } },
  // Arkivhyller så tett at det blir en liten labyrint.
  { id: 'shelfmaze', fits: room(40), apply(level, rand, r) {
    let n = 0;
    for (const i of away(level, r)) {
      const [x, z] = xz(level, i);
      if (x > r.x0 && x < r.x1 && (z - r.z0) % 3 === 1 && (x - r.x0) % 5 !== 0 && put(level, 'archiveshelf', x, z, 0)) n++;
    }
    return n >= 4;
  } },
  // Køyesenger langs veggene: en sovesal der den ikke hører hjemme.
  { id: 'dormitory', not: ['basement'], fits: room(30), apply(level, rand, r) {
    let n = 0;
    for (const [x, z, dx, dz] of wallRuns(level, r)) if (n < 10 && put(level, 'bunkbed', x, z, rotOf([-dx, -dz]))) n++;
    lights(level, r, LIGHT.BROKEN);
    lightAt(level, centre(r), LIGHT.ON);
    return n >= 3;
  } },
  // Altfor mange takvifter som går rundt.
  { id: 'fanroom', fits: room(20), apply(level, rand, r) {
    let n = 0;
    for (const i of r.cells) { const [x, z] = xz(level, i); if ((x - r.x0) % 3 === 1 && (z - r.z0) % 3 === 1 && level.tiles[i] === TILE.FLOOR && put(level, 'fan', x, z, 0)) n++; }
    return n >= 3;
  } },
];
