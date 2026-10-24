// Gjenstander som bygges av enkle former i stedet for modellfiler (OBJECTS med `build`):
// gatekjøkkenkiosken (props-kiosk.js), et kafébord med tre stoler og butikkinnredning (props-shop.js).
// Returnerer deler i samme format som de lastede modellene.
import * as THREE from 'three';
import { box, cylinder, parts } from './props-geo.js';
import { shelf, wallshelf, counter } from './props-shop.js';
import { soft, SOFT_COLORS } from './props-soft.js';
import { kiosk, SIGNS, THEME_SIGNS } from './props-kiosk.js';
import { playball } from './props-ball.js';
import { halfwall } from './props-half-wall.js';

/** Hvilken variant en gjenstand får (fast for samme rute): nøkkel til bufferet av ferdige deler. */
export function propKey(def, level, o) {
  if (def.build === 'halfwall') return `halfwall:${level.theme}`;
  if (def.build === 'playball') return `playball:${(o.v ?? (o.x * 7 + o.z * 13)) % 4}`;
  if (def.build === 'soft') return `soft:${o.id}:${(o.v ?? (o.x * 7 + o.z * 13)) % SOFT_COLORS.length}`;
  if (def.build !== 'kiosk') return def.build;
  if (THEME_SIGNS[level.theme]) return `kiosk:${level.theme}`;
  const h = ((o.x * 73856093) ^ (o.z * 19349663)) >>> 0;
  return `kiosk:${h % SIGNS.length}`;
}

/** Rør (stålramme) fra a til b: [x, y, z]. */
function tube(r, a, b) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

/**
 * En kafestol (forsiden mot +z): stålrør der de bakre beina fortsetter opp som stolper for
 * ryggen, tverrstag under setet, polstret sete og en rygg som heller litt bakover.
 * @returns {{ frame, vinyl }} geometrier i stolens egne koordinater
 */
function chair() {
  const r = 0.013;
  const w = 0.2; // halv bredde mellom rørene
  const tilt = 0.06; // så mye ryggen heller bakover per meter
  const back = (y) => -0.2 - (y - 0.45) * tilt;
  const frame = [];
  for (const x of [-w, w]) {
    frame.push(tube(r, [x, 0, 0.19], [x, 0.44, 0.19])); // forbein
    frame.push(tube(r, [x, 0, -0.2], [x, 0.45, -0.2]), tube(r, [x, 0.45, -0.2], [x, 0.9, back(0.9)])); // bakbein og ryggstolpe
    frame.push(tube(r, [x, 0.41, 0.19], [x, 0.41, -0.2])); // stag under setet
  }
  frame.push(tube(r, [-w, 0.16, 0.19], [w, 0.16, 0.19]), tube(r, [-w, 0.16, -0.2], [w, 0.16, -0.2]));
  const seat = box(0.44, 0.07, 0.43, 0, 0.46, 0);
  const rest = box(0.42, 0.27, 0.05, 0, 0, 0);
  rest.rotateX(-Math.atan(tilt));
  rest.translate(0, 0.74, back(0.74) - 0.02);
  return { frame, vinyl: [seat, rest] };
}

/** Kafébordet: rundt bord med søyle og tre stoler i burgunder vinyl som vender mot bordet. */
function cafe() {
  const frame = [];
  const vinyl = [];
  for (const a of [Math.PI * 0.15, Math.PI * 0.85, Math.PI * 1.5]) {
    const c = chair();
    const ry = Math.atan2(-Math.cos(a), -Math.sin(a)); // forsiden mot bordet
    for (const g of [...c.frame, ...c.vinyl]) {
      g.rotateY(ry);
      g.translate(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
    }
    frame.push(...c.frame);
    vinyl.push(...c.vinyl);
  }
  return parts([
    { color: '#ece6d6', geoms: [cylinder(0.4, 0.03, 0, 0.75, 0, 24)] },
    { color: '#3b3b3b', geoms: [cylinder(0.03, 0.72, 0, 0.37, 0), cylinder(0.22, 0.02, 0, 0.01, 0, 20)] },
    { color: '#9a9ca0', geoms: frame },
    { color: '#6e2a2a', geoms: vinyl },
  ]);
}

const BUILDERS = { kiosk, cafe, shelf, wallshelf, counter, soft, playball, halfwall };

/** Delene til en bygget gjenstand (key fra propKey). */
export function buildProp(key) {
  const build = BUILDERS[key.split(':')[0]];
  if (!build) throw new Error(`Unknown prop: ${key}`);
  return build(key);
}
