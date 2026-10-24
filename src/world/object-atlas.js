// Teksturatlas per modell: deler med hver sin tekstur (men ellers likt utseende) får teksturene
// samlet i ett canvas, og UV-ene regnes om, så object-parts.js kan slå dem sammen til ett
// tegnekall. Bare deler med UV innenfor 0–1 (ingen gjentakelse) og glTF-retning (flipY = false).
// Hver flis får en kant der ytterste piksel er strukket ut, så mipmaps ikke blør inn fra naboen.
import * as THREE from 'three';

export const ATLAS_PAD = 8;
export const ATLAS_LIMIT = 4096; // støttes av alle WebGL2-enheter vi bryr oss om

/**
 * Hyllepakking av fliser [w, h] med kant `pad` rundt hver. Ren logikk.
 * @returns {{ width, height, at: Array<[x, y]> } | null} null hvis atlaset blir større enn limit
 */
export function packTiles(sizes, pad = ATLAS_PAD, limit = ATLAS_LIMIT) {
  const area = sizes.reduce((s, [w, h]) => s + (w + 2 * pad) * (h + 2 * pad), 0);
  const widest = Math.max(...sizes.map(([w]) => w + 2 * pad));
  const width = Math.max(widest, Math.ceil(Math.sqrt(area) / 64) * 64);
  if (width > limit) return null;
  const order = sizes.map((s, i) => i).sort((a, b) => sizes[b][1] - sizes[a][1]);
  const at = [];
  let x = 0, y = 0, shelf = 0;
  for (const i of order) {
    const [w, h] = [sizes[i][0] + 2 * pad, sizes[i][1] + 2 * pad];
    if (x + w > width) [x, y, shelf] = [0, y + shelf, 0];
    at[i] = [x + pad, y + pad];
    x += w;
    shelf = Math.max(shelf, h);
  }
  const height = y + shelf;
  return height > limit ? null : { width, height, at };
}

const inUnitSquare = (uv) => uv.array.every((v) => v >= -1e-3 && v <= 1 + 1e-3);

function canvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  if (typeof document === 'undefined') return null; // Node (tester): ingen atlas
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

/** Tegner bildet med utstrakte kanter (ATLAS_PAD) rundt. */
function drawTile(ctx, img, x, y, w, h, p) {
  ctx.drawImage(img, x, y, w, h);
  ctx.drawImage(img, 0, 0, w, 1, x, y - p, w, p);
  ctx.drawImage(img, 0, h - 1, w, 1, x, y + h, w, p);
  ctx.drawImage(img, 0, 0, 1, h, x - p, y, p, h);
  ctx.drawImage(img, w - 1, 0, 1, h, x + w, y, p, h);
  for (const [sx, sy, dx, dy] of [[0, 0, x - p, y - p], [w - 1, 0, x + w, y - p], [0, h - 1, x - p, y + h], [w - 1, h - 1, x + w, y + h]]) {
    ctx.drawImage(img, sx, sy, 1, 1, dx, dy, p, p);
  }
}

function buildAtlas(maps) {
  const sizes = maps.map((m) => [m.image.width, m.image.height]);
  const plan = packTiles(sizes);
  const c = plan && canvas(plan.width, plan.height);
  const ctx = c?.getContext('2d');
  if (!ctx) return null;
  maps.forEach((m, i) => drawTile(ctx, m.image, ...plan.at[i], ...sizes[i], ATLAS_PAD));
  const texture = new THREE.CanvasTexture(c);
  Object.assign(texture, { flipY: false, colorSpace: maps[0].colorSpace, anisotropy: maps[0].anisotropy });
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  const rects = new Map(maps.map((m, i) => [m, [plan.at[i][0] / plan.width, plan.at[i][1] / plan.height, sizes[i][0] / plan.width, sizes[i][1] / plan.height]]));
  return { texture, rects };
}

/** Samme geometri, med UV-ene flyttet inn i flisen [x, y, w, h] (andeler av atlaset). */
function remap(geometry, [x, y, w, h]) {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geometry.attributes)) if (name !== 'uv') out.setAttribute(name, attr);
  if (geometry.index) out.setIndex(geometry.index);
  const src = geometry.attributes.uv.array, uv = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 2) [uv[i], uv[i + 1]] = [x + src[i] * w, y + src[i + 1] * h];
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

/** @param look nøkkel for alt annet enn teksturen (object-parts.js) */
export function atlasParts(parts, look) {
  const groups = new Map();
  for (const p of parts) {
    const ok = p.map && !p.arm && p.map.flipY === false && p.map.image?.width && p.geometry.attributes.uv && inUnitSquare(p.geometry.attributes.uv);
    if (!ok) continue;
    const k = look(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const replaced = new Map();
  for (const group of groups.values()) {
    const maps = [...new Set(group.map((p) => p.map))];
    if (maps.length < 2) continue;
    const atlas = buildAtlas(maps);
    if (!atlas) continue;
    for (const p of group) replaced.set(p, { ...p, map: atlas.texture, geometry: remap(p.geometry, atlas.rects.get(p.map)) });
  }
  return parts.map((p) => replaced.get(p) ?? p);
}
