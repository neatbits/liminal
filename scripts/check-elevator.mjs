// Heis mellom etasjer i produksjonsbygget (core/elevators.js, view3d/lifts.js): E ved dørene åpner (vognen står i
// etasjen), inn i vognen, tallet 3 for etasje 3, dørene lukkes, turen (lyset blafrer) og ut i etasje 3; dørene lukkes
// igjen av seg selv, og døråpningen er vegg mens de er lukket. Skjermbilder: node_modules/.cache/elevator-{open,ride,top}.png.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { encodeLevel } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';
import { fillRect } from '../src/gen/util.js';
import { insertStorey, emptyStorey } from '../src/core/storeys.js';
import { toggleElevator, footprint, elevatorDir } from '../src/core/elevators.js';
import { waitFor } from './browser-driver.mjs';

function building() {
  const level = createLevel({ name: 'Elevator', theme: 'backrooms', w: 16, h: 12, height: 2.8 });
  fillRect(level, 1, 1, 14, 10, TILE.FLOOR);
  autoLights(level, { spacing: 3, state: 1 });
  for (const theme of ['office', 'hotel']) {
    const s = emptyStorey(level);
    s.theme = theme;
    fillRect(s, 1, 1, 14, 10, TILE.FLOOR);
    autoLights(s, { spacing: 3, state: 1 });
    insertStorey(level, level.storeys?.length ? 2 : 1, s);
  }
  toggleElevator(level, 6, 5);
  return level;
}

const mid = (cells) => [cells.reduce((s, [x]) => s + x, 0) / cells.length + 0.5, cells.reduce((s, [, z]) => s + z, 0) / cells.length + 0.5];

