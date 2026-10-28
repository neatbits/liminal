// Small receiver-clipped contact footprints; no dynamic light or extra render pass.
import { TILE, getTile } from './level.js';
import { floorAt } from './heights.js';
import { OBJECTS, objectBox } from './objects.js';
import { cornerShape } from './corners.js';

export const SHADOW_KINDS = ['box', 'round', 'legs'];
const ROUND = new Set(['pottedplant', 'pottedpalm', 'pottedtree', 'yucca', 'palmplant', 'cafe', 'softcylinder', 'playball']);
const LEGS = new Set([
  'desk',
  'desk2',
  'moderndesk',
  'table',
  'schooldesk',
  'tvbench',
  'mallbench',
  'dinerchair',
  'plasticchair',
  'officechair',
  'waitingchairs',
]);
export const shadowKind = id => (ROUND.has(id) ? 'round' : LEGS.has(id) ? 'legs' : 'box');

/** x/z are normalized from -1 to 1 across the complete soft footprint. */
export function shadowAlpha(kind, x, z) {
  const fade = (d, edge, blur) => Math.max(0, Math.min(1, (edge + blur - d) / blur));
  const radius = Math.hypot(x, z);
  if (kind === 'round') return Math.exp(-radius * radius * 4.5) * fade(radius, 0.75, 0.25) * 0.48;
  const box = Math.hypot(Math.max(Math.abs(x) - 0.54, 0), Math.max(Math.abs(z) - 0.54, 0));
  const body = fade(box, 0, 0.46);
  if (kind === 'box') return body * body * 0.42;
  let feet = 0;
  for (const a of [-0.6, 0.6])
    for (const b of [-0.6, 0.6]) feet = Math.max(feet, Math.exp(-((x - a) ** 2 + (z - b) ** 2) * 55));
  return Math.min(0.5, body * 0.11 + feet * 0.36);
}

const clip = (a, b) => [
  Math.max(a[0], b[0]),
  Math.max(a[1], b[1]),
  Math.min(a[2], b[2]),
  Math.min(a[3], b[3]),
];
const valid = b => b[2] - b[0] > 0.001 && b[3] - b[1] > 0.001;

export function contactShadowPlan(level, o, poseOf) {
  const def = OBJECTS[o.id];
  if (!def || def.mount || getTile(level, o.x, o.z) === TILE.WATER) return null;
  const p = poseOf(o);
  const box = [p.x - p.w * 0.65, p.z - p.d * 0.65, p.x + p.w * 0.65, p.z + p.d * 0.65];
  let y = floorAt(level, o.x, o.z),
    receiver = null;
  for (const q of level.objects ?? []) {
    if (q === o) continue;
    const d = OBJECTS[q.id];
    if (!d?.surface && !d?.soft) continue;
    const s = poseOf(q),
      top = s.y + (d.surface ?? s.h),
      bounds = objectBox(s);
    if (
      Math.abs(top - p.y) > 0.015 ||
      top <= y ||
      p.x < bounds[0] ||
      p.x > bounds[2] ||
      p.z < bounds[1] ||
      p.z > bounds[3]
    )
      continue;
    y = top;
    receiver = bounds;
  }
  let patches = [];
  if (receiver) patches = [clip(box, receiver)].filter(valid);
  else
    for (let z = Math.floor(box[1]); z <= Math.floor(box[3]); z++)
      for (let x = Math.floor(box[0]); x <= Math.floor(box[2]); x++) {
        if (
          getTile(level, x, z) !== TILE.FLOOR ||
          Math.abs(floorAt(level, x, z) - y) > 0.015 ||
          cornerShape(level, x, z)
        )
          continue;
        const patch = clip(box, [x, z, x + 1, z + 1]);
        if (valid(patch)) patches.push(patch);
      }
  if (!patches.length) return null;
  // Moving bodies keep a complete footprint; their receiver is updated by SoftPlay.
  if (def.soft || def.loose) patches = [box];
  return { kind: shadowKind(o.id), x: p.x, z: p.z, y, box, patches };
}
