// Romlige oppslag for lys. Kandidater deles mellom prøver som dekker samme bøtter;
// eksakt avstand og siktlinje sjekkes fortsatt i lysfeltet. Ingen DOM eller three.js.
import { LIGHT } from '../core/level.js';

// Vanlige rutenettpunkter får en eksakt tallnøkkel i stedet for en lang streng.
// Avrund aldri vilkårlige modellpunkter eller normaler: de bruker tapsfri strengnøkkel.
export function lightSampleKey(x, y, z, nx, ny, nz) {
  const ix = x * 20;
  const iy = y * 20 + 1024;
  const iz = z * 20;
  const normal = ny === 0 && nz === 0 && Math.abs(nx) === 1 ? (nx + 1) / 2
    : nx === 0 && nz === 0 && Math.abs(ny) === 1 ? 2 + (ny + 1) / 2
      : nx === 0 && ny === 0 && Math.abs(nz) === 1 ? 4 + (nz + 1) / 2 : -1;
  if (normal >= 0 && Number.isInteger(ix) && Number.isInteger(iy) && Number.isInteger(iz)
      && ix / 20 === x && (iy - 1024) / 20 === y && iz / 20 === z
      && ix >= 0 && ix < 8192 && iy >= 0 && iy < 2048 && iz >= 0 && iz < 8192) {
    return ((ix * 2048 + iy) * 8192 + iz) * 6 + normal;
  }
  return `${x},${y},${z},${nx},${ny},${nz}`;
}

export function lightGrid(level, lights) {
  const B = 4;
  const w = Math.ceil(level.w / B);
  const h = Math.ceil(level.h / B);
  const buckets = Array.from({ length: w * h }, () => []);
  for (const light of lights) {
    if (light.state === LIGHT.BROKEN) continue;
    buckets[Math.floor(light.cz / B) * w + Math.floor(light.cx / B)].push(light);
  }
  const cache = new Map();
  return (x, z, radius) => {
    const x0 = Math.max(0, Math.floor((x - radius) / B));
    const x1 = Math.min(w - 1, Math.floor((x + radius) / B));
    const z0 = Math.max(0, Math.floor((z - radius) / B));
    const z1 = Math.min(h - 1, Math.floor((z + radius) / B));
    const key = `${x0},${x1},${z0},${z1}`;
    if (cache.has(key)) return cache.get(key);
    const out = [];
    for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++) out.push(...buckets[bz * w + bx]);
    // Begrens minnebruken også ved lange turer og vilkårlige spørreradier.
    if (cache.size >= 512) cache.delete(cache.keys().next().value);
    cache.set(key, out);
    return out;
  };
}

/** Samme nabotall som en parvis avstandstest, med høyst 29 oppslag per vindu. */
export function windowNeighbours(level, windows) {
  const grid = new Uint8Array(level.w * level.h);
  for (const win of windows) grid[win.z * level.w + win.x] = 1;
  return windows.map((win) => {
    let near = 0;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const x = win.x + dx;
      const z = win.z + dz;
      if (dx * dx + dz * dz <= 9 && x >= 0 && z >= 0 && x < level.w && z < level.h) near += grid[z * level.w + x];
    }
    return near;
  });
}
