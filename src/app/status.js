// Tekstene appen viser om rommet: statuslinjen for verktøy, rommerket og rutens info.
import { TILE, inBounds } from '../core/level.js';
import { ceilingAt, depthAt, floorAt, stairSpan, deckAt } from '../core/heights.js';
import { DOOR, doorInfo } from '../core/doors.js';
import { slidesAt, slidePath } from '../core/slides.js';
import { OBJECTS, objectsAt } from '../core/objects.js';
import { SHAPES } from '../editor/tools.js';
import { $ } from '../ui/dom.js';

const NAMES = {
  [TILE.WALL]: 'Wall',
  [TILE.FLOOR]: 'Floor',
  [TILE.WATER]: 'Water',
  [TILE.PILLAR]: 'Pillar',
  [TILE.DOOR]: 'Doorway',
  [TILE.STAIRS]: 'Stairs',
};
const DOOR_NAMES = { [DOOR.CLOSED]: 'Closed', [DOOR.AJAR]: 'Ajar', [DOOR.OPEN]: 'Open' };
const m = (v) => `${+v.toFixed(1)} m`;

/** «x 3 m · y 4 m · Water · 1.5 m deep · ceiling 2.7 m» for ruten under pekeren. */
export function hoverText(level, cell) {
  if (!cell || !level || !inBounds(level, cell[0], cell[1])) return '';
  const [x, z] = cell;
  const tile = level.tiles[z * level.w + x];
  const parts = [`x ${x} m`, `y ${z} m`, NAMES[tile]];
  const door = doorInfo(level, x, z);
  if (door?.state) parts.push(door.oneSided ? `${DOOR_NAMES[door.state]} door to nowhere` : `${DOOR_NAMES[door.state]} door`);
  if (tile === TILE.WATER) parts.push(`${m(depthAt(level, x, z))} deep`);
  if (tile === TILE.STAIRS) {
    const { bottom, top } = stairSpan(level, x, z);
    parts.push(`${+bottom.toFixed(1)}–${m(top)}`);
  } else if (tile !== TILE.WALL && tile !== TILE.WATER && floorAt(level, x, z) > 0) {
    parts.push(`floor ${m(floorAt(level, x, z))}`);
  }
  if (deckAt(level, x, z)) parts.push(`deck ${m(deckAt(level, x, z))}`);
  if (tile !== TILE.WALL && tile !== TILE.WATER && level.finish[z * level.w + x]) parts.push('tiled');
  for (const i of slidesAt(level, x, z)) {
    const path = slidePath(level, level.slides[i]);
    parts.push(path.problem ? `slide: ${path.problem}` : `${path.color} ${path.tube ? 'tube slide' : 'slide'} from ${m(path.h0)}`);
  }
  for (const i of objectsAt(level, x, z)) parts.push(OBJECTS[level.objects[i].id]?.label ?? 'object');
  if (tile !== TILE.WALL) parts.push(`ceiling ${m(ceilingAt(level, x, z))}`);
  return parts.join(' · ');
}

export function toolText({ tool, shape, brush, zone, doorState, slideTube, slideColor, objectId }) {
  if (tool.kind === 'spawn') return `${tool.label} · click and drag to aim`;
  if (tool.kind === 'door') return `${tool.label} (${DOOR_NAMES[doorState].toLowerCase()}) · click a wall or doorway`;
  if (tool.kind === 'object') return `${tool.label} (${OBJECTS[objectId]?.label}) · click a floor cell, click again to turn`;
  if (tool.kind === 'stairs') return `${tool.label} · drag from bottom to top, ${brush} m wide`;
  if (tool.kind === 'slide') return `${tool.label} (${slideColor} ${slideTube ? 'tube' : 'open'}) · drag from a raised floor to the water`;
  const shapeLabel = SHAPES.find((s) => s.id === shape)?.label;
  const label = tool.kind === 'zone' && tool.layer !== 'finish' ? `${tool.label} ${m(zone[tool.layer])}` : tool.label;
  return `${label} · ${shapeLabel}, ${brush} m`;
}

export function renderBadge(level, dirty) {
  const badge = $('#room-badge');
  badge.replaceChildren();
  const b = document.createElement('b');
  b.textContent = level.name;
  badge.append(b, ` · ${level.w} × ${level.h} m · ceiling ${level.height} m${dirty ? ' · unsaved' : ''}`);
}
