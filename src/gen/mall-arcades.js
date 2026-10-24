// Perpendicular courts connect galleries to quiet return arcades behind the shops.
import { TILE } from '../core/level.js';
import { fillRect } from './util.js';

export function arcadeLayout(level,shop) {
  return level.w>=40 && shop>=7 ? {north:5,south:level.h-6,x0:5,x1:level.w-6} : null;
}

export function prepareArcades(level,layout) {
  if(!layout)return;
  fillRect(level,2,layout.north-1,level.w-3,layout.north-1,TILE.WALL);
  fillRect(level,2,layout.south+1,level.w-3,layout.south+1,TILE.WALL);
  // Connect both ends as well, so the return arcades form walkable loops.
  fillRect(level,2,1,layout.x0-1,level.h-2,TILE.FLOOR);
  fillRect(level,layout.x1+1,1,level.w-3,level.h-2,TILE.FLOOR);
}

export function openArcadeCourt(level,s,north) {
  const back=north?1:level.h-2;
  fillRect(level,s.x0,s.front,s.x1,back,TILE.FLOOR);
  for(let z=Math.min(s.front,back);z<=Math.max(s.front,back);z++) for(let x=s.x0;x<=s.x1;x++) {
    const i=z*level.w+x;level.meta[i]=0;level.finish[i]=0;
  }
}
