// Gatekjøkkenkiosken (bygget i koden, se props.js): 3 m bred, 2,6 m høy og 1,5 m dyp, åpningen mot
// +z. Opplyst skilt med ramme, stripete markise, disk med paneler og ting på benken, menytavle med
// bilder, kjøleskap med glassdør, brusautomat og frityr/grill bak. Navnene er oppdiktet; ikonet
// passer til maten (props-kiosk-art.js).
import * as THREE from 'three';
import { box, cylinder, parts } from './props-geo.js';
import { canvasTexture, signTexture, counterTexture, menuTexture, awningTexture, fridgeTexture, sodaTexture } from './props-kiosk-art.js';

/** Kioskskilt: oppdiktede navn med egen farge og et ikon. Skolen og sykehuset har sine egne. */
export const SIGNS = [
  { name: 'BURGER STOP', color: '#b5262b', icon: 'burger' },
  { name: 'PIZZA PLAZA', color: '#1f5fa8', icon: 'pizza' },
  { name: 'NOODLE BAR', color: '#d26a1c', icon: 'noodles' },
  { name: 'HOT DOG HUT', color: '#2f8a4a', icon: 'hotdog' },
  { name: 'FRIES & CO', color: '#b5262b', icon: 'fries' },
];
export const THEME_SIGNS = {
  school: { name: 'CAFETERIA', color: '#2c5d8f', icon: 'tray' },
  ward: { name: 'KIOSK', color: '#2f7f6f', icon: 'coffee' },
};

function signOf(key) {
  const v = key.split(':')[1];
  return THEME_SIGNS[v] ?? SIGNS[Number(v) || 0];
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

/** Markisen: en skrå plate fra skiltet og ut over disken, med en kant som henger ned foran. */
function awning(W, y, z) {
  const slope = box(W + 0.1, 0.03, 0.5, 0, 0, 0);
  slope.rotateX(0.38);
  slope.translate(0, y, z + 0.2);
  const lip = box(W + 0.1, 0.1, 0.02, 0, y - 0.13, z + 0.43);
  return [slope, lip];
}

export function kiosk(key) {
  const sign = signOf(key);
  const W = 3;
  const D = 1.5;
  const H = 2.6;
  const zf = D / 2;
  const inner = W - 0.16;
  const back = -zf + 0.03;
  return parts([
    // Bakrommet: hvite fliser og et lyspanel i taket – lyser av seg selv, som på et gatekjøkken.
    { color: '#ffffff', map: tileTexture(), unlit: true, geoms: [box(inner, H - 0.1, 0.04, 0, H / 2, back)] },
    { color: '#fbfbf6', unlit: true, geoms: [box(1.6, 0.03, 0.5, 0, H - 0.1, -0.2)] },
    // Menytavla med bilder (opplyst) over bakbenken.
    { color: '#ffffff', map: menuTexture(sign), unlit: true, geoms: [box(1.5, 0.56, 0.03, 0.42, 1.72, back + 0.04)] },
    { color: '#2b2b2b', geoms: [box(1.56, 0.62, 0.02, 0.42, 1.72, back + 0.02)] },
    // Sider og tak i krem, hjørnestolper i kioskens farge.
    { color: '#ece3cc', geoms: [box(0.08, H, D, -W / 2 + 0.04, H / 2, 0), box(0.08, H, D, W / 2 - 0.04, H / 2, 0), box(W + 0.04, 0.06, D + 0.02, 0, H - 0.025, 0.01)] },
    // Litt tykkere enn veggene, så flatene ikke ligger oppå hverandre (flimring).
    { color: sign.color, geoms: [box(0.11, H, 0.11, -W / 2 + 0.045, H / 2, zf - 0.05), box(0.11, H, 0.11, W / 2 - 0.045, H / 2, zf - 0.05), box(0.09, 0.35, D - 0.1, -W / 2 + 0.04, 0.2, 0), box(0.09, 0.35, D - 0.1, W / 2 - 0.04, 0.2, 0)] },
    // Bakbenken i stål og en gummimatte innenfor disken.
    { color: '#b9bdbf', geoms: [box(inner, 0.9, 0.5, 0, 0.45, back + 0.27), box(inner, 0.04, 0.55, 0, 0.92, back + 0.29)] },
    { color: '#2e2e2c', geoms: [box(inner, 0.01, 0.6, 0, 0.005, -0.05)] },
    // Kjøleskap med glassdør (lyser svakt), brusautomat og frityr/grill på bakbenken.
    { color: '#d8dcde', geoms: [box(0.62, 1.95, 0.55, -1.05, 0.975, back + 0.3)] },
    { color: '#ffffff', map: fridgeTexture(), unlit: true, geoms: [box(0.52, 1.6, 0.02, -1.05, 1.05, back + 0.585)] },
    { color: '#ffffff', map: sodaTexture(), geoms: [box(0.42, 0.42, 0.3, 0.05, 1.15, back + 0.2)] },
    { color: '#9ea3a6', geoms: [box(0.5, 0.22, 0.42, 0.65, 1.05, back + 0.25), box(0.42, 0.04, 0.34, 0.65, 1.17, back + 0.25), box(0.5, 0.3, 0.42, 1.18, 1.09, back + 0.25)] },
    { color: '#1e1e1e', geoms: [box(0.4, 0.02, 0.32, 1.18, 1.25, back + 0.25), box(0.36, 0.015, 0.28, 0.65, 1.195, back + 0.25)] },
    // Disken: front med paneler og ikon, benkeplate i stål med kant, mørk sokkel.
    { color: '#ffffff', map: counterTexture(sign), geoms: [box(inner, 0.95, 0.08, 0, 0.55, zf - 0.08)] },
    { color: '#c9cccb', geoms: [box(inner + 0.06, 0.05, 0.5, 0, 1.05, zf - 0.2)] },
    { color: '#c9cccb', overhang: true, geoms: [box(inner + 0.06, 0.06, 0.02, 0, 1.03, zf + 0.04)] },
    { color: '#2f2f2d', geoms: [box(inner, 0.1, 0.1, 0, 0.05, zf - 0.06)] },
    // På disken: kasseapparat, serviettholder og ketchup og sennep.
    { color: '#2a2a2c', geoms: [box(0.34, 0.12, 0.28, -0.85, 1.135, zf - 0.25), box(0.3, 0.2, 0.03, -0.85, 1.29, zf - 0.32), box(0.12, 0.06, 0.12, 0.55, 1.105, zf - 0.15)] },
    { color: '#f4f4f0', geoms: [box(0.08, 0.04, 0.1, 0.55, 1.15, zf - 0.15)] },
    { color: '#c4322c', geoms: [cylinder(0.03, 0.18, 0.78, 1.165, zf - 0.13, 10)] },
    { color: '#e8c21e', geoms: [cylinder(0.03, 0.18, 0.86, 1.165, zf - 0.13, 10)] },
    // Markisen under skiltet, og det opplyste skiltet med mørk ramme over åpningen.
    // Markisen og skiltet stikker litt ut foran (overhang: teller ikke når kiosken sentreres).
    { color: '#ffffff', map: awningTexture(sign), overhang: true, geoms: awning(W, H - 0.55, zf - 0.02) },
    { color: '#ffffff', map: signTexture(sign), unlit: true, overhang: true, geoms: [box(W + 0.02, 0.44, 0.06, 0, H - 0.3, zf + 0.02)] },
    { color: '#26272a', overhang: true, geoms: [box(W + 0.12, 0.52, 0.04, 0, H - 0.3, zf - 0.02)] },
  ]);
}
