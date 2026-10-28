// Lyspaneler i taket (laget «panels»): en lysende flate under taket i hele ruten. Ren logikk –
// 2D (editor/render-panels.js), 3D (world/panels.js) og lysbakingen bruker panelCells.
// Indeks 1–3; 0 = ingen. `power` er per rute, så et helt panelfelt ikke brenner ut bildet.
import { TILE, LIGHT, canHaveLight } from './level.js';
import { ceilingAt, floorAt } from './heights.js';

export const PANEL_COLORS = [
  null,
  { hex: '#e4eef8', light: '#e8f2ff', power: 0.3 }, // 1 hvit (kjølig lysrør)
  { hex: '#ffe8a8', light: '#ffe2a8', power: 0.25 }, // 2 varm
  { hex: '#c8a838', light: '#d8b860', power: 0.1 }, // 3 svak/gulnet
];

export const PANEL_NAMES = [null, 'White', 'Warm', 'Dim'];

/** Panelet ligger 2 mm under taket; lyset 10 cm under. */
export const PANEL_INSET = 0.002;

/** Ruter som kan ha panel: der man står, men ikke i en døråpning (overliggeren er der). */
export const panelTile = (tile) => canHaveLight(tile) && tile !== TILE.DOOR;

/** Rutene med panel: [{ x, z, type, ceil }]. */
export function panelCells(level) {
  const out = [];
  const { w, h, panels, tiles } = level;
  if (!panels?.some((v) => v)) return out;
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const type = panels[z * w + x];
      if (!PANEL_COLORS[type] || !panelTile(tiles[z * w + x])) continue;
      const ceil = ceilingAt(level, x, z);
      if (ceil - floorAt(level, x, z) < 0.6) continue;
      out.push({ x, z, type, ceil });
    }
  }
  return out;
}

/** Lyskilder for bakingen: én per rute, midt i ruten 10 cm under panelet (hex = lysfargen). */
export function panelLights(level) {
  return panelCells(level).map(({ x, z, type, ceil }) => {
    const c = PANEL_COLORS[type];
    return { cx: x, cz: z, x: x + 0.5, z: z + 0.5, y: ceil - 0.1, ceil, state: LIGHT.ON, group: 0, object: true, power: c.power, hex: c.light };
  });
}

/** Setter paneltypen `v` (0 = fjern) på rutene blant `indices` som kan ha panel. */
export function paintPanels(level, indices, v) {
  let changed = 0;
  for (const i of indices) {
    if (!panelTile(level.tiles[i]) || level.panels[i] === v) continue;
    level.panels[i] = v;
    changed++;
  }
  return changed;
}
