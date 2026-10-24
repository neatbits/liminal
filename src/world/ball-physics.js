// Kollisjonsunderlag for de få ekte lekeballene. Ballmassens volum er fortsatt tegnet.
import * as CANNON from 'cannon-es';
import { TILE, getTile } from '../core/level.js';
import { OBJECTS } from '../core/objects.js';
import { getTheme } from '../core/themes.js';
import { pitBallSupport } from '../core/play-balls.js';

export const BALL_GROUP = 2;

export function ballMaterial(world) {
  const material = new CANNON.Material('playball');
  world.addContactMaterial(new CANNON.ContactMaterial(material, world.defaultMaterial, { friction: 0.3, restitution: OBJECTS.playball.loose.restitution }));
  world.addContactMaterial(new CANNON.ContactMaterial(material, material, { friction: 0.2, restitution: 0.42 }));
  return material;
}

export function addBallSupport(world, level, poseOf) {
  if (getTheme(level.theme).pit === 'balls' && level.tiles.includes(TILE.WATER)) {
    const step = 0.5;
    const data = [];
    // Heightfield bruker lokalt XY-plan med høyde langs Z; roteres til verdens XZ-plan.
    for (let ix = 0; ix <= level.w / step; ix++) {
      const row = [], x = ix * step;
      for (let iz = 0; iz <= level.h / step; iz++) {
        const z = level.h - iz * step;
        const water = [-0.001, 0.001].some((dx) => [-0.001, 0.001].some((dz) =>
          getTile(level, Math.floor(x + dx), Math.floor(z + dz)) === TILE.WATER));
        // Utenfor ballbingene ligger dette ekstra underlaget under det vanlige gulvet.
        row.push(water ? pitBallSupport(x, z) : -4);
      }
      data.push(row);
    }
    const bed = new CANNON.Body({ mass: 0, collisionFilterMask: BALL_GROUP,
      shape: new CANNON.Heightfield(data, { elementSize: step }) });
    bed.position.z = level.h;
    bed.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(bed);
  }
  // Enkle bokser for faste møbler, bare mot baller (ikke en ny hindring for gåeren).
  for (const o of level.objects) {
    const def = OBJECTS[o.id];
    if (!def || def.soft || def.loose || def.floats || def.mount) continue;
    const p = poseOf(o);
    const body = new CANNON.Body({ mass: 0, collisionFilterMask: BALL_GROUP,
      shape: new CANNON.Box(new CANNON.Vec3(p.w / 2, p.h / 2, p.d / 2)) });
    body.position.set(p.x, p.y + p.h / 2, p.z);
    world.addBody(body);
  }
}
