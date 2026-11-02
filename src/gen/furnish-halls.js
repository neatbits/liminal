// Møbler i hallene i Level 0 (gen/level0-layouts.js, se gen/furnish-rooms.js): mørke vinduer på veggen mot nabohallen,
// ventiler i gulvet langs langveggene og en klynge trestoler i den ene enden – som om noen glemte å rydde etter et
// møte. Ellers ingenting. Ren logikk.
import { randInt } from '../core/rng.js';
import { put } from './furnish-sets.js';

const MAX_CHAIRS = 14;

function hall(level, rand, r) {
  const A = r.alongX;
  const [u0, u1, v0, v1] = A ? [r.x0, r.x1, r.z0, r.z1] : [r.z0, r.z1, r.x0, r.x1];
  const at = (u, v) => (A ? [u, v] : [v, u]);
  const free = (u, v) => { const [x, z] = at(u, v); return !r.fronts.has(z * level.w + x); };
  // Forsiden bort fra veggen på den siden (dv = −1: v0, 1: v1), og langs hallen (du).
  const fromWall = (dv) => (A ? (dv > 0 ? 2 : 0) : dv > 0 ? 1 : 3);
  const along = (du) => (A ? (du > 0 ? 3 : 1) : du > 0 ? 0 : 2);
  if (r.windows) {
    const row = r.windows > 0 ? v1 : v0;
    for (let u = u0 + randInt(rand, 3, 6); u <= u1 - 3; u += randInt(rand, 8, 14)) if (free(u, row)) put(level, 'darkwindow', ...at(u, row), fromWall(r.windows));
  }
  for (const row of [v0, v1]) {
    for (let u = u0 + randInt(rand, 2, 6); u <= u1 - 2; u += randInt(rand, 8, 13)) if (free(u, row)) put(level, 'floorvent', ...at(u, row), A ? 0 : 1);
  }
  if (rand() < 0.25) return; // av og til ingen stoler i det hele tatt
  const rows = randInt(rand, 2, 3);
  const cols = Math.min(randInt(rand, 3, 5), v1 - v0 - 1);
  const mid = Math.floor((v0 + v1) / 2);
  const face = along(-r.end); // vendt innover i hallen
  let n = 0;
  for (let k = 0; k < rows; k++) {
    const u = r.end > 0 ? u1 - 2 - k : u0 + 2 + k;
    for (let c = 0; c < cols && n < MAX_CHAIRS; c++) {
      if (rand() < 0.18) continue; // en og annen mangler
      const v = mid - Math.floor(cols / 2) + c;
      if (free(u, v) && put(level, 'woodenchair', ...at(u, v), rand() < 0.12 ? randInt(rand, 0, 3) : face)) n++;
    }
  }
}

export const HALL_ROOMS = { hall };
