import { OBJECTS,objectFits,placeObject } from '../core/objects.js';

/** Keep shallow desks for small items, replace them with a deep table when a PC needs it. */
export function deskItem(level,desk,id) {
  if(!OBJECTS[id]?.fullSupport)return placeObject(level,desk.x,desk.z,id);
  const computer={id,x:desk.x,z:desk.z,rot:desk.rot};
  const withPC=[...level.objects,computer];
  if(objectFits({...level,objects:withPC},computer,withPC)) {level.objects=withPC;return 1;}
  const table={...desk,id:'table'},objects=[...level.objects.map(o=>o===desk?table:o),computer];
  const next={...level,objects};
  if(!objectFits(next,table,objects)||!objectFits(next,computer,objects))return 0;
  level.objects=objects;return 1;
}
