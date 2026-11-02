// Krypeganger (TILE.CRAWL): lave, mørke ganger med tak CRAWL_HEIGHT over gulvet. Man kommer bare inn
// nedbøyd (C), og man reiser seg ikke før det er plass til det. Ren logikk – kroppen styres av
// view3d/walker.js, gangene lages i gen/crawlways.js. Se docs/crawlways.md.
import { TILE, getTile } from './level.js';
import { headAt } from './heights.js';

export const BODY = 1.75; // kroppshøyden når man står
export const CRAWL = {
  BODY: 0.7, // kroppshøyden når man kryper (under taket i en krypegang)
  EYE: 0.5, // øyehøyden
  SPEED: 0.85, // m/s, saktere enn å gå (1,55)
  RUN: 1.2, // m/s med Shift
  STEP: 0.5, // meter per lyd fra knær og hender
  AHEAD: [0.5, 1, 1.5], // så langt fram (m) en åpning gir hint om å krype
  SHADE: 0.5, // omgivelseslyset inne i gangen: mørkere enn et rom uten lys, men man ser veggene
};

const RING = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);

/** Er det takhøyde til å stå oppreist i (x, z)? Hele fotavtrykket teller, ikke bare midten. */
export function canStand(level, x, z, y, r = 0.28) {
  const free = (px, pz) => getTile(level, Math.floor(px), Math.floor(pz)) === TILE.WALL || headAt(level, px, pz, y) >= y + BODY;
  return free(x, z) && RING.every(([cx, cz]) => free(x + cx * r, z + cz * r));
}

/** Går blikket mot en krypegang rett foran? */
export function crawlAhead(level, x, z, yaw) {
  const [fx, fz] = [-Math.sin(yaw), -Math.cos(yaw)];
  return CRAWL.AHEAD.some((d) => getTile(level, Math.floor(x + fx * d), Math.floor(z + fz * d)) === TILE.CRAWL);
}

/** Teksten nederst i gåmodus: når det er verdt å krype, og når man kan reise seg igjen. Ellers null. */
export function crawlPrompt(walker, level, touch = false) {
  const key = touch ? 'Tap Crawl to' : 'C –';
  if (walker.down) return walker.wantDown && canStand(level, walker.x, walker.z, walker.floorY) ? `${key} stand up` : null;
  return crawlAhead(level, walker.x, walker.z, walker.yaw) ? `${key} crawl` : null;
}

/** Rutene rett foran åpningene: [[x, z], …]. Der skal det ikke stå noe. */
export function crawlFronts(level) {
  const out = [];
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      if (getTile(level, x, z) !== TILE.CRAWL) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (getTile(level, x + dx, z + dz) === TILE.FLOOR) out.push([x + dx, z + dz]);
    }
  }
  return out;
}

/** Utvidelsene i enden av blindganger (2 × 2 ruter), som indekser: der kan det ligge en kassett. */
export function crawlNooks(level) {
  const out = [];
  const crawl = (x, z) => getTile(level, x, z) === TILE.CRAWL;
  for (let z = 0; z < level.h - 1; z++) {
    for (let x = 0; x < level.w - 1; x++) {
      if (crawl(x, z) && crawl(x + 1, z) && crawl(x, z + 1) && crawl(x + 1, z + 1)) out.push(z * level.w + x);
    }
  }
  return out;
}
