// Bakt lys: hver vertex får lys fra armaturer innenfor en radius, med siktlinje gjennom
// rutenettet (vegger, lavere tak, bassengkanter og dekkeplater kaster skygge). Blinkende lys
// bakes i egne grupper. Et lys i en rute med dekke gir én armatur i hver etasje.
import { LIGHT, canHaveLight, inBounds } from '../core/level.js';
import { ledLights } from '../core/leds.js';
import { panelLights } from '../core/panels.js';
import { ceilingAt, floorAt, deckAt, SLAB } from '../core/heights.js';
import { glowSources } from '../core/objects.js';
import { windows, skyOf } from '../core/windows.js';
import { hexToLinear } from './color.js';
import { openPoint } from '../core/corners.js';
import { lightGrid, lightSampleKey, windowNeighbours } from './light-grid.js';
import { mallRoof } from '../core/mall-roof.js';
import { pillarContains } from '../core/pillars.js';
import { cellHeights, lineOfSight, settle } from './sightline.js';

export { cellHeights, lineOfSight }; // samlet her for de mange som allerede importerer dem fra lighting.js

export const FLICKER_GROUPS = 4;
export const LIGHT_DROP = 0.15; // lyskilden sitter litt under taket
export const HANG = 8; // i høyere rom bakes lyset som en søyle fra taket ned hit (`low`), så det når gulvet

export function flickerGroup(x, z) {
  return (((x * 73856093) ^ (z * 19349663)) >>> 0) % FLICKER_GROUPS;
}

/**
 * Alle armaturer i rommet: { cx, cz, x, z, y, top, ceil, low?, state, group }, pluss lyskilder uten
 * armatur (object: true – de surrer ikke): svakt lys fra skjermer og dagslys fra vinduer, med
 * egen farge (rgb, lineær) og styrke (power) i forhold til et taklys.
 */
export function collectLights(level) {
  const out = [];
  const roof = mallRoof(level);
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      const i = z * level.w + x;
      const state = level.lights[i];
      if (state === LIGHT.NONE || !canHaveLight(level.tiles[i]) || pillarContains(level, x + .5, z + .5)) continue;
      const group = flickerGroup(x, z);
      const d = deckAt(level, x, z);
      // Med dekke: én armatur under dekket og én under taket over det. Armaturen sitter alltid i taket
      // (top = ceil). I rom høyere enn HANG lyser den som en søyle fra taket ned til HANG over gulvet
      // (low, se gather): gulvet får like mye lys som fra en lampe der nede, uten hengende lamper.
      const floors = d ? [floorAt(level, x, z), d] : [floorAt(level, x, z)];
      (d ? [d - SLAB, ceilingAt(level, x, z)] : [ceilingAt(level, x, z)]).forEach((ceil, k) => {
        if(roof?.mask[i] && (!d||k===1))return;
        const low = Math.min(ceil, floors[k] + HANG);
        out.push({ cx: x, cz: z, x: x + 0.5, z: z + 0.5, y: ceil - LIGHT_DROP, top: ceil, ceil, state, group, ...(low < ceil ? { low: low - LIGHT_DROP } : {}) });
      });
    }
  }
  for (const g of glowSources(level)) {
    if (!inBounds(level, g.cx, g.cz)) continue;
    out.push({ ...g, ceil: g.y, state: LIGHT.ON, group: 0, object: true });
  }
  const sky = skyOf(level);
  const rgb = hexToLinear(sky.light);
  if (roof) for (let z = roof.z0 + 1; z < roof.z1; z += 3) for (let x = roof.x0 + 1; x < roof.x1; x += 4) {
    if(!roof.mask[z*level.w+x])continue;
    out.push({ cx: x, cz: z, x: x + .5, z: z + .5, y: roof.base - .18, ceil: roof.base, state: LIGHT.ON, group: 0, object: true, power: sky.power * .9, rgb });
  }
  // Vinduer som sitter tett deler på dagslyset (ellers summeres de, og med taklyset blir det
  // hvitt): hvert vindu får styrken delt på hvor mange vinduer som er innen 3 m.
  const wins = windows(level);
  const neighbours = windowNeighbours(level, wins);
  for (const [i, win] of wins.entries()) {
    const near = neighbours[i];
    const [nx, nz] = win.n;
    const x = win.x + 0.5 + nx * 0.9;
    const z = win.z + 0.5 + nz * 0.9;
    const y = (win.sill + win.head) / 2;
    out.push({ cx: Math.floor(x), cz: Math.floor(z), x, z, y, ceil: y, state: LIGHT.ON, group: 0, object: true, power: sky.power / (1 + (near - 1) * 0.7), rgb });
  }
  // Lys fra etasjen over i et trapperom (core/stairwells.js).
  for (const l of level.borrowed ?? []) out.push({ ...l, cx: Math.floor(l.x), cz: Math.floor(l.z), ceil: l.y, state: LIGHT.ON, group: 0, object: true });
  // Lyspaneler i taket og LED-striper under taket (core/panels.js, core/leds.js): farget lys.
  for (const { hex, ...l } of [...panelLights(level), ...ledLights(level)]) out.push({ ...l, rgb: hexToLinear(hex) });
  return out;
}

