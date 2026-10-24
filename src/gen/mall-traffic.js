// Keep furniture clear of the escalator approaches and open shop entrances.
import { escalatorRuns } from '../core/escalators.js';
import { TILE, getTile } from '../core/level.js';
import { isShopfront } from '../core/shopfronts.js';

export function mallTraffic(level) {
  const runs = escalatorRuns(level);
  let rear=0;
  for(let x=2;x<level.w-2;x++)if(getTile(level,x,2)===TILE.FLOOR && !level.finish[2*level.w+x] && level.decks[2*level.w+x])rear++;
  const arcades=level.w>=40 && rear>level.w*.7;
  // Keep a three-metre spine through aligned cross courts, inferred from actual floors.
  const through=new Set();let start=-1;
  for(let x=5;x<=level.w-5;x++) {
    let clear=x<level.w-5;
    for(let z=2;clear&&z<level.h-2;z++)if(getTile(level,x,z)!==TILE.FLOOR||level.finish[z*level.w+x])clear=false;
    if(clear&&start<0)start=x;
    if(!clear&&start>=0){if(x-start>=3){const mid=Math.floor((start+x-1)/2);for(let k=mid-1;k<=mid+1;k++)through.add(k);}start=-1;}
  }
  return ([x, z]) => {
    if(through.has(x))return true;
    if(arcades && (x<=4 || x>=level.w-5 || z<=3 || z>=level.h-4))return true;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (getTile(level, x + dx, z + dz) === TILE.FLOOR && isShopfront(level, x + dx, z + dz)) return true;
    }
    return runs.some(r => {
      const along = (x + 0.5 - r.origin[0]) * r.dir[0] + (z + 0.5 - r.origin[1]) * r.dir[1];
      const across = (x + 0.5 - r.origin[0]) * -r.dir[1] + (z + 0.5 - r.origin[1]) * r.dir[0];
      return along >= -5 && along <= r.length + 3 && across >= -r.width - 1.5 && across <= r.width + 1.5;
    });
  };
}
