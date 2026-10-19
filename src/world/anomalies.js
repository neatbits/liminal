// Romlige avvik i gåmodus: ganger som er lengre innenfra enn utenfra. En rett gang der vegger,
// dører, lys og gjenstander gjentar seg med en fast periode L (f.eks. en dør hver 6. meter og et lys
// hver 3.) kan gjøres uendelig: krysser man midten, flyttes man sømløst én periode tilbake – alt
// rundt ser likt ut, men enden av gangen kommer aldri nærmere. Etter noen runder slipper gangen
// taket. Ren logikk (ingen three.js).
import { TILE, LAYERS } from '../core/level.js';

const MAX_WIDTH = 4; // bredere enn dette er et rom, ikke en gang
const SIDE = 3; // så mange ruter på hver side av gangen må også gjenta seg (dører, nisjer)
const MIN_LEN = 12;

/** Er ruten (u, v) åpen? u langs gangen, v på tvers. */
function makeAccess(level, axis) {
  const { w, h } = level;
  const index = axis === 'x' ? (u, v) => (v >= 0 && v < h && u >= 0 && u < w ? v * w + u : -1) : (u, v) => (u >= 0 && u < h && v >= 0 && v < w ? u * w + v : -1);
  return { index, along: axis === 'x' ? w : h, across: axis === 'x' ? h : w };
}

/**
 * Finner uendelige ganger: [{ axis, u0, u1, v0, v1, L, mid }] – gangen går langs aksen (x eller z)
 * fra u0 til u1 (inkludert) med åpne ruter v0..v1 på tvers, og gjentar seg med perioden L.
 * mid er linjen (u-koordinat) der man flyttes én periode.
 */
export function findLoops(level) {
  const out = [];
  const objectsAt = new Map();
  for (const o of level.objects ?? []) objectsAt.set(o.z * level.w + o.x, `${objectsAt.get(o.z * level.w + o.x) ?? ''}${o.id}:${o.rot};`);
  for (const axis of ['x', 'z']) {
    const { index, along, across } = makeAccess(level, axis);
    const open = (u, v) => {
      const i = index(u, v);
      return i >= 0 && level.tiles[i] !== TILE.WALL;
    };
    // En gang: rader s..e som er åpne langs en strekning, med vegg rett på begge sider de fleste
    // steder. Side-åpninger (dører, nisjer) er lov så lenge alt bak dem ligger innenfor SIDE ruter –
    // ellers ville man sett noe som ikke gjentar seg.
    const seen = new Set();
    const spanOk = (k, s, e) => {
      for (let t = s; t <= e; t++) if (!open(k, t)) return false;
      let lo = s;
      let hi = e;
      while (open(k, lo - 1)) if (--lo < s - SIDE) return false;
      while (open(k, hi + 1)) if (++hi > e + SIDE) return false;
      return true;
    };
    const walled = (k, s, e) => !open(k, s - 1) && !open(k, e + 1);
    for (let v = 0; v < across; v++) {
      for (let u = 0; u < along; u++) {
        if (!open(u, v)) continue;
        let s = v;
        let e = v;
        while (open(u, s - 1)) s--;
        while (open(u, e + 1)) e++;
        if (e - s + 1 > MAX_WIDTH || seen.has(`${u}:${s},${e}`)) continue;
        let a = u;
        let b = u;
        while (spanOk(a - 1, s, e)) a--;
        while (spanOk(b + 1, s, e)) b++;
        let walls = 0;
        for (let k = a; k <= b; k++) {
          seen.add(`${k}:${s},${e}`);
          if (walled(k, s, e)) walls++;
        }
        if (b - a + 1 >= MIN_LEN && walls >= (b - a + 1) * 0.5) {
          const loop = periodic(level, index, axis, a, b, s, e, objectsAt);
          if (loop) out.push(loop);
        }
      }
    }
  }
  return out;
}

