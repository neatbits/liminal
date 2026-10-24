// A column placed in a pool keeps water around its circular footprint.
import { TILE, getTile } from './level.js';

export const PILLAR_WATER = 4;
const SIDES = [[-1,0],[1,0],[0,-1],[0,1]];

export function submergedPillar(level,x,z) {
  if(level.theme!=='pool'||getTile(level,x,z)!==TILE.PILLAR)return false;
  const i=z*level.w+x;
  if(level.meta[i]&PILLAR_WATER)return true;
  // Older rooms did not record the original water tile. Recognise isolated pool columns.
  return !level.floors[i] && SIDES.every(([dx,dz])=>getTile(level,x+dx,z+dz)===TILE.WATER);
}

export function waterCell(level,x,z) {
  return getTile(level,x,z)===TILE.WATER || submergedPillar(level,x,z);
}

/** Older columns inherit the local pool depth when their own depth layer is empty. */
export function pillarPoolDepth(level,x,z) {
  const own=level.depths[z*level.w+x];
  if(own)return own/10;
  const depths=SIDES.filter(([dx,dz])=>getTile(level,x+dx,z+dz)===TILE.WATER)
    .map(([dx,dz])=>level.depths[(z+dz)*level.w+x+dx]/10||level.waterDepth);
  return depths.length?depths.reduce((a,b)=>a+b,0)/depths.length:level.waterDepth;
}
