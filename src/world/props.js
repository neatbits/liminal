// Gjenstander som bygges av enkle former i stedet for modellfiler (OBJECTS med `build`):
// en gatekjøkkenkiosk med opplyst skilt og hvitt, flislagt bakrom, og et kafébord med tre stoler.
// Navnene på kioskene er oppdiktet. Returnerer deler i samme format som de lastede modellene.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Kioskskilt: oppdiktede navn med egen farge. Skolen og sykehuset har sine egne. */
const SIGNS = [
  { name: 'BURGER STOP', color: '#b5262b' },
  { name: 'PIZZA PLAZA', color: '#1f5fa8' },
  { name: 'NOODLE BAR', color: '#d26a1c' },
  { name: 'HOT DOG HUT', color: '#2f8a4a' },
  { name: 'FRIES & CO', color: '#b5262b' },
];
const THEME_SIGNS = { school: { name: 'CAFETERIA', color: '#2c5d8f' }, ward: { name: 'KIOSK', color: '#2f7f6f' } };

/** Hvilken variant en gjenstand får (fast for samme rute): nøkkel til bufferet av ferdige deler. */
export function propKey(def, level, o) {
  if (def.build !== 'kiosk') return def.build;
  if (THEME_SIGNS[level.theme]) return `kiosk:${level.theme}`;
  const h = ((o.x * 73856093) ^ (o.z * 19349663)) >>> 0;
  return `kiosk:${h % SIGNS.length}`;
}

function signOf(key) {
  const v = key.split(':')[1];
  return THEME_SIGNS[v] ?? SIGNS[Number(v) || 0];
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** En enkel burger: to brødhalvdeler og en pølse imellom (ingen kjente logoer). */
function burgerIcon(ctx, x, y, r) {
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.25, r, r * 0.55, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#7a3b1c';
  ctx.fillRect(x - r, y - r * 0.18, r * 2, r * 0.3);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(x - r, y + r * 0.2, r * 2, r * 0.3);
}

function signTexture(sign) {
  return canvasTexture(512, 80, (ctx, w, h) => {
    ctx.fillStyle = sign.color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign.name, w / 2 + 24, h / 2 + 3);
    burgerIcon(ctx, 52, h / 2 + 4, 22);
  });
}

function counterTexture(sign) {
  return canvasTexture(512, 170, (ctx, w, h) => {
    ctx.fillStyle = sign.color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, h - 14, w, 14);
    burgerIcon(ctx, w / 2, h / 2, 36);
  });
}

function tileTexture() {
  const t = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c9ccc9';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f5f2';
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) ctx.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 5);
  return t;
}

function menuTexture() {
  return canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#1d1d1f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3e7c7';
    ctx.font = '13px Arial, sans-serif';
    const rows = ['MEAL 1 ....... 4.99', 'MEAL 2 ....... 5.49', 'MEAL 3 ....... 6.29', 'DRINKS ....... 1.99'];
    rows.forEach((r, k) => ctx.fillText(r, 16, 22 + k * 20));
    ctx.fillText('OPEN 24 HOURS', 150, 22);
  });
}

/** Boks med midtpunkt (x, y, z) og størrelse (w, h, d), dreid ry om loddaksen. */
function box(w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

function cylinder(r, h, x, y, z, seg = 16) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(x, y, z);
  return g;
}

/** Slår sammen geometriene for hver del: [{ geometry, color, map, unlit }]. */
function parts(groups) {
  return groups.map(({ geoms, color, map = null, unlit = false }) => {
    const geometry = mergeGeometries(geoms.map((g) => g.toNonIndexed()));
    for (const g of geoms) g.dispose();
    return { geometry, map, arm: null, color: new THREE.Color(color), alphaTest: 0, side: THREE.FrontSide, unlit };
  });
}