export async function checkElevator(browser, origin) {
  const { call, evaluate } = browser;
  const room = building();
  const e = room.elevators[0];
  const f = footprint(e);
  const [dx, dz] = elevatorDir(e);
  const [lx, lz] = mid(f.landing).map((v, i) => v + [dx, dz][i] * 0.6);
  const [cx, cz] = mid(f.car);
  const toDoor = Math.atan2(dx, dz); // vendt mot dørene fra reposet
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(room)}` });
  await waitFor(() => evaluate(`window.liminal?.level.name === 'Elevator' && Boolean(liminal.viewer.world)`).catch(() => false), 'elevator room');
  await evaluate(`liminal.layout.set('3d')`);
  await evaluate(`liminal.viewer.settings.mood = 'normal'; liminal.viewer.enterWalk()`);
  await evaluate(`document.querySelector('[data-act="resume"]')?.click()`);
  await evaluate(`(() => { const v = liminal.viewer; v.renderer.setAnimationLoop(null);
    window.__step = (frames, until) => { v.walk.session.resume(); v.walk.input.consumeLook();
      for (let i = 0; i < frames && !until(); i++) v.walk.update(1 / 60, v.camera, v.flicker.values, []); };
    window.__lift = () => { const L = v.walk.lift.list[0], lv = v.walk.level;
      return { phase: L.phase, at: L.at, open: +L.open.toFixed(2), storey: v.storeys.current, theme: v.world.theme.id,
        door: ${JSON.stringify(f.door)}.map(([x, z]) => lv.tiles[z * lv.w + x]), y: +v.walk.walker.floorY.toFixed(2) }; };
    window.__put = (x, z, yaw) => { const w = v.walk.walker; Object.assign(w, { x, z, yaw, pitch: 0, vx: 0, vz: 0 }); v.walk._prompt(); return document.querySelector('.hud-prompt').textContent; };
    window.__shot = (pitch = 0) => { const w = v.walk.walker; v.hud.fade(false, true); w.pitch = pitch; w.applyToCamera(v.camera); v.camera.position.y += v.walk.base;
      for (let i = 0; i < 3; i++) { v.world.update(1, [1, 1, 1, 1], v.camera); v.storeys.update(1, [1, 1, 1, 1], v.camera, [1, 1, 1]); v.postfx.render(1); }
      return v.renderer.domElement.toDataURL('image/png').split(',')[1]; }; })()`);
  const lift = () => evaluate('__lift()');
  assert.deepEqual((await lift()).door, [TILE.WALL, TILE.WALL], 'closed doors block the doorway');
  assert.equal(await evaluate(`__put(${lx}, ${lz}, ${toDoor})`), 'E – call the elevator');
  await evaluate('liminal.viewer.walk.useDoor()');
  await evaluate(`__step(200, () => __lift().phase === 'open')`);
  const open = await lift();
  assert.deepEqual({ phase: open.phase, open: open.open, door: open.door }, { phase: 'open', open: 1, door: [TILE.FLOOR, TILE.FLOOR] }, JSON.stringify(open));
  writeFileSync('node_modules/.cache/elevator-open.png', Buffer.from(await evaluate(`(__put(${lx + dx * 1.2}, ${lz + dz * 1.2}, ${toDoor}), __shot())`), 'base64'));
  // Inn i vognen: E går til neste etasje, tallene velger.
  assert.equal(await evaluate(`__put(${cx}, ${cz}, ${toDoor})`), 'E – go to floor 2 · or press 1 / 2 / 3');
  const carShot = (n) => evaluate(`(__put(${cx + dx * 0.75}, ${cz + dz * 0.75}, ${toDoor}), liminal.viewer.walk.walker.yaw += 0.45, __shot(0.2))`)
    .then((png) => writeFileSync(`node_modules/.cache/elevator-car-${n}.png`, Buffer.from(png, 'base64')));
  await carShot(1); // innvendig likt i alle etasjer (sammenlign med elevator-car-3.png)
  await evaluate(`__put(${cx}, ${cz}, ${toDoor})`);
  assert.equal(await evaluate('liminal.viewer.walk.lift.choose(2)'), true);
  await evaluate(`__step(400, () => __lift().phase === 'moving')`);
  assert.equal((await lift()).phase, 'moving');
  assert.equal(await evaluate(`(liminal.viewer.walk._prompt(), document.querySelector('.hud-prompt').textContent)`), 'Going up to floor 3…');
  await evaluate(`__step(60, () => false)`);
  writeFileSync('node_modules/.cache/elevator-ride.png', Buffer.from(await evaluate(`(liminal.viewer.walk.walker.yaw += 2.4, __shot(0.25))`), 'base64'));
  await evaluate(`__step(900, () => __lift().phase === 'open')`);
  const top = await lift();
  assert.deepEqual({ storey: top.storey, at: top.at, theme: top.theme, phase: top.phase, door: top.door, y: top.y }, { storey: 2, at: 2, theme: 'hotel', phase: 'open', door: [TILE.FLOOR, TILE.FLOOR], y: 0 }, JSON.stringify(top));
  const w = await evaluate('[liminal.viewer.walk.walker.x, liminal.viewer.walk.walker.z]');
  assert.ok(Math.hypot(w[0] - cx, w[1] - cz) < 0.2, `still in the car: ${w}`);
  await carShot(3);
  writeFileSync('node_modules/.cache/elevator-top.png', Buffer.from(await evaluate(`(__put(${lx + dx * 1.5}, ${lz + dz * 1.5}, ${toDoor}), __shot())`), 'base64'));
  // Dørene lukkes av seg selv, og da er døråpningen vegg igjen.
  await evaluate(`__step(800, () => __lift().phase === 'idle')`);
  assert.deepEqual((await lift()).door, [TILE.WALL, TILE.WALL]);
  assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
  await evaluate('liminal.viewer.exitWalk(false)');
  assert.equal(await evaluate('liminal.viewer.walk.lift.list[0].phase'), 'idle');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop((t) => liminal.viewer._tick(t))`);
  console.log('PASS elevator: E calls and opens it, a number picks the floor, the ride switches floor (own theme), doors close by themselves and block the doorway');
}
