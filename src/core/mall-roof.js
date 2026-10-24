// Atrium skylight inferred from actual open/deck footprints, including old rooms.
import { TILE } from './level.js';
import { ceilingAt, deckAt } from './heights.js';

export function mallRoof(level) {
  if (level.theme !== 'mall') return null;
  let x0=level.w,z0=level.h,x1=-1,z1=-1,base=Infinity;
  for(let z=1;z<level.h-1;z++) for(let x=1;x<level.w-1;x++) {
    const i=z*level.w+x,t=level.tiles[i];
    if (![TILE.FLOOR,TILE.WATER,TILE.STAIRS].includes(t) || level.finish[i] || deckAt(level,x,z) || ceilingAt(level,x,z)<6) continue;
    x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);
    base=Math.min(base,ceilingAt(level,x,z));
  }
  if(x1-x0<7 || z1-z0<2) return null;
  const mask=new Uint8Array(level.w*level.h);
  for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++) {
    const i=z*level.w+x;
    if(level.tiles[i]!==TILE.WALL && !level.finish[i] && Math.abs(ceilingAt(level,x,z)-base)<.05) mask[i]=1;
  }
  return {x0,z0,x1:x1+1,z1:z1+1,base,rise:Math.min(1.6,(z1-z0+1)*.18),mask};
}

export function roofHeight(roof,z) {
  const mid=(roof.z0+roof.z1)/2;
  return roof.base+roof.rise*Math.max(0,1-Math.abs(z-mid)/((roof.z1-roof.z0)/2));
}
