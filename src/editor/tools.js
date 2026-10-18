// Verktøyene i 2D-skissen og hva de gjør med rommet. Ren logikk (testbar).
import { TILE, LIGHT, setLight, canHaveLight } from '../core/level.js';
import {
  brushCells,
  lineCells,
  paintTiles,
  paintLights,
  rectIndices,
  fillTiles,
  floodFillTile,
  openRegion,
  autoLights,
  clearLights,
} from '../core/ops.js';
import { yawFromDir } from '../core/spawn.js';
import { paintZone, fillZone, floodFillZone } from '../core/zones.js';
import { setDoor } from '../core/doors.js';
import { placeStairs, removeStairs } from '../core/stairs.js';
import { addSlide, removeSlidesAt } from '../core/slides.js';
import { placeObject } from '../core/objects.js';

// Soneverktøyene (kind 'zone') maler en høyde i meter, og dørverktøyet (kind 'door') setter
// inn dører med en tilstand (DOOR); editoren gir dem `value` før bruk. Dørverktøyet virker
// alltid på én rute (det samme gjør objektverktøyet, med en gjenstand fra OBJECTS som `value`),
// og trappe- og skliverktøyet (kind 'stairs' / 'slide') på en dragning,
// uansett form.
export const TOOLS = [
  { id: 'floor', label: 'Floor', key: '1', kind: 'tile', value: TILE.FLOOR, erase: TILE.WALL },
  { id: 'wall', label: 'Wall', key: '2', kind: 'tile', value: TILE.WALL, erase: TILE.FLOOR },
  { id: 'water', label: 'Water', key: '3', kind: 'tile', value: TILE.WATER, erase: TILE.FLOOR },
  { id: 'pillar', label: 'Pillar', key: '4', kind: 'tile', value: TILE.PILLAR, erase: TILE.FLOOR },
  { id: 'door', label: 'Doorway', key: '5', kind: 'tile', value: TILE.DOOR, erase: TILE.WALL },
  { id: 'light', label: 'Light', key: '6', kind: 'light', value: LIGHT.ON },
  { id: 'flicker', label: 'Flickering', key: '7', kind: 'light', value: LIGHT.FLICKER },
  { id: 'broken', label: 'Broken light', key: '8', kind: 'light', value: LIGHT.BROKEN },
  { id: 'spawn', label: 'Spawn point', key: '9', kind: 'spawn' },
  { id: 'ceiling', label: 'Ceiling', key: 'C', kind: 'zone', layer: 'ceiling' },
  { id: 'depth', label: 'Depth', key: 'D', kind: 'zone', layer: 'depth' },
  { id: 'leaf', label: 'Door', key: 'O', kind: 'door' },
  { id: 'raise', label: 'Raise', key: 'H', kind: 'zone', layer: 'floor' },
  { id: 'stairs', label: 'Stairs', key: 'S', kind: 'stairs' },
  { id: 'tiles', label: 'Tiles', key: 'T', kind: 'zone', layer: 'finish' },
  { id: 'slide', label: 'Slide', key: 'L', kind: 'slide' },
  { id: 'deck', label: 'Deck', key: 'K', kind: 'zone', layer: 'deck' },
  { id: 'object', label: 'Object', key: 'J', kind: 'object' },
];

export const SHAPES = [
  { id: 'brush', label: 'Brush', key: 'B' },
  { id: 'rect', label: 'Rectangle', key: 'R' },
  { id: 'fill', label: 'Fill', key: 'F' },
];

export function toolById(id) {
  return TOOLS.find((t) => t.id === id) ?? TOOLS[0];
}

