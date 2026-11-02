// Rommet bak hovedmenyen: en lang hall i Level 0 som blir mørkere innover, med lysrør som blinker og en gang
// helt innerst der ett lys fortsatt prøver. Fast oppsett, så det ser likt ut hver gang. Ren logikk.
import { TILE, LIGHT, createLevel } from '../core/level.js';
import { placeObject } from '../core/objects.js';
import { yawFromDir } from '../core/spawn.js';
import { fillRect } from './util.js';

const [W, H] = [46, 22];
const [Z0, Z1] = [6, 15]; // hallen
const END = 36; // der hallen slutter og gangen tar over
const ROWS = [7, 10, 13]; // lysrørene på tvers av hallen
const FLICKERING = new Set(['10,7', '16,10', '19,10', '22,13', '25,7', '41,10']); // alle fire blinkegruppene
const DEAD = new Set(['25,13', '28,7', '28,10', '31,13', '34,7', '34,13']);
const SWING = 90; // sekunder frem og tilbake langs hallen
const START = 4.5;
const REACH = 7;

function lamp(level, x, z) {
  const key = `${x},${z}`;
  const state = FLICKERING.has(key) ? LIGHT.FLICKER : DEAD.has(key) ? LIGHT.BROKEN : x > 25 ? LIGHT.NONE : LIGHT.ON;
  level.lights[z * level.w + x] = state;
}

export function menuRoom() {
  const level = createLevel({ theme: 'backrooms', w: W, h: H, height: 2.7, name: 'Main menu' });
  fillRect(level, 2, Z0, END, Z1, TILE.FLOOR);
  fillRect(level, END, 10, W - 2, 11, TILE.FLOOR); // gangen innerst
  fillRect(level, 19, Z1, 23, Z1 + 3, TILE.FLOOR); // et rom ved siden av, uten lys
  fillRect(level, 26, Z0 - 3, 30, Z0, TILE.FLOOR);
  for (const x of [12, 18, 24, 30]) {
    for (const z of [Z0 + 1, Z1 - 1]) fillRect(level, x, z, x, z, TILE.PILLAR);
  }
  for (let x = 4; x <= 34; x += 3) {
    for (const z of ROWS) lamp(level, x, z);
  }
  lamp(level, 41, 10);
  placeObject(level, 15, 8, 'woodenchair'); // én stol, midt i ingenting
  level.spawn = { x: START, z: 10.5, a: yawFromDir(1, 0) };
  return level;
}

/**
 * Kameraet: glir sakte innover hallen og tilbake, og følger musa litt.
 * Hallen står til høyre i bildet, for menyen står til venstre.
 * @param px, py musa, -1..1 @param turn ekstra dreining (undermenyene)
 */
export function menuShot(t, px = 0, py = 0, turn = 0) {
  const along = (1 - Math.cos((t * 2 * Math.PI) / SWING)) / 2;
  return {
    x: START + along * REACH,
    y: 1.55 + Math.sin(t * 0.4) * 0.006,
    z: 10.7 + Math.sin(t * 0.13) * 0.25 + px * 0.18,
    yaw: -Math.PI / 2 + 0.2 + Math.sin(t * 0.07) * 0.03 - px * 0.05 + turn,
    pitch: -0.02 + Math.sin(t * 0.1) * 0.01 - py * 0.03,
  };
}
