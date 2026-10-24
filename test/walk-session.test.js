import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WalkMode } from '../src/view3d/walkmode.js';
import { waitWhileWalking } from '../src/view3d/walk-session.js';
import { createLevel, TILE } from '../src/core/level.js';
import { getTheme } from '../src/core/themes.js';

beforeEach(() => {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { pointerLockElement: null, hidden: false }));
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup(touch = false) {
  vi.stubGlobal('matchMedia', () => ({ matches: touch }));
  const canvas = new EventTarget();
  canvas.requestPointerLock = vi.fn();
  const audio = { start: vi.fn(), stop: vi.fn(), setEnabled: vi.fn() };
  const hud = Object.fromEntries(['setLocked', 'setWalking', 'setPrompt', 'setRiding', 'setDrifting', 'setStats'].map((k) => [k, vi.fn()]));
  const walk = new WalkMode({ canvas, hud, audio });
  const level = createLevel({ w: 12, h: 12 });
  level.tiles.fill(TILE.FLOOR);
  walk.sound = false;
  walk.setWorld(level, getTheme(level.theme), { near: () => [] });
  walk.enter();
  return { walk, canvas, hud, audio };
}

const camera = () => ({ position: { set() {} }, rotation: { set() {} } });

describe('pause i gåmodus', () => {
  it('touch keeps pointer events available for on-screen buttons',()=>{
    const {walk,canvas}=setup(true);walk.lock();
    expect(walk.paused).toBe(false);expect(walk.input.enabled).toBe(true);
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
  });
  it('pointer lock-tap stopper bevegelse, fysikk og dørbruk, og tømmer input', () => {
    const { walk, canvas, hud } = setup();
    document.pointerLockElement = canvas;
    document.dispatchEvent(new Event('pointerlockchange'));
    walk.input.keys.add('KeyW');
    walk.input.lookX = 100;
    walk.input._drag = { x: 1, y: 1 };
    const physics = vi.spyOn(walk.play, 'update');
    const door = vi.spyOn(walk, 'useDoor');
    const before = { x: walk.walker.x, z: walk.walker.z, yaw: walk.walker.yaw };
    document.pointerLockElement = null;
    document.dispatchEvent(new Event('pointerlockchange'));
    window.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyE' }));
    for (let i = 0; i < 20; i++) walk.update(0.05, camera(), [1, 1, 1, 1], []);
    expect(walk.paused).toBe(true);
    expect(walk.input.enabled).toBe(false);
    expect(walk.input.forward).toBe(0);
    expect(walk.input.consumeLook()).toEqual([0, 0]);
    expect(walk.input._drag).toBeNull();
    expect(walk.walker).toMatchObject(before);
    expect(physics).not.toHaveBeenCalled();
    expect(door).not.toHaveBeenCalled();
    expect(hud.setLocked).toHaveBeenLastCalledWith(false, true, true);
  });

  it('Resume virker også uten pointer lock, og ny input beveger spilleren', () => {
    const { walk } = setup();
    expect(walk.paused).toBe(true);
    walk.lock();
    expect(walk.paused).toBe(false);
    const z = walk.walker.z;
    walk.input.keys.add('KeyW');
    walk.update(0.05, camera(), [1, 1, 1, 1], []);
    expect(walk.walker.z).toBeLessThan(z);
  });

  it('berøring kan gå uten pointer lock, men skjult fane pauser', () => {
    const { walk } = setup(true);
    expect(walk.paused).toBe(false);
    expect(walk.input.enabled).toBe(true);
    document.hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(walk.paused).toBe(true);
    walk.lock();
    expect(walk.paused).toBe(false);
  });

  it('påslått lyd starter først ved Resume og dempes ved pause', () => {
    const { walk, audio } = setup();
    walk.setSound(true);
    expect(audio.start).not.toHaveBeenCalled();
    walk.lock();
    expect(audio.start).toHaveBeenCalledWith(walk.theme);
    window.dispatchEvent(new Event('blur'));
    expect(walk.paused).toBe(true);
    expect(audio.stop).toHaveBeenCalled();
  });

  it('en forsinket pointer lock-tillatelse etter blur opphever ikke pause', () => {
    const { walk, canvas } = setup();
    walk.lock();
    window.dispatchEvent(new Event('blur'));
    document.pointerLockElement = canvas;
    document.dispatchEvent(new Event('pointerlockchange'));
    expect(walk.paused).toBe(true);
    expect(walk.input.enabled).toBe(false);
    walk.lock();
    expect(walk.paused).toBe(false);
  });
});

describe('nivåoverganger', () => {
  it('tiden står stille på pause og går videre ved Resume', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    const viewer = { mode: 'walk', walk: { paused: false } };
    const done = vi.fn();
    const result = waitWhileWalking(viewer, 200, () => true).then(done);
    await vi.advanceTimersByTimeAsync(50);
    viewer.walk.paused = true;
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).not.toHaveBeenCalled();
    viewer.walk.paused = false;
    await vi.advanceTimersByTimeAsync(250);
    await result;
    expect(done).toHaveBeenCalledWith(true);
  });

  it('utgang eller en erstattet økt avbryter en ventende overgang', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    const viewer = { mode: 'walk', walk: { paused: true } };
    let current = true;
    const result = waitWhileWalking(viewer, 200, () => current);
    current = false;
    await vi.advanceTimersByTimeAsync(50);
    expect(await result).toBe(false);
    viewer.mode = 'overview';
    expect(await waitWhileWalking(viewer, 200, () => true)).toBe(false);
  });
});
