// Shared pillar footprint. Poolrooms uses cylinders; other themes keep square columns.
// Bits 0–1 select diameter; bit 2 preserves a Poolrooms water base (pillar-water.js).
import { TILE, PILLAR_SIZE, getTile, setTile } from './level.js';
import { PILLAR_WATER, submergedPillar } from './pillar-water.js';

export const PILLAR_DIAMETERS = [PILLAR_SIZE, 1, 2, 3];
export const PILLAR_REACH = 1.5;

export function pillarInfo(level, x, z) {
  if (getTile(level, x, z) !== TILE.PILLAR) return null;
  const diameter = PILLAR_DIAMETERS[level.meta[z * level.w + x]&3] ?? PILLAR_SIZE;
  return { x: x + .5, z: z + .5, radius: diameter / 2, round: level.theme === 'pool' };
}

export function pillarTouchesBox(p, box, margin = 0) {
  const r = p.radius + margin;
  if (!p.round) return p.x + r > box[0] && p.x - r < box[2] && p.z + r > box[1] && p.z - r < box[3];
  const dx = p.x - Math.max(box[0], Math.min(p.x, box[2]));
  const dz = p.z - Math.max(box[1], Math.min(p.z, box[3]));
  return dx * dx + dz * dz < r * r - 1e-9;
}

export function pillarsNear(level, x, z, reach = 0) {
  const out = [], r = PILLAR_REACH + reach;
  for (let cz = Math.max(0, Math.floor(z - r)); cz <= Math.min(level.h - 1, Math.floor(z + r)); cz++) {
    for (let cx = Math.max(0, Math.floor(x - r)); cx <= Math.min(level.w - 1, Math.floor(x + r)); cx++) {
      const p = pillarInfo(level, cx, cz);
      if (p) out.push(p);
    }
  }
  return out;
}

export function pillarContains(level, x, z, margin = 0) {
  return pillarsNear(level, x, z, margin).some(p => pillarTouchesBox(p, [x,z,x,z], margin));
}

export function pillarsTouchBox(level, box) {
  const x = (box[0] + box[2]) / 2, z = (box[1] + box[3]) / 2;
  return pillarsNear(level, x, z, Math.max(box[2]-box[0], box[3]-box[1])/2).some(p => pillarTouchesBox(p, box));
}

/** Only place wide columns where their full footprint fits, with walking space at walls. */
export function setPillar(level, x, z, diameter = PILLAR_SIZE) {
  const code = PILLAR_DIAMETERS.indexOf(diameter);
  if (code < 0 || ![TILE.FLOOR,TILE.WATER,TILE.PILLAR].includes(getTile(level,x,z))) return 0;
  const p = { x:x+.5, z:z+.5, radius:diameter/2, round:level.theme==='pool' };
  const reach = Math.ceil(p.radius + PILLAR_REACH + .3);
  for (let cz=z-reach;cz<=z+reach;cz++) for(let cx=x-reach;cx<=x+reach;cx++) {
    if(cx===x&&cz===z)continue;
    const t=getTile(level,cx,cz);
    if([TILE.WALL,TILE.DOOR,TILE.STAIRS].includes(t) && pillarTouchesBox(p,[cx,cz,cx+1,cz+1],.3))return 0;
    const other=pillarInfo(level,cx,cz);
    if(other && pillarTouchesBox(other,[p.x-p.radius,p.z-p.radius,p.x+p.radius,p.z+p.radius],.3))return 0;
  }
  const wet=level.theme==='pool'&&(getTile(level,x,z)===TILE.WATER||submergedPillar(level,x,z));
  const meta=code|(wet?PILLAR_WATER:0),i=z*level.w+x,changed=setTile(level,x,z,TILE.PILLAR);
  if(!changed && level.meta[i]===meta)return 0;
  level.meta[i]=meta;
  return 1;
}