/** Kiosken: 3 m bred, 2,6 m høy og 1,5 m dyp, åpningen (forsiden) mot +z. */
function kiosk(key) {
  const sign = signOf(key);
  const W = 3;
  const D = 1.5;
  const H = 2.6;
  const zf = D / 2;
  return parts([
    // Bakrommet: hvite fliser og et lyspanel i taket – lyser av seg selv, som på et gatekjøkken.
    { color: '#ffffff', map: tileTexture(), unlit: true, geoms: [box(W - 0.16, H - 0.1, 0.04, 0, H / 2, -zf + 0.03)] },
    { color: '#fbfbf6', unlit: true, geoms: [box(1.4, 0.03, 0.5, 0, H - 0.1, -0.2)] },
    { color: '#ffffff', map: menuTexture(), unlit: true, geoms: [box(1.2, 0.45, 0.03, 0.35, 1.95, -zf + 0.07)] },
    // Sider, tak og en hylle bak disken.
    { color: '#e6dcc4', geoms: [box(0.08, H, D, -W / 2 + 0.04, H / 2, 0), box(0.08, H, D, W / 2 - 0.04, H / 2, 0), box(W, 0.06, D, 0, H - 0.03, 0), box(W - 0.16, 0.04, 0.35, 0, 1.1, -zf + 0.25)] },
    // Kjøleskap og to maskiner på hylla.
    { color: '#a9aeb1', geoms: [box(0.6, 1.85, 0.5, -0.95, 0.93, -zf + 0.32), box(0.3, 0.32, 0.28, 0.3, 1.28, -zf + 0.22), box(0.3, 0.32, 0.28, 0.8, 1.28, -zf + 0.22)] },
    // Disken: front med logo, benkeplate i stål og en mørk sokkel.
    { color: '#ffffff', map: counterTexture(sign), geoms: [box(W - 0.16, 0.95, 0.08, 0, 0.55, zf - 0.08)] },
    { color: '#c3c6c4', geoms: [box(W - 0.16, 0.05, 0.45, 0, 1.05, zf - 0.22)] },
    { color: '#3a3a38', geoms: [box(W - 0.16, 0.1, 0.1, 0, 0.05, zf - 0.06)] },
    // Det opplyste skiltet over åpningen.
    { color: '#ffffff', map: signTexture(sign), unlit: true, geoms: [box(W, 0.45, 0.08, 0, H - 0.29, zf - 0.04)] },
  ]);
}

/** Kafébordet: rundt bord med søyle og tre stoler i burgunder vinyl. */
function cafe() {
  const seat = [];
  const legs = [];
  for (const a of [Math.PI * 0.15, Math.PI * 0.85, Math.PI * 1.5]) {
    const cx = Math.cos(a) * 0.58;
    const cz = Math.sin(a) * 0.58;
    const ry = -a - Math.PI / 2; // stolen vender mot bordet
    const out = [Math.cos(a), Math.sin(a)];
    seat.push(box(0.42, 0.06, 0.42, cx, 0.46, cz, ry));
    seat.push(box(0.42, 0.36, 0.05, cx + out[0] * 0.2, 0.72, cz + out[1] * 0.2, ry));
    for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
      const c = Math.cos(-ry);
      const s = Math.sin(-ry);
      legs.push(box(0.025, 0.44, 0.025, cx + lx * c - lz * s, 0.22, cz + lx * s + lz * c));
    }
  }
  return parts([
    { color: '#ece6d6', geoms: [cylinder(0.4, 0.03, 0, 0.75, 0, 24)] },
    { color: '#3b3b3b', geoms: [cylinder(0.03, 0.72, 0, 0.37, 0), cylinder(0.22, 0.02, 0, 0.01, 0, 20), ...legs] },
    { color: '#6e2a2a', geoms: seat },
  ]);
}

const BUILDERS = { kiosk, cafe };

/** Delene til en bygget gjenstand (key fra propKey). */
export function buildProp(key) {
  const build = BUILDERS[key.split(':')[0]];
  if (!build) throw new Error(`Unknown prop: ${key}`);
  return build(key);
}
