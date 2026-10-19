// Kart over armaturene til glansen i blanke fliser (world/gloss.js): én RGBA-piksel per rute.
// R = tent (255) eller ikke, G = blinkegruppe + 1 (0 = fast lys), B = høyden på undersiden av
// armaturen (LAMP_STEP m per trinn, også i ruter uten lys, så speilstrålen vet hvor taket er),
// A = åpen rute (255) – vegger, søyler og dører stenger speilingen. Ren logikk.
import { TILE, LIGHT } from '../core/level.js';
import { ceilingAt, deckAt, SLAB } from '../core/heights.js';

export const LAMP_STEP = 0.08;

/**
 * @param lights resultatet av collectLights (lyskilder uten armatur hoppes over)
 * @param below hvor langt under taket undersiden av armaturen sitter (m)
 * @returns {Uint8Array} w*h*4, rad for rad (z), samme indeks som lagene
 */
export function lampData(level, lights, below = 0) {
  const { w, h } = level;
  const data = new Uint8Array(w * h * 4);
  const height = (ceil) => Math.max(0, Math.min(255, Math.round((ceil - below) / LAMP_STEP)));
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      const tile = level.tiles[i];
      if (tile === TILE.WALL || tile === TILE.PILLAR || tile === TILE.DOOR) continue;
      const d = deckAt(level, x, z);
      data[i * 4 + 2] = height(d ? d - SLAB : ceilingAt(level, x, z));
      data[i * 4 + 3] = 255;
    }
  }
  const done = new Set();
  for (const l of lights) {
    const i = l.cz * w + l.cx;
    if (l.object || done.has(i)) continue; // med dekke: armaturen i nederste etasje
    done.add(i);
    if (l.state === LIGHT.BROKEN) continue;
    data[i * 4] = 255;
    data[i * 4 + 1] = l.state === LIGHT.FLICKER ? l.group + 1 : 0;
    data[i * 4 + 2] = height(l.ceil);
  }
  return data;
}
