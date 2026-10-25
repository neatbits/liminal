import { describe, expect, it } from 'vitest';
import { createLevel, TILE, DOOR_ARCH } from '../src/core/level.js';
import { DOOR, doorInfo } from '../src/core/doors.js';
import { ceilingAt } from '../src/core/heights.js';
import { generateLevel } from '../src/gen/index.js';
import { archways } from '../src/gen/arches.js';
import { mulberry32 } from '../src/core/rng.js';
import { archShape, archPoints, buildArch, SPRING } from '../src/world/arches.js';
import { MeshData } from '../src/world/mesher.js';
import { distanceMap, passable } from '../src/world/paths.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';

/** To rom med en vegg imellom (x = 5) og én smal åpning i den. */
function twoRooms(height = 2.8) {
  const l = createLevel({ theme: 'backrooms', w: 11, h: 7, height });
  for (let z = 1; z < 6; z++) for (let x = 1; x < 10; x++) l.tiles[z * l.w + x] = x === 5 ? TILE.WALL : TILE.FLOOR;
  const i = 3 * l.w + 5;
  l.tiles[i] = TILE.DOOR;
  l.meta[i] = DOOR.NONE | DOOR_ARCH;
  return l;
}
const arches = (l) => [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.DOOR && doorInfo(l, i % l.w, (i / l.w) | 0)?.arch);

