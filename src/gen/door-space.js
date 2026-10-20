// Plass rundt dørene i genererte rom: dørblad som slår inn i hverandre (eller foran en annen
// åpning) snus – eller mister dørbladet – og gjenstander som står foran en døråpning fjernes (med
// det som stod oppå dem). Rom man tegner selv røres ikke. Ren logikk.
import { TILE } from '../core/level.js';
import { doorInfo, doorFronts, swingCell, flipSwing, setDoor } from '../core/doors.js';
import { OBJECTS, objectPose, objectBox } from '../core/objects.js';

function doors(level) {
  const out = [];
  for (let i = 0; i < level.tiles.length; i++) {
    if (level.tiles[i] !== TILE.DOOR) continue;
    const info = doorInfo(level, i % level.w, Math.floor(i / level.w));
    if (info) out.push(info);
  }
  return out;
}

const key = ([x, z]) => `${x},${z}`;

/** Alle rutene rett foran døråpningene. */
export function doorFrontCells(level) {
  return doors(level).flatMap(doorFronts);
}

/** Står dørbladet til a i veien for b (inn i ruten foran b), eller omvendt? */
function clash(a, b) {
  const sa = swingCell(a);
  const sb = swingCell(b);
  const fa = doorFronts(a).map(key);
  const fb = doorFronts(b).map(key);
  return (sa && fb.includes(key(sa))) || (sb && fa.includes(key(sb)));
}

/**
 * Dører som er i veien for hverandre: prøver å snu den ene, så den andre; hjelper ikke det, tas
 * dørbladet bort (åpningen står igjen), og en dør til ingensteds blir vegg igjen.
 * @returns {number} antall dører som ble endret
 */
export function untangleDoors(level) {
  let changed = 0;
  const conflict = (info) => doors(level).some((o) => (o.x !== info.x || o.z !== info.z) && clash(info, o));
  for (const d of doors(level)) {
    const info = doorInfo(level, d.x, d.z);
    if (!info || !conflict(info)) continue;
    changed++;
    if (flipSwing(level, d.x, d.z)) {
      if (!conflict(doorInfo(level, d.x, d.z))) continue;
      flipSwing(level, d.x, d.z);
    }
    if (!info.oneSided) setDoor(level, d.x, d.z, info.state, true);
    else {
      level.tiles[d.z * level.w + d.x] = TILE.WALL;
      level.meta[d.z * level.w + d.x] = 0;
    }
  }
  return changed;
}

/**
 * Fjerner gjenstander på gulvet som dekker en rute rett foran en døråpning, og det som stod oppå
 * dem (det ville ellers falt ned). Returnerer antall som ble fjernet.
 */
export function clearDoorways(level) {
  const free = doorFrontCells(level);
  const before = level.objects.length;
  const blocks = (o) => {
    const def = OBJECTS[o.id];
    if (!def || def.mount || def.floats) return false;
    const [x0, z0, x1, z1] = objectBox(objectPose(level, o));
    return free.some(([x, z]) => x0 < x + 1 - 0.05 && x1 > x + 0.05 && z0 < z + 1 - 0.05 && z1 > z + 0.05);
  };
  const poses = level.objects.map((o) => objectPose(level, o).y);
  const keep = level.objects.map((o) => !blocks(o));
  // Det som stod oppå noe som ble fjernet, havner lavere: fjern det også (til ingenting endrer seg).
  for (let round = 0; round < 4 && keep.some((k) => !k); round++) {
    const rest = level.objects.filter((_, i) => keep[i]);
    const lv = { ...level, objects: rest };
    let more = false;
    rest.forEach((o) => {
      const i = level.objects.indexOf(o);
      if (Math.abs(objectPose(lv, o).y - poses[i]) > 0.01) {
        keep[i] = false;
        more = true;
      }
    });
    if (!more) break;
  }
  level.objects = level.objects.filter((_, i) => keep[i]);
  return before - level.objects.length;
}