/**
 * Lager en lysfunksjon for rommet.
 * sample(x,y,z,nx,ny,nz) → [r, g, b, f0, f1, f2, f3] (statisk lys + blinkegrupper, skalar).
 * objectSample(x,y,z,nx,ny,nz, both) → det samme for gjenstander (object-light.js), eller
 * [forside, bakside] med both. Gjenstandene har mange normaler i hvert 5 cm-punkt: siktlinjene
 * regnes fra selve punktet, 2 cm mot hvert lys (ikke 2 cm ut langs normalen, som flatene trenger)
 * og gjenbrukes for alle normalene og begge sidene. Eget buffer, så rekkefølgen ikke betyr noe;
 * releaseObjectSamples() frigjør det når alle gjenstandene er bakt.
 */
export function createLightField(level, theme, lights = collectLights(level)) {
  const p = theme.light;
  const color = hexToLinear(p.color);
  const ambient = hexToLinear(p.ambient);
  const intensity = p.intensity * (level.bright ?? 1);
  const k = 1 / (p.falloff * p.falloff);
  const R = p.radius;
  const R2 = R * R;
  const near = lightGrid(level, lights);
  const heights = cellHeights(level);

  /** Startpunkt, lyskandidater og kjente siktlinjer (0 = ukjent, 1 = fri, 2 = stengt). */
  function origin(x, y, z, toward = false) {
    const [sx, sz] = openPoint(level, ...settle(level, heights, x, z, y));
    const candidates = near(sx, sz, R);
    return { sx, sz, candidates, sight: new Uint8Array(candidates.length), toward };
  }

  /** Lyset på hver side (sign 1 = normalen, −1 = baksiden) sett fra startpunktet `at`. */
  function gather(x, y, z, nx, ny, nz, signs, at = origin(x + nx * 0.02, y, z + nz * 0.02)) {
    const outs = signs.map(() => [ambient[0], ambient[1], ambient[2], 0, 0, 0, 0]);
    const days = signs.map(() => [0, 0, 0]); // dagslys fra vinduer, lagt til til slutt
    const { sx, sz, candidates, sight } = at;
    for (let i = 0; i < candidates.length; i++) {
      const l = candidates[i];
      const ly = l.low === undefined ? l.y : Math.min(l.y, Math.max(l.low, y)); // nærmeste punkt i lyssøylen
      const dx = l.x - sx;
      const dy = ly - y;
      const dz = l.z - sz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > R2) continue;
      const d = Math.sqrt(d2) + 1e-6;
      const cos = (nx * dx + ny * dy + nz * dz) / d;
      const win = 1 - d2 / R2;
      for (let j = 0; j < signs.length; j++) {
        const wrap = signs[j] * cos * 0.7 + 0.3;
        if (wrap <= 0) continue;
        const c = (wrap * intensity * (l.power ?? 1) * win * win) / (1 + d2 * k);
        if (c < 0.002) continue;
        // Siktlinjen regnes bare når en side faktisk får lys herfra, og bare én gang per punkt.
        if (!sight[i]) {
          // Gjenstander: start 2 cm mot lyset (vannrett, som normalforskyvningen for flater), så en
          // flate på en halvvegg ikke skygger for seg selv – men lys bak den fortsatt stenges.
          const h = at.toward ? Math.hypot(dx, dz) || 1 : Infinity;
          sight[i] = lineOfSight(level, sx + (dx / h) * 0.02, sz + (dz / h) * 0.02, l.x, l.z, heights, y, ly) ? 1 : 2;
        }
        if (sight[i] === 2) continue;
        if (l.state === LIGHT.FLICKER) {
          outs[j][3 + l.group] += c;
        } else {
          const col = l.rgb ?? color;
          const to = l.rgb ? days[j] : outs[j];
          to[0] += c * col[0];
          to[1] += c * col[1];
          to[2] += c * col[2];
        }
      }
    }
    // Dagslyset legges til mindre jo lysere det allerede er (ellers blir lyse rom med mange
    // vinduer helt hvite): et mørkt rom får nesten alt, et opplyst rom en liten del.
    outs.forEach((out, j) => {
      const lit = (out[0] + out[1] + out[2]) / 3;
      const share = 1 / (1 + lit * lit * 2);
      for (let c = 0; c < 3; c++) out[c] += days[j][c] * share;
    });
    return outs;
  }

  const cache = new Map();
  function sample(x, y, z, nx, ny, nz) {
    const key = lightSampleKey(x, y, z, nx, ny, nz);
    let out = cache.get(key);
    if (!out) cache.set(key, (out = gather(x, y, z, nx, ny, nz, [1])[0]));
    return out;
  }

  const objects = new Map(); // gjenstandsprøver (nøkkel → lys)
  const origins = new Map(); // 5 cm-punkt → origin(), delt av alle normalene der
  function objectSample(x, y, z, nx, ny, nz, both = false) {
    const front = lightSampleKey(x, y, z, nx, ny, nz);
    const back = both ? lightSampleKey(x, y, z, -nx, -ny, -nz) : null;
    let f = objects.get(front);
    let b = both ? objects.get(back) : null;
    if (!f || (both && !b)) {
      const point = lightSampleKey(x, y, z, 0, 0, 0);
      let at = origins.get(point);
      if (!at) origins.set(point, (at = origin(x, y, z, true)));
      const [gf, gb] = gather(x, y, z, nx, ny, nz, both ? [1, -1] : [1], at);
      if (!f) objects.set(front, (f = gf));
      if (both && !b) objects.set(back, (b = gb));
    }
    return both ? [f, b] : f;
  }

  /** Når gjenstandene er bakt (objects.js): bufferne trengs ikke lenger og kan være store. */
  function releaseObjectSamples() {
    objects.clear();
    origins.clear();
  }

  return { sample, objectSample, releaseObjectSamples, near, color, lights };
}