describe('buede døråpninger', () => {
  it('buen står i toppen av åpningen: en halvsirkel med plass, flatere under et lavt tak', () => {
    const tall = twoRooms(2.8);
    expect(ceilingAt(tall, 5, 3)).toBeCloseTo(2.5);
    const s = archShape(tall, 5, 3);
    expect(s).toMatchObject({ spring: SPRING, top: 2.5 });
    expect(s.radius).toBeCloseTo(0.5);
    const low = twoRooms(2.3);
    const f = archShape(low, 5, 3);
    expect(f.top).toBeCloseTo(2.3);
    expect(f.radius).toBeGreaterThan(0.5); // et flatere segment
    for (const shape of [s, f]) {
      const pts = archPoints(shape);
      expect(pts[0][0]).toBeCloseTo(shape.info.a0);
      expect(pts[0][1]).toBeCloseTo(shape.spring);
      expect(pts.at(-1)[0]).toBeCloseTo(shape.info.a0 + 1);
      expect(pts.at(-1)[1]).toBeCloseTo(shape.spring);
      expect(Math.max(...pts.map((p) => p[1]))).toBeCloseTo(shape.top);
    }
  });

  it('en dør med dørblad er ikke en bue, og en vanlig åpning er flat som før', () => {
    const l = twoRooms();
    l.meta[3 * l.w + 5] = DOOR.CLOSED | DOOR_ARCH;
    expect(doorInfo(l, 5, 3).arch).toBe(false);
    expect(ceilingAt(l, 5, 3)).toBeCloseTo(2.1);
    l.meta[3 * l.w + 5] = DOOR.NONE;
    expect(archShape(l, 5, 3)).toBeNull();
  });

  it('flatene ligger i åpningen, mellom vederlaget og toppen, og undersiden vender inn mot buen', () => {
    const l = twoRooms();
    const s = archShape(l, 5, 3);
    const mesh = new MeshData();
    buildArch(mesh, s);
    expect(mesh.quadCount).toBe(12 * 6); // fire striper underside + to veggfelt per segment
    expect(s.info.pz).toBe(false); // veggen står langs z: buen spenner over z, åpningen går gjennom x
    const centre = [3.5, s.cy];
    for (let v = 0; v < mesh.vertexCount; v++) {
      const [x, y, z] = mesh.pos.slice(v * 3, v * 3 + 3);
      expect(x).toBeGreaterThanOrEqual(5 - 1e-9);
      expect(x).toBeLessThanOrEqual(6 + 1e-9);
      expect(z).toBeGreaterThanOrEqual(3 - 1e-9);
      expect(z).toBeLessThanOrEqual(4 + 1e-9);
      expect(y).toBeGreaterThanOrEqual(s.spring - 1e-9);
      expect(y).toBeLessThanOrEqual(s.top + 1e-9);
    }
    // Første firkant er undersiden: omløpet (høyrehånd) peker mot buens sentrum.
    const P = (k) => mesh.pos.slice(mesh.index[k] * 3, mesh.index[k] * 3 + 3);
    const [a, b, c] = [P(0), P(1), P(2)];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    expect(n[2] * (centre[0] - a[2]) + n[1] * (centre[1] - a[1])).toBeGreaterThan(0);
  });

  it('alle firkantene vender riktig vei, også de som spisser seg til i toppen av buen', () => {
    const l = twoRooms();
    const s = archShape(l, 5, 3);
    const mesh = new MeshData();
    buildArch(mesh, s);
    const P = (k) => mesh.pos.slice(k * 3, k * 3 + 3);
    for (let q = 0; q < mesh.quadCount; q++) {
      // Største trekant i firkanten: normalen fra omløpet skal peke ut av den massive veggen.
      const [a, b, c, d] = [0, 1, 2, 3].map((k) => P(q * 4 + k));
      const cross = (o, u, v) => {
        const e1 = u.map((x, i) => x - o[i]), e2 = v.map((x, i) => x - o[i]);
        return [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      };
      const n = [cross(a, b, c), cross(a, c, d)].sort((u, v) => Math.hypot(...v) - Math.hypot(...u))[0];
      const centre = [a, b, c, d].reduce((m, v) => m.map((x, i) => x + v[i] / 4), [0, 0, 0]);
      if (Math.abs(centre[0] - 5) < 1e-6 || Math.abs(centre[0] - 6) < 1e-6) {
        expect(Math.sign(n[0]), `veggfelt ${q}`).toBe(centre[0] < 5.5 ? -1 : 1); // ut mot rommet
      } else {
        expect(n[2] * (3.5 - centre[2]) + n[1] * (s.cy - centre[1]), `underside ${q}`).toBeGreaterThan(0);
      }
    }
  });

  it('ingen mørk søm: kanten av undersiden har samme lys som veggfeltet ved siden av', () => {
    const l = twoRooms();
    l.lights[3 * l.w + 2] = 1; // en lampe i rommet til venstre
    const sample = (x, y, z, nx, ny, nz) => [Math.max(0, -nx) + 0.1 * Math.max(0, ny), 0, 0, 0, 0, 0, 0]; // lys fra −x
    const mesh = new MeshData({ sample });
    buildArch(mesh, archShape(l, 5, 3));
    const at = new Map(); // posisjon → lysverdier som møtes der
    for (let v = 0; v < mesh.vertexCount; v++) {
      const key = mesh.pos.slice(v * 3, v * 3 + 3).map((n) => n.toFixed(4)).join();
      at.set(key, [...(at.get(key) ?? []), mesh.light[v * 3]]);
    }
    for (const values of at.values()) expect(Math.max(...values) - Math.min(...values)).toBeLessThan(1e-9);
  });

  it('genererte Level 0 får noen buer, med rom på begge sider, og alt henger fortsatt sammen', () => {
    let total = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const l = generateLevel({ theme: 'backrooms', w: 40, h: 40, seed });
      const found = arches(l);
      total += found.length;
      for (const i of found) expect(archShape(l, i % l.w, (i / l.w) | 0), `seed ${seed}`).not.toBeNull();
      const map = distanceMap(l, Math.floor(l.spawn.x), Math.floor(l.spawn.z));
      for (let i = 0; i < l.tiles.length; i++) {
        const x = i % l.w, z = (i / l.w) | 0;
        if (l.tiles[i] === TILE.FLOOR && passable(l, x, z)) expect(map[i], `seed ${seed} (${x}, ${z})`).toBeLessThan(Infinity);
      }
    }
    expect(total).toBeGreaterThan(6 * 3);
  });

  it('buen overlever JSON og delingslenke (meta-biten ble før klemt ned til en åpen dør)', async () => {
    const l = twoRooms();
    for (const back of [levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(l)))), await decodeLevel(await encodeLevel(l))]) {
      expect(back.meta[3 * l.w + 5]).toBe(DOOR.NONE | DOOR_ARCH);
      expect(doorInfo(back, 5, 3).arch).toBe(true);
    }
  });

  it('ikke i eksemplene (uten vary) eller andre temaer', () => {
    expect(arches(generateLevel({ theme: 'backrooms', w: 40, h: 40, seed: 3, vary: false }))).toEqual([]);
    expect(arches(generateLevel({ theme: 'office', w: 40, h: 40, seed: 3 }))).toEqual([]);
    expect(archways(createLevel({ theme: 'hotel', w: 10, h: 10 }), mulberry32(1))).toBe(0);
  });
});
