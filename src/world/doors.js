// Dører i 3D: karm med profil rundt døråpninger, dørblad (lukket, på gløtt eller åpent) og beslag –
// vridere eller dørknotter, hengsler og sparkeplate (door-hardware.js).
// Ren logikk – lager MeshData med bakt lys; materialene velges i build.js.
import { TILE, DOOR_HEIGHT } from '../core/level.js';
import { floorAt } from '../core/heights.js';
import { DOOR, doorInfo, leafPose } from '../core/doors.js';
import { MeshData, orientedBox } from './mesher.js';
import { handles, hinges, kickPlates } from './door-hardware.js';

const CASING = 0.08; // bredde på karmlisten rundt åpningen
const PROUD = 0.02; // hvor langt listen stikker ut fra veggen
const LINING = 0.012; // foringen inne i åpningen
const LEAF_T = 0.04;
const STOP = 0.035; // dørstopperlisten i karmen som bladet lukker seg mot (skjuler glipen)
const STOP_T = 0.025;
const HANDLE_Y = 1.0;
const BEAD = 0.018; // den hevede kanten ytterst på karmlisten
const BEAD_PROUD = 0.012; // så mye mer den stikker ut

/** Akse-justert boks i dørens lokale akser (a langs veggen, p gjennom åpningen). */
function localBox(mesh, info, a0, a1, pa, pb, y0, y1) {
  const p0 = Math.min(pa, pb);
  const p1 = Math.max(pa, pb);
  if (info.pz) orientedBox(mesh, [a0, p0], [1, 0], a1 - a0, [0, 1], 0, p1 - p0, y0, y1);
  else orientedBox(mesh, [p0, a0], [1, 0], p1 - p0, [0, 1], 0, a1 - a0, y0, y1);
}

function trims(mesh, info, fy) {
  const { a0, p0 } = info;
  const top = fy + DOOR_HEIGHT;
  for (const s of info.oneSided ? [info.side] : [-1, 1]) {
    const fp = p0 + (s > 0 ? 1 : 0);
    const out = fp + s * PROUD;
    localBox(mesh, info, a0 - CASING, a0, fp, out, fy, top + CASING);
    localBox(mesh, info, a0 + 1, a0 + 1 + CASING, fp, out, fy, top + CASING);
    localBox(mesh, info, a0, a0 + 1, fp, out, top, top + CASING);
    // Profil: en hevet kant ytterst på listen.
    const bead = out + s * BEAD_PROUD;
    localBox(mesh, info, a0 - CASING, a0 - CASING + BEAD, out, bead, fy, top + CASING);
    localBox(mesh, info, a0 + 1 + CASING - BEAD, a0 + 1 + CASING, out, bead, fy, top + CASING);
    localBox(mesh, info, a0 - CASING + BEAD, a0 + 1 + CASING - BEAD, out, bead, top + CASING - BEAD, top + CASING);
  }
  localBox(mesh, info, a0, a0 + LINING, p0, p0 + 1, fy, top);
  localBox(mesh, info, a0 + 1 - LINING, a0 + 1, p0, p0 + 1, fy, top);
  localBox(mesh, info, a0, a0 + 1, p0, p0 + 1, top - LINING, top);
  // Stopperlisten står rett innenfor bladet når det er lukket (bladet slår ut mot `side`).
  const s = info.side > 0 ? 1 : -1;
  const face = p0 + (s > 0 ? 1 : 0);
  const s0 = face - s * (LEAF_T / 2 + 0.002);
  const s1 = s0 - s * STOP_T;
  localBox(mesh, info, a0, a0 + STOP, s0, s1, fy, top);
  localBox(mesh, info, a0 + 1 - STOP, a0 + 1, s0, s1, fy, top);
  localBox(mesh, info, a0 + STOP, a0 + 1 - STOP, s0, s1, top - STOP, top);
}

/**
 * Dørbladet dreid om hengslet, med beslag: håndtak på begge sider nær den frie kanten, hengsler på
 * siden bladet slår ut mot og (style.kick) sparkeplate nederst.
 */
function leaf(mesh, knob, info, fy, style) {
  const { o, u, w } = leafPose(info);
  const t = [-u[1], u[0]];
  const height = DOOR_HEIGHT - 0.015;
  orientedBox(mesh, o, u, w, t, -LEAF_T / 2, LEAF_T / 2, fy + 0.01, fy + height);
  handles(knob, style.handle ?? 'lever', o, u, t, LEAF_T, w - 0.07, fy + HANDLE_Y);
  // Hengslene sitter på flaten bladet slår ut mot (bestemt fra lukket stilling, følger bladet).
  const closed = leafPose({ ...info, state: DOOR.CLOSED });
  const out = info.pz ? [0, info.side] : [info.side, 0];
  const sign = -closed.u[1] * out[0] + closed.u[0] * out[1] >= 0 ? 1 : -1;
  hinges(knob, o, t, LEAF_T, sign, fy, height);
  if (style.kick) kickPlates(knob, o, u, w, t, LEAF_T, fy);
}

/**
 * @param style temaets dørstil { frame, leaf, closet, knob, handle, kick } (frame = null: ingen karm;
 *              handle 'lever' | 'knob'; kick = sparkeplate)
 * @returns {{ trim, leaf, closet, knob, swing }} MeshData per materiale. Dører med rom på
 *          begge sider kan åpnes mens man går og ligger hver for seg i `swing`:
 *          [{ i, info, hinge: [x, z], leaf, knob }] (bygget i dørens nåværende stilling).
 */
export function buildDoors(level, style, field) {
  const out = { trim: new MeshData(field), leaf: new MeshData(field), closet: new MeshData(field), knob: new MeshData(field), swing: [] };
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      if (level.tiles[z * level.w + x] !== TILE.DOOR) continue;
      const info = doorInfo(level, x, z);
      if (!info) continue;
      const fy = floorAt(level, x, z);
      if (style.frame) trims(out.trim, info, fy);
      if (info.state === DOOR.NONE) continue;
      if (info.oneSided) {
        leaf(info.closet && style.closet ? out.closet : out.leaf, out.knob, info, fy, style);
      } else {
        const d = { i: z * level.w + x, info, hinge: leafPose(info).o, leaf: new MeshData(field), knob: new MeshData(field) };
        leaf(d.leaf, d.knob, info, fy, style);
        out.swing.push(d);
      }
    }
  }
  return out;
}

export { closedLeafBox } from '../core/doors.js';
