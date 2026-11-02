import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { mulberry32 } from '../src/core/rng.js';
import { FIGURE, figurePose } from '../src/core/figure.js';
import { figureMaterial } from '../src/view3d/figure-material.js';
import { Monster3D } from '../src/view3d/monster.js';
import { MonsterAI, MONSTER } from '../src/world/monster-ai.js';
import { lineOfSight } from '../src/world/lighting.js';
import { MOODS } from '../src/gen/moods.js';

const RUN = 3.1; // løping (view3d/walker.js)
const WALK = 1.55;
const ai = { x: 4, y: 0, z: 6, state: 'hunt', visible: true };
const player = { x: 4, z: 10 };

function hall() {
  const level = createLevel({ w: 44, h: 13 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 42, z1: 11 }), TILE.FLOOR);
  return level;
}

/** To rom med en åpning: man kan stå i det ene og ikke se inn i hele det andre. */
function rooms() {
  const level = createLevel({ w: 31, h: 13 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 29, z1: 11 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 15, z0: 1, x1: 15, z1: 11 }), TILE.WALL);
  level.tiles[6 * 31 + 15] = TILE.FLOOR;
  return level;
}

describe('den sorte skikkelsen – utseende', () => {
  it('spøkelsesmodellen er borte, og skikkelsen er kode uten filer', async () => {
    expect(existsSync('models/animated_ghost_nightmare_mode.glb')).toBe(false);
    const m = new Monster3D();
    expect(await m.load()).toBe(true);
    expect(m.group.visible).toBe(false);
    expect(FIGURE.plane[1]).toBeGreaterThan(FIGURE.height);
  });

  it('er diffus: gjennomsiktig, uten dybde, og følger tåken', () => {
    const material = figureMaterial(FIGURE.height);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.fog).toBe(true);
    expect(material.fragmentShader).not.toMatch(/mouth|smile/i);
  });

  it('står på gulvet, vender mot den som ser, og vugger litt', () => {
    const a = figurePose(1, ai, player);
    expect(a).toMatchObject({ x: 4, y: 0, z: 6 });
    expect(a.yaw).toBeCloseTo(0);
    expect(figurePose(1, ai, { x: 8, z: 6 }).yaw).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(a.sway)).toBeLessThan(0.08);
    expect(figurePose(2, ai, player).sway).not.toBeCloseTo(a.sway);
  });

  it('står stille på pause, skjules, og blir mer utvisket i fart', () => {
    const m = new Monster3D();
    m.update(0.1, ai, player, 0.1);
    expect(m.group.visible).toBe(true);
    expect(m.group.position.z).toBe(6);
    const u = m.material.uniforms;
    expect(u.uDark.value).toBeCloseTo(0.9);
    const time = u.uTime.value;
    m.update(0, ai, player, 0.1);
    expect(u.uTime.value).toBe(time);
    expect(u.uRush.value).toBe(0);
    for (let i = 0; i < 30; i++) m.update(0.05, { ...ai, fast: true }, player, 1);
    expect(u.uRush.value).toBeGreaterThan(0.9);
    m.update(0.1, { ...ai, visible: false }, player, 1);
    expect(m.group.visible).toBe(false);
    m.dispose();
    expect(() => m.update(0.1, ai, player, 1)).not.toThrow();
  });

  it('forberedes usynlig: skriver ingen farge før det første bildet er tegnet', () => {
    const m = new Monster3D();
    const camera = { position: { x: 0, y: 1, z: 0 }, getWorldDirection: (v) => v.set(0, 0, -1) };
    m.group.position.copy = m.group.position.copy.bind(m.group.position);
    m.warm({ compileAsync: () => Promise.resolve() }, camera, {});
    expect(m.material.colorWrite).toBe(false);
    m.update(0.1, { ...ai, visible: false }, player, 1);
    expect(m._warming).toBe(true);
    m.mesh.onAfterRender();
    m.update(0.1, { ...ai, visible: false }, player, 1);
    expect(m.material.colorWrite).toBe(true);
    expect(m.material.depthWrite).toBe(false);
  });

  it('spøkelset er fjernet fra krediteringen', () => {
    expect(readFileSync('src/about.js', 'utf8')).not.toMatch(/GHOST|core\/ghost/);
  });
});

