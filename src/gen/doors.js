// Dører i genererte rom: dørblad i døråpninger og lukkede dører i vegger.
import { TILE, getTile } from '../core/level.js';
import { DOOR, canHoldDoor, setDoor } from '../core/doors.js';

/** Henger dørblad i alle døråpningene (eller bare `cells`) etter vektene; resten blir åpninger. */
export function hangDoors(level, rand, { closed = 0.3, ajar = 0.3, open = 0.3, cells = null } = {}) {
  const list = cells ?? [];
  if (!cells) for (let i = 0; i < level.tiles.length; i++) if (level.tiles[i] === TILE.DOOR) list.push([i % level.w, (i / level.w) | 0]);
  for (const [x, z] of list) {
    const r = rand();
    if (r < closed) setDoor(level, x, z, DOOR.CLOSED);
    else if (r < closed + ajar) setDoor(level, x, z, DOOR.AJAR);
    else if (r < closed + ajar + open) setDoor(level, x, z, DOOR.OPEN);
  }
}

/**
 * Setter inn lukkede dører i vegger med gulv på den ene siden. nowhere: bare der det er vegg
 * på den andre siden (boder, «dører til ingensteds»); ellers bare der det er gulv på begge.
 * Dørene holder minst minGap ruter avstand. Returnerer antall dører.
 */
export function doorsInWalls(level, rand, chance, { nowhere = true, minGap = 4 } = {}) {
  const placed = [];
  for (let z = 1; z < level.h - 1; z++) {
    for (let x = 1; x < level.w - 1; x++) {
      if (getTile(level, x, z) !== TILE.WALL || !canHoldDoor(level, x, z)) continue;
      const pz = getTile(level, x - 1, z) === TILE.WALL && getTile(level, x + 1, z) === TILE.WALL;
      const a = pz ? getTile(level, x, z - 1) : getTile(level, x - 1, z);
      const b = pz ? getTile(level, x, z + 1) : getTile(level, x + 1, z);
      const floors = (a === TILE.FLOOR) + (b === TILE.FLOOR);
      const walls = (a === TILE.WALL) + (b === TILE.WALL);
      if (nowhere ? floors !== 1 || walls !== 1 : floors !== 2) continue;
      if (rand() >= chance) continue;
      if (placed.some(([px, pz2]) => Math.abs(px - x) + Math.abs(pz2 - z) < minGap)) continue;
      setDoor(level, x, z, DOOR.CLOSED);
      placed.push([x, z]);
    }
  }
  return placed.length;
}
