// Stiger mellom etasjer i 3D (core/ladders.js): to vanger og trinn mot kanten av hullet motsatt utgangen,
// fra gulvet til litt over gulvet i etasjen over (håndtakene). Hullet selv er rundt og uten rekkverk
// (world/holes.js). Rekkverkets materiale. Ren logikk – MeshData med bakt lys.
import { LADDER_TOP, HOLE_R } from '../core/ladders.js';
import { orientedBox } from './mesher.js';
import { beam } from './railings.js';

const FROM_WALL = 0.5 - HOLE_R + 0.1; // stigens midtlinje innenfor kanten av hullet (motsatt utgangen)
const WIDTH = 0.5;
const RAIL = 0.05;
const RUNG = 0.3; // avstand mellom trinnene

/** Stigene i etasjen (level.ladders) i `mesh`. */
export function buildLadders(level, mesh) {
  for (const l of level.ladders ?? []) ladder(mesh, l);
}

function ladder(mesh, { x, z, dir: [dx, dz], gap }) {
  const u = [-dz, dx]; // på tvers av stigen
  const c = [x + 0.5 - dx * (0.5 - FROM_WALL), z + 0.5 - dz * (0.5 - FROM_WALL)];
  const top = gap + LADDER_TOP;
  for (const s of [-1, 1]) {
    const p = [c[0] + (u[0] * s * WIDTH) / 2, c[1] + (u[1] * s * WIDTH) / 2];
    orientedBox(mesh, [p[0] - (u[0] * RAIL) / 2, p[1] - (u[1] * RAIL) / 2], u, RAIL, [dx, dz], -RAIL / 2, RAIL / 2, 0, top);
  }
  for (let y = RUNG; y < gap + 0.05; y += RUNG) {
    const a = [c[0] - (u[0] * WIDTH) / 2, y, c[1] - (u[1] * WIDTH) / 2];
    const b = [c[0] + (u[0] * WIDTH) / 2, y, c[1] + (u[1] * WIDTH) / 2];
    beam(mesh, a, b, 0.035, 0.035);
  }
}
