import { TILE, setTile } from '../core/level.js';
import { setPillar } from '../core/pillars.js';
import { submergedPillar } from '../core/pillar-water.js';

export function paintPillars(level,cells,diameter=.5,erase=false) {
  let changed=0;
  for(const [x,z] of cells) {
    changed+=erase?Number(setTile(level,x,z,submergedPillar(level,x,z)?TILE.WATER:TILE.FLOOR)):setPillar(level,x,z,diameter);
  }
  return changed;
}