/** Den lengste periodiske delen av strekningen u0..u1, eller null. */
function periodic(level, index, axis, u0, u1, s, e, objectsAt) {
  const sig = [];
  for (let u = u0; u <= u1; u++) {
    let str = '';
    for (let v = s - SIDE; v <= e + SIDE; v++) {
      const i = index(u, v);
      if (i < 0) {
        str += '#|';
        continue;
      }
      for (const key of LAYERS) str += `${level[key][i]},`;
      str += `${objectsAt.get(i) ?? ''}|`;
    }
    sig.push(str);
  }
  let best = null;
  for (let L = 2; L <= Math.min(40, Math.floor(sig.length / 3)); L++) {
    let run = 0;
    for (let k = 0; k + L < sig.length; k++) {
      run = sig[k] === sig[k + L] ? run + 1 : 0;
      // Strekningen [k − run + 1, k + L] gjentar seg; minst tre perioder.
      const len = run + L;
      if (len >= Math.max(3 * L, MIN_LEN) && (!best || len > best.len)) best = { L, a: k - run + 1, len };
    }
  }
  if (!best) return null;
  const a = u0 + best.a;
  const b = a + best.len - 1;
  const mid = a + Math.floor((b - a + 1) / 2);
  if (mid - best.L < a || mid + best.L > b + 1) return null;
  return { axis, u0: a, u1: b, v0: s, v1: e, L: best.L, mid };
}

/** Lengdene teksturene gjentar seg med (m), fra temaets flater – flyttingen må gå opp i dem. */
export function textureRepeats(theme) {
  const s = theme.surfaces;
  const out = [];
  for (const def of [s.floor, s.ceiling]) if (def?.size) out.push(...def.size);
  for (const def of [s.wall, s.wall2, theme.tiles?.floor, theme.tiles?.wall]) if (def?.size) out.push(def.size[0]);
  return out;
}

/**
 * Hvor langt man flyttes: det minste multiplum av perioden som også går opp i teksturene (ellers
 * ville teppet eller tapetet hoppet), og som får plass i gangen. 0 = gangen kan ikke brukes.
 */
export function loopShift(loop, repeats = []) {
  const fits = (n) => repeats.every((r) => Math.abs(n / r - Math.round(n / r)) < 0.02);
  for (let k = 1; k * loop.L <= Math.min(loop.mid - loop.u0, loop.u1 + 1 - loop.mid); k++) if (fits(k * loop.L)) return k * loop.L;
  return 0;
}

/** Holder styr på rundene i hver uendelige gang mens man går. */
export class Loops {
  /**
   * @param laps [min, maks] antall runder før gangen slipper taket
   * @param repeats teksturlengdene (textureRepeats) flyttingen må gå opp i
   */
  constructor(level, rand = Math.random, laps = [1, 2], repeats = []) {
    this.loops = findLoops(level)
      .map((l) => ({ ...l, shift: loopShift(l, repeats), left: laps[0] + Math.floor(rand() * (laps[1] - laps[0] + 1)) }))
      .filter((l) => l.shift && l.left > 0);
  }

  /**
   * Etter at gåeren har flyttet seg fra (px, pz) til walker.x/z: krysset den midtlinjen i en
   * uendelig gang, flyttes den én periode tilbake. Returnerer gangen (eller null).
   */
  update(px, pz, walker) {
    for (const l of this.loops) {
      if (l.left <= 0) continue;
      const [u0, u1, v] = l.axis === 'x' ? [px, walker.x, walker.z] : [pz, walker.z, walker.x];
      if (v < l.v0 || v > l.v1 + 1) continue;
      let shift = 0;
      if (u0 < l.mid && u1 >= l.mid) shift = -l.shift; // videre langs aksen: tilbake én periode (eller flere)
      else if (u0 >= l.mid && u1 < l.mid) shift = l.shift; // motsatt vei
      if (!shift) continue;
      if (l.axis === 'x') walker.x += shift;
      else walker.z += shift;
      l.left--;
      return l;
    }
    return null;
  }
}
