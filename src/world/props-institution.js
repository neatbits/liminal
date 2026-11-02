// Innredning av enkle former til skole, sykehus og parkering (core/object-catalog-rooms.js), forsiden mot +z og
// bunnen i y = 0: bokhylle, basketkurv, operasjonsbord og -lampe, likskap, båre og tildekket bil.
import * as THREE from 'three';
import { box, cylinder, parts } from './props-geo.js';

const STEEL = '#a8aeb1';
const DARK = '#2c2e31';

/** Står fritt i rader: bøker på begge sider, en tynn midtvegg imellom. */
export function bookshelf() {
  const [w, h, d] = [1.8, 2.1, 0.36];
  const levels = [0.08, 0.5, 0.92, 1.34, 1.76];
  const spines = [[], [], [], []];
  levels.forEach((y, k) => {
    let x = -w / 2 + 0.05;
    for (let i = 0; x < w / 2 - 0.1; i++) {
      const hash = (k * 31 + i * 17) % 23;
      const t = 0.06 + (hash % 5) * 0.02;
      const tall = 0.24 + (hash % 7) * 0.016;
      if (hash % 11 !== 3) for (const side of [-1, 1]) spines[hash % 4].push(box(t, tall, 0.14, x + t / 2, y + 0.02 + tall / 2, side * 0.09));
      x += t + 0.004;
    }
  });
  return parts([
    { color: '#6b4a2c', geoms: [box(0.03, h, d, -w / 2, h / 2, 0), box(0.03, h, d, w / 2, h / 2, 0), box(w, h, 0.02, 0, h / 2, 0), box(w, 0.03, d, 0, h - 0.015, 0),
      ...levels.map((y) => box(w, 0.03, d, 0, y, 0))] },
    { color: '#7c2f2a', geoms: spines[0] },
    { color: '#2f4a68', geoms: spines[1] },
    { color: '#a58a4e', geoms: spines[2] },
    { color: '#3a5a42', geoms: spines[3] },
  ]);
}

export function hoop() {
  return parts([
    { color: '#e8e8e2', geoms: [box(1.8, 1.05, 0.03, 0, 0.62, -0.35)] },
    { color: '#c9472b', geoms: [box(0.6, 0.02, 0.008, 0, 0.72, -0.33), box(0.6, 0.02, 0.008, 0, 0.3, -0.33), box(0.02, 0.44, 0.008, -0.3, 0.51, -0.33), box(0.02, 0.44, 0.008, 0.3, 0.51, -0.33)] },
    { color: '#d9522a', geoms: [...Array.from({ length: 16 }, (_, k) => {
      const a = (k / 16) * Math.PI * 2;
      return box(0.05, 0.02, 0.02, Math.cos(a) * 0.23, 0.32, 0.05 + Math.sin(a) * 0.23, -a);
    })] },
    { color: '#6c7074', geoms: [box(0.1, 0.1, 0.5, 0, 0.56, -0.12)] },
  ]);
}

export function ortable() {
  return parts([
    { color: '#30383a', geoms: [box(0.6, 0.08, 2, 0, 0.9, 0), box(0.54, 0.06, 0.4, 0, 0.97, -0.75)] },
    { color: STEEL, geoms: [box(0.2, 0.84, 0.3, 0, 0.44, 0), box(0.7, 0.04, 1, 0, 0.02, 0)] },
  ]);
}

export function surgicallamp() {
  return parts([
    { color: '#c9cfd2', geoms: [cylinder(0.42, 0.1, 0, 0.1, 0, 24), cylinder(0.03, 0.5, 0, 0.4, 0, 8)] },
    { color: '#f4fbff', unlit: true, geoms: [cylinder(0.34, 0.02, 0, 0.045, 0, 24)] },
  ]);
}

export function morguewall() {
  const [w, h] = [1.9, 2.1];
  const fronts = [];
  const handles = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const [x, y] = [-0.47 + c * 0.94, 0.38 + r * 0.68];
      fronts.push(box(0.88, 0.62, 0.02, x, y, 0.36));
      handles.push(box(0.2, 0.03, 0.03, x, y + 0.16, 0.385));
    }
  }
  return parts([
    { color: '#868d90', geoms: [box(w, h, 0.72, 0, h / 2, 0)] },
    { color: '#b4babc', geoms: fronts },
    { color: DARK, geoms: handles },
  ]);
}

/** Båren: et laken over noe som ikke skal ses for tydelig. */
export function gurney() {
  const sheet = new THREE.BoxGeometry(0.62, 0.3, 1.9, 6, 3, 18);
  const p = sheet.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const hump = 0.5 + 0.5 * Math.sin((z + 0.95) * 1.65) + (z > 0.55 ? 0.35 : 0);
    if (y > 0) p.setY(i, y - 0.15 + 0.06 + 0.22 * hump * Math.max(0, 1 - (x / 0.31) ** 4));
  }
  sheet.computeVertexNormals();
  sheet.translate(0, 0.92, 0);
  return parts([
    { color: '#d9dcd8', geoms: [sheet] },
    { color: STEEL, geoms: [box(0.66, 0.04, 2, 0, 0.8, 0), ...[-1, 1].flatMap((x) => [-1, 1].map((z) => box(0.03, 0.78, 0.03, x * 0.3, 0.39, z * 0.9)))] },
  ]);
}

const TARPS = ['#6f7377', '#4b5c6e', '#8a7f68'];

/** En bil under presenning: en glatt form med folder. key = coveredcar:variant. */
export function coveredcar(key) {
  const tarp = new THREE.BoxGeometry(1.84, 1.42, 4.3, 16, 8, 32);
  const p = tarp.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i) + 0.71, p.getZ(i)];
    const cabin = Math.max(0, 1 - ((z + 0.3) / 1.25) ** 4); // taket er høyest litt bak midten
    const top = 0.82 + 0.6 * cabin;
    const edge = Math.max(0, 1 - Math.abs(x / 0.92) ** 5) * Math.max(0, 1 - Math.abs(z / 2.15) ** 6);
    const fold = 0.02 * Math.sin(z * 7 + x * 3) + 0.012 * Math.sin(x * 11 - z * 4);
    p.setY(i, (y / 1.42) * top * (0.55 + 0.45 * edge) + fold * (y / 1.42));
  }
  tarp.computeVertexNormals();
  return parts([{ color: TARPS[Number(key.split(':')[1]) % TARPS.length], geoms: [tarp] }]);
}
