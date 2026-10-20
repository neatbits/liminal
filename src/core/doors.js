// Dørblad i døråpninger. meta-verdien for en døråpning (TILE.DOOR):
//   bit 0–1  tilstand: 0 ingen dør (bare åpning), 1 lukket, 2 på gløtt, 3 åpen
//   bit 2    slå ut mot den andre siden (bare når begge sider er åpne)
//   bit 3    hengsler i den andre enden av åpningen
// En dør med vegg på baksiden fører ingen steder («dør til ingensteds»); står den på
// gulvnivå regnes den som en bod (temaet kan gi boddører eget utseende). Ren logikk.
import { TILE, getTile, inBounds, setTile } from './level.js';
import { floorAt } from './heights.js';

export const DOOR = Object.freeze({ NONE: 0, CLOSED: 1, AJAR: 2, OPEN: 3 });
const STATE = 3;
const SWING = 4;
const HINGE = 8;
export const LEAF_GAP = 0.015; // klaring mellom dørblad og karm
const ANGLE = { [DOOR.CLOSED]: 0, [DOOR.AJAR]: 0.45, [DOOR.OPEN]: Math.PI / 2 };

const isWall = (level, x, z) => getTile(level, x, z) === TILE.WALL;

/** Siden med flest åpne ruter rett utenfor åpningen (+1 ved likt). */
function roomierSide(level, x, z, pz) {
  const count = (s) => {
    let n = 0;
    for (let k = -1; k <= 1; k++) if (!(pz ? isWall(level, x + k, z + s) : isWall(level, x + s, z + k))) n++;
    return n;
  };
  return count(-1) > count(1) ? -1 : 1;
}

/**
 * Døråpningen i (x, z), eller null hvis ruten ikke er en åpning mellom to vegger.
 * Lokale akser: p går gjennom åpningen, a langs veggen (pz = true: p er z, a er x).
 * @returns {{ x, z, pz, a0, p0, state, side, hinge, oneSided, closet, face }}
 *   a0/p0: rutens hjørne langs a/p · side: ±1, retningen dørbladet slår ut mot ·
 *   hinge: 0 = hengsler ved a0, 1 = ved a0 + 1 · oneSided: vegg bak døren ·
 *   closet: dør til ingensteds på gulvnivå · face: p-koordinaten til veggflaten dørbladet
 *   sitter i når det er lukket
 */
export function doorInfo(level, x, z) {
  if (getTile(level, x, z) !== TILE.DOOR) return null;
  let pz;
  if (isWall(level, x - 1, z) && isWall(level, x + 1, z)) pz = true;
  else if (isWall(level, x, z - 1) && isWall(level, x, z + 1)) pz = false;
  else return null;
  const open = (s) => !(pz ? isWall(level, x, z + s) : isWall(level, x + s, z));
  const lo = open(-1);
  const hi = open(1);
  const meta = level.meta[z * level.w + x];
  const side = lo !== hi ? (hi ? 1 : -1) : roomierSide(level, x, z, pz) * (meta & SWING ? -1 : 1);
  const p0 = pz ? z : x;
  return {
    x,
    z,
    pz,
    a0: pz ? x : z,
    p0,
    state: meta & STATE,
    side,
    hinge: meta & HINGE ? 1 : 0,
    oneSided: !(lo && hi),
    closet: !(lo && hi) && floorAt(level, x, z) < 0.05,
    face: p0 + (side > 0 ? 1 : 0),
  };
}

/**
 * Hvor dørbladet står (sett ovenfra): o = hengselpunktet [x, z], u = enhetsvektor fra
 * hengslet langs bladet, closed = samme vektor når døren er lukket, w = bladets bredde.
 */
export function leafPose(info) {
  const A = info.pz ? [1, 0] : [0, 1];
  const P = info.pz ? [0, 1] : [1, 0];
  const along = info.hinge ? -1 : 1;
  const ha = info.hinge ? info.a0 + 1 - LEAF_GAP : info.a0 + LEAF_GAP;
  const angle = ANGLE[info.state] ?? 0;
  const da = along * Math.cos(angle);
  const dp = info.side * Math.sin(angle);
  return {
    o: info.pz ? [ha, info.face] : [info.face, ha],
    u: [A[0] * da + P[0] * dp, A[1] * da + P[1] * dp],
    closed: [A[0] * along, A[1] * along],
    w: 1 - 2 * LEAF_GAP,
  };
}

/** Rutene rett foran åpningen på begge sider (ikke vegger): de må holdes fri for å komme gjennom. */
export function doorFronts(info) {
  const out = [];
  for (const s of [-1, 1]) {
    const [x, z] = info.pz ? [info.x, info.z + s] : [info.x + s, info.z];
    out.push([x, z]);
  }
  return out;
}

/** Ruten dørbladet slår inn i når det åpnes, eller null når åpningen ikke har dørblad. */
export function swingCell(info) {
  if (!info.state) return null;
  return info.pz ? [info.x, info.z + info.side] : [info.x + info.side, info.z];
}

/** Snur slagretningen (bare for dører med rom på begge sider). Returnerer true hvis den ble snudd. */
export function flipSwing(level, x, z) {
  const info = doorInfo(level, x, z);
  if (!info || info.oneSided) return false;
  level.meta[z * level.w + x] ^= SWING;
  return true;
}

