// Verktøyene i 2D-skissen og hva de gjør med rommet. Ren logikk (testbar).
import { TILE, LIGHT, setLight, canHaveLight, inBounds, getTile } from '../core/level.js';
import {
  brushCells,
  lineCells,
  paintTiles,
  paintLights,
  rectIndices,
  fillTiles,
  floodFillTile,
  floodRegion,
  openRegion,
  autoLights,
  clearLights,
} from '../core/ops.js';
import { yawFromDir } from '../core/spawn.js';
import { paintZone, fillZone, floodFillZone } from '../core/zones.js';
import { setDoor } from '../core/doors.js';
import { placeStairs, removeStairs, stairCells } from '../core/stairs.js';
import { STAIR_THROUGH } from '../core/heights.js';
import { clearObjects } from '../core/object-pose.js';
import { placeEscalator } from '../core/escalators.js';
import { addSlide, removeSlidesAt } from '../core/slides.js';
import { placeObject } from '../core/objects.js';
import { paintWindows } from '../core/windows.js';
import { setCorner } from '../core/corners.js';
import { paintLeds, ledFillCells } from '../core/leds.js';
import { paintPanels } from '../core/panels.js';
import { paintPillars } from './pillars.js';

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
  { id: 'stairwell', label: 'Stairs up', key: 'U', kind: 'stairs', through: true }, // til etasjen over (core/stairwells.js)
  { id: 'escalator', label: 'Escalator', key: 'E', kind: 'stairs', escalator: true },
  { id: 'tiles', label: 'Floor finish', key: 'T', kind: 'zone', layer: 'finish' },
  { id: 'slide', label: 'Slide', key: 'L', kind: 'slide' },
  { id: 'deck', label: 'Deck', key: 'K', kind: 'zone', layer: 'deck' },
  { id: 'object', label: 'Object', key: 'J', kind: 'object' },
  { id: 'window', label: 'Window', key: 'W', kind: 'window' },
  { id: 'corner', label: 'Corner', key: 'Q', kind: 'corner' }, // skrå/avrundede hjørner (core/corners.js)
  { id: 'led', label: 'LED Strip', key: 'N', kind: 'led' },
  { id: 'panel', label: 'Ceiling panel', key: 'P', kind: 'panel' },
];

export const SHAPES = [
  { id: 'brush', label: 'Brush', key: 'B' },
  { id: 'rect', label: 'Rectangle', key: 'R' },
  { id: 'fill', label: 'Fill', key: 'F' },
];

/** LED-farge / paneltype fra verktøyet (editoren gir `value`), 0 for viskelær. */
const valueOf = (tool, erase) => (erase ? 0 : (tool.value ?? 1));
/** Indeksene til rutene innenfor kartet. */
const indicesIn = (level, cells) => cells.filter(([x, z]) => inBounds(level, x, z)).map(([x, z]) => z * level.w + x);

export function toolById(id) {
  return TOOLS.find((t) => t.id === id) ?? TOOLS[0];
}

/**
 * Pensel på én rute. Lysverktøy setter ett lys (penselstørrelse gjelder bare viskelær). (fx, fz):
 * hvor i ruten man klikket (0–1) – hjørneverktøyet former hjørnet nærmest.
 */
export function paintAt(level, tool, x, z, brush, erase, fx = 0.5, fz = 0.5) {
  if (tool.id === 'pillar') return paintPillars(level, brushCells(x, z, brush), tool.diameter, erase);
  if (tool.kind === 'corner') return setCorner(level, x, z, erase ? 0 : tool.value, fx, fz);
  if (tool.kind === 'tile') return paintTiles(level, brushCells(x, z, brush), erase ? tool.erase : tool.value);
  if (tool.kind === 'zone') return paintZone(level, tool.layer, brushCells(x, z, brush), erase ? 0 : tool.value);
  if (tool.kind === 'door') return setDoor(level, x, z, tool.value, erase);
  if (tool.kind === 'object') return placeObject(level, x, z, tool.value, erase);
  if (tool.kind === 'window') return paintWindows(level, brushCells(x, z, brush), !erase);
  if (tool.kind === 'led') return paintLeds(level, indicesIn(level, brushCells(x, z, brush)), valueOf(tool, erase));
  if (tool.kind === 'panel') return paintPanels(level, indicesIn(level, brushCells(x, z, brush)), valueOf(tool, erase));
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
  if (tool.id === 'pillar') return paintPillars(level, cells.map(i => [i % level.w, Math.floor(i / level.w)]), tool.diameter, erase);
  if (tool.kind === 'tile') return fillTiles(level, cells, erase ? tool.erase : tool.value);
  if (tool.kind === 'zone') return fillZone(level, tool.layer, cells, erase ? 0 : tool.value);
  if (tool.kind === 'window') return paintWindows(level, cells.map((i) => [i % level.w, (i / level.w) | 0]), !erase);
  if (tool.kind === 'led') return paintLeds(level, cells, valueOf(tool, erase));
  if (tool.kind === 'panel') return paintPanels(level, cells, valueOf(tool, erase));
  if (tool.kind === 'light') {
    if (erase) return clearLights(level, cells);
    const region = cells.filter((i) => canHaveLight(level.tiles[i]));
    return autoLights(level, { region, spacing, state: tool.value });
  }
  return 0;
}

/** Fyll: bytter sammenhengende flate eller sone, eller fyller et helt rom med lys. */
export function applyFill(level, tool, x, z, erase, spacing) {
  if (tool.id === 'pillar') {
    const t = level.tiles[z * level.w + x], cells = floodRegion(level, x, z, v => v === t);
    return paintPillars(level, cells.map(i => [i % level.w, Math.floor(i / level.w)]), tool.diameter, erase);
  }
  if (tool.kind === 'tile') return floodFillTile(level, x, z, erase ? tool.erase : tool.value);
  if (tool.kind === 'zone') return floodFillZone(level, tool.layer, x, z, erase ? 0 : tool.value);
  if (tool.kind === 'window') return paintWindows(level, [[x, z]], !erase);
  // LED: Fill i et rom legger stripen langs alle veggene rundt det (en veggrute alene får den selv).
  if (tool.kind === 'led') return paintLeds(level, ledFillCells(level, x, z), valueOf(tool, erase));
  if (tool.kind === 'panel') return paintPanels(level, openRegion(level, x, z), valueOf(tool, erase));
  if (tool.kind === 'light') {
    const region = openRegion(level, x, z);
    if (erase) return clearLights(level, region);
    return autoLights(level, { region, spacing, state: tool.value });
  }
  return 0;
}

/** Trappeverktøyet: et trappeløp fra a (bunn) til b (topp), `width` ruter bredt. */
export function applyStairs(level, a, b, width, erase, { escalator = false, down = false, through = false } = {}) {
  if (erase) return removeStairs(level, a, b, width);
  if (escalator) return placeEscalator(level, a, b, width, down);
  const n = placeStairs(level, a, b, width);
  const cells = stairCells(a, b, width).rows.flat().filter(([x, z]) => getTile(level, x, z) === TILE.STAIRS);
  clearObjects(level, cells.map(([x, z]) => z * level.w + x)); // ingenting står i trappen
  // Trapp opp: løpet merkes og går til etasjen over (core/stairwells.js).
  if (through) for (const [x, z] of cells) level.meta[z * level.w + x] |= STAIR_THROUGH;
  return n;
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