describe('den sorte skikkelsen – sniker seg, og er rask når den er nær', () => {
  const hunter = (x, chase = {}) => {
    const m = new MonsterAI(hall(), mulberry32(4));
    m.chase = chase;
    m.update(0.05, { x: 3.5, z: 6.5, y: 0, yaw: 0 }, true);
    Object.assign(m, { x, z: 6.5, y: 0 });
    return m;
  };
  const speed = (m, p, seconds = 0.4) => {
    const x = m.x;
    for (let t = 0; t < seconds; t += 0.05) m.update(0.05, p, true);
    return Math.abs(m.x - x) / seconds;
  };

  it('langt unna lister den seg, saktere enn man går', () => {
    const m = hunter(30);
    expect(speed(m, { x: 3.5, z: 6.5, y: 0, yaw: 0 })).toBeLessThan(WALK);
    expect(m.fast).toBe(false);
  });

  it('nær nok, med fri sikt, gjør den et utfall raskere enn man løper', () => {
    const m = hunter(3.5 + MONSTER.RUSH_NEAR - 1);
    expect(speed(m, { x: 3.5, z: 6.5, y: 0, yaw: 0 })).toBeGreaterThan(RUN);
    expect(m.fast).toBe(true);
  });

  it('utfallet tar slutt: løper man, slipper den taket en stund', () => {
    const m = hunter(3.5 + MONSTER.RUSH_NEAR - 1);
    const p = { x: 3.5, z: 6.5, y: 0, yaw: 0 };
    let t = 0;
    for (; t < 10 && !m.fast; t += 0.05) m.update(0.05, p, true);
    p.x = 40; // langt unna, så den ikke når fram
    for (let i = 0; i < 200 && m.fast; i++) m.update(0.05, p, true);
    expect(m.fast).toBe(false);
    p.x = m.x - 3; // rett foran den igjen: den må hvile før neste utfall
    m.update(0.05, p, true);
    expect(m.fast).toBe(false);
  });

  it('ingen utfall uten fri sikt', () => {
    const level = rooms();
    const m = new MonsterAI(level, mulberry32(4));
    const p = { x: 12.5, z: 2.5, y: 0, yaw: 0 };
    m.update(0.05, p, true);
    Object.assign(m, { x: 17.5, z: 2.5, y: 0 }); // rett bak veggen
    expect(lineOfSight(level, p.x, p.z, m.x, m.z)).toBe(false);
    m.update(0.05, p, true);
    expect(m.fast).toBe(false);
  });

  it('Nightmare: løper man tidsnok, slipper man unna; står man stille, blir man tatt', () => {
    const chase = MOODS.nightmare.chase;
    expect(chase.rush).toBeGreaterThan(RUN);
    expect(chase.speed).toBeLessThan(RUN);
    const m = hunter(3.5 + MONSTER.RUSH_NEAR, chase);
    const p = { x: 3.5, z: 6.5, y: 0, yaw: 0 };
    let caught = false;
    for (let t = 0; t < 6 && !caught; t += 0.05) caught = m.update(0.05, p, true) === 'caught';
    expect(caught).toBe(true);
    const free = hunter(26, chase);
    const runner = { x: 20, z: 6.5, y: 0, yaw: 0 };
    let got = false;
    for (let t = 0; t < 5.5 && !got; t += 0.05) {
      runner.x = Math.max(2, runner.x - RUN * 0.05);
      got = free.update(0.05, runner, true) === 'caught';
    }
    expect(got).toBe(false);
  });

  it('i lyset lister den seg mot skjul rundt et hjørne, og forsvinner der', () => {
    const level = rooms();
    const m = new MonsterAI(level, mulberry32(3));
    m.lurkIn = 0;
    const p = { x: 2.5, z: 6.5, y: 0, yaw: -Math.PI / 2 };
    expect(m.update(0.1, p, false)).toBe('appear');
    const start = [m.x, m.z];
    expect(m.goal).toBeTruthy();
    expect(lineOfSight(level, p.x, p.z, m.goal.x, m.goal.z)).toBe(false);
    let event = null;
    for (let t = 0; t < 20 && !event; t += 0.1) event = m.update(0.1, p, false);
    expect(event).toBe('vanish');
    expect(Math.hypot(m.x - start[0], m.z - start[1])).toBeGreaterThan(2); // den gikk, og sto ikke stille
    expect(m.fast).toBe(false);
  });

  it('i lyset er den rask bort når man kommer nær', () => {
    const m = new MonsterAI(rooms(), mulberry32(3));
    m.lurkIn = 0;
    expect(m.update(0.1, { x: 2.5, z: 6.5, y: 0, yaw: -Math.PI / 2 }, false)).toBe('appear');
    const p = { x: m.x - 3, z: m.z, y: 0, yaw: 0 };
    expect(m.update(0.1, p, false)).toBe(null);
    expect(m.fast).toBe(true);
    let event = null;
    for (let t = 0; t < 4 && !event; t += 0.1) event = m.update(0.1, p, false);
    expect(event).toBe('vanish');
  });
});