/**
 * Kan (x, z) få en dør? En vegg, døråpning eller gulvrute (en åpning i veggen) med vegg i
 * begge ender, og rom på minst én side.
 */
export function canHoldDoor(level, x, z) {
  if (x <= 0 || z <= 0 || x >= level.w - 1 || z >= level.h - 1) return false;
  const t = getTile(level, x, z);
  if (t !== TILE.WALL && t !== TILE.DOOR && t !== TILE.FLOOR) return false;
  const wall = (dx, dz) => isWall(level, x + dx, z + dz);
  if (wall(-1, 0) && wall(1, 0)) return !wall(0, -1) || !wall(0, 1);
  if (wall(0, -1) && wall(0, 1)) return !wall(-1, 0) || !wall(1, 0);
  return false;
}

/**
 * Dørverktøyet: setter inn en dør med gitt tilstand (gjør vegg om til døråpning). Klikk på
 * en dør med samme tilstand snur den (hengsler, og slagretning når begge sider er åpne).
 * erase fjerner dørbladet og lar åpningen stå. Returnerer antall endrede ruter.
 */
export function setDoor(level, x, z, state, erase = false) {
  if (!inBounds(level, x, z)) return 0;
  const i = z * level.w + x;
  if (erase) {
    if (level.tiles[i] !== TILE.DOOR || !(level.meta[i] & STATE)) return 0;
    level.meta[i] &= ~STATE;
    return 1;
  }
  if (!canHoldDoor(level, x, z)) return 0;
  setTile(level, x, z, TILE.DOOR);
  const m = level.meta[i];
  if ((m & STATE) !== state) {
    level.meta[i] = state | (m & (SWING | HINGE));
    return 1;
  }
  const turns = doorInfo(level, x, z)?.oneSided ? 2 : 4;
  const k = ((m & HINGE ? 1 : 0) + (m & SWING ? 2 : 0) + 1) % turns;
  level.meta[i] = state | (k & 1 ? HINGE : 0) | (k & 2 ? SWING : 0);
  return 1;
}

/** Den lukkede dørens fotavtrykk (for kollisjon): [x0, z0, x1, z1], eller null. */
export function closedLeafBox(info) {
  if (!info || info.state !== DOOR.CLOSED) return null;
  const p0 = info.face - 0.03;
  const p1 = info.face + 0.03;
  return info.pz ? [info.a0, p0, info.a0 + 1, p1] : [p0, info.a0, p1, info.a0 + 1];
}

/**
 * Døren man står foran og kan åpne/lukke: innen `reach` meter fra midten av dørbladet og
 * omtrent i synsretningen (yaw 0 = mot −z). Dører til ingensteds kan ikke åpnes.
 * @returns {{ i, info } | null}
 */
export function doorInReach(level, x, z, yaw, reach = 1.8, { exits = false } = {}) {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  let best = null;
  let bestD = reach;
  for (let cz = Math.floor(z - reach); cz <= Math.floor(z + reach); cz++) {
    for (let cx = Math.floor(x - reach); cx <= Math.floor(x + reach); cx++) {
      const info = doorInfo(level, cx, cz);
      if (!info || (info.oneSided && !exits) || info.state === DOOR.NONE) continue;
      const [px, pz] = info.pz ? [info.a0 + 0.5, info.face] : [info.face, info.a0 + 0.5];
      const d = Math.hypot(px - x, pz - z);
      if (d >= bestD || (d > 0.4 && ((px - x) * fx + (pz - z) * fz) / d < 0.5)) continue;
      best = { i: cz * level.w + cx, info };
      bestD = d;
    }
  }
  return best;
}

/**
 * Åpner en lukket dør eller lukker en åpen/gløtt dør (bare i `level.meta`). Lukker ikke
 * hvis dørbladet ville truffet spilleren (sirkel med radius r i x, z).
 * @returns den nye tilstanden, eller null
 */
export function toggleDoor(level, i, x, z, r) {
  const info = doorInfo(level, i % level.w, (i / level.w) | 0);
  if (!info || info.oneSided || info.state === DOOR.NONE) return null;
  const state = info.state === DOOR.CLOSED ? DOOR.OPEN : DOOR.CLOSED;
  if (state === DOOR.CLOSED) {
    const b = closedLeafBox({ ...info, state });
    const qx = Math.max(b[0], Math.min(x, b[2]));
    const qz = Math.max(b[1], Math.min(z, b[3]));
    if (Math.hypot(x - qx, z - qz) < r + 0.02) return null;
  }
  level.meta[i] = (level.meta[i] & ~STATE) | state;
  return state;
}

/** Ruter der en lukket dør stenger (flatebiter per rute: 1 = z-flaten, 2 = z+1, 4 = x, 8 = x+1). */
export function closedDoorFaces(level) {
  const faces = new Uint8Array(level.w * level.h);
  for (let i = 0; i < faces.length; i++) {
    if (level.tiles[i] !== TILE.DOOR || (level.meta[i] & STATE) !== DOOR.CLOSED) continue;
    const info = doorInfo(level, i % level.w, (i / level.w) | 0);
    if (info) faces[i] = info.pz ? (info.side > 0 ? 2 : 1) : info.side > 0 ? 8 : 4;
  }
  return faces;
}