/** Pensel på én rute. Lysverktøy setter ett lys (penselstørrelse gjelder bare viskelær). */
export function paintAt(level, tool, x, z, brush, erase) {
  if (tool.kind === 'tile') return paintTiles(level, brushCells(x, z, brush), erase ? tool.erase : tool.value);
  if (tool.kind === 'zone') return paintZone(level, tool.layer, brushCells(x, z, brush), erase ? 0 : tool.value);
  if (tool.kind === 'door') return setDoor(level, x, z, tool.value, erase);
  if (tool.kind === 'object') return placeObject(level, x, z, tool.value, erase);
  if (tool.kind === 'light') {
    if (erase) return paintLights(level, brushCells(x, z, brush), LIGHT.NONE);
    return setLight(level, x, z, tool.value) ? 1 : 0;
  }
  return 0;
}

/** Pensel langs en linje (så raske musebevegelser ikke etterlater hull). */
export function paintLine(level, tool, from, to, brush, erase) {
  let n = 0;
  for (const [x, z] of lineCells(from[0], from[1], to[0], to[1])) n += paintAt(level, tool, x, z, brush, erase);
  return n;
}

/** Rektangel: fyller ruter, eller legger lys i jevnt mønster innenfor rektangelet. */
export function applyRect(level, tool, rect, erase, spacing) {
  const cells = rectIndices(level, rect);
  if (tool.kind === 'tile') return fillTiles(level, cells, erase ? tool.erase : tool.value);
  if (tool.kind === 'zone') return fillZone(level, tool.layer, cells, erase ? 0 : tool.value);
  if (tool.kind === 'light') {
    if (erase) return clearLights(level, cells);
    const region = cells.filter((i) => canHaveLight(level.tiles[i]));
    return autoLights(level, { region, spacing, state: tool.value });
  }
  return 0;
}

/** Fyll: bytter sammenhengende flate eller sone, eller fyller et helt rom med lys. */
export function applyFill(level, tool, x, z, erase, spacing) {
  if (tool.kind === 'tile') return floodFillTile(level, x, z, erase ? tool.erase : tool.value);
  if (tool.kind === 'zone') return floodFillZone(level, tool.layer, x, z, erase ? 0 : tool.value);
  if (tool.kind === 'light') {
    const region = openRegion(level, x, z);
    if (erase) return clearLights(level, region);
    return autoLights(level, { region, spacing, state: tool.value });
  }
  return 0;
}

/** Trappeverktøyet: et trappeløp fra a (bunn) til b (topp), `width` ruter bredt. */
export function applyStairs(level, a, b, width, erase) {
  return erase ? removeStairs(level, a, b, width) : placeStairs(level, a, b, width);
}

/**
 * Bygger sklieruten mens man drar: legger til ruter langs linjen fra forrige rute, og går
 * man tilbake over forrige rute, fjernes den (man kan «angre» deler av ruten underveis).
 */
export function extendSlidePath(points, cell) {
  const last = points[points.length - 1];
  for (const c of lineCells(last[0], last[1], cell[0], cell[1]).slice(1)) {
    const prev = points[points.length - 2];
    if (prev && prev[0] === c[0] && prev[1] === c[1]) points.pop();
    else points.push(c);
  }
  return points;
}

/** Skliverktøyet: ny sklie langs ruten, eller (viskelær) fjern sklier over startruten. */
export function applySlide(level, points, { tube, color }, erase) {
  return erase ? removeSlidesAt(level, points[0][0], points[0][1]) : addSlide(level, points, tube, color);
}

/** Plasserer startpunktet midt i ruten under pekeren. */
export function placeSpawn(level, wx, wz) {
  const x = Math.min(level.w - 0.5, Math.max(0.5, Math.floor(wx) + 0.5));
  const z = Math.min(level.h - 0.5, Math.max(0.5, Math.floor(wz) + 0.5));
  level.spawn = { ...level.spawn, x, z };
}

/** Snur startpunktet mot pekeren (når man drar etter å ha plassert det). */
export function aimSpawn(level, wx, wz) {
  const dx = wx - level.spawn.x;
  const dz = wz - level.spawn.z;
  if (Math.hypot(dx, dz) < 0.4) return false;
  level.spawn = { ...level.spawn, a: yawFromDir(dx, dz) };
  return true;
}
