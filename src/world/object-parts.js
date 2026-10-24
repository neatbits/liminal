// Færre deler per modell, så hver gjenstand blir færre tegnekall: deler med likt materiale slås
// sammen, teksturerte deler med ellers likt utseende deler et atlas (object-atlas.js), og rene
// fargedeler (uten tekstur) samles på en liten palett-tekstur med farger i lineært rom og
// nærmeste-filtrering – shaderen ganger tekstur med uColor (her 1), så fargen blir den samme som
// før. Resultatet bufres per modell; lyset bakes etterpå som før.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { atlasParts } from './object-atlas.js';

const merged = new WeakMap();

const flags = (p) => [p.alphaTest, p.side, !!p.unlit, !!p.vinyl].join();
/** Alt ved utseendet unntatt teksturene: deler med samme stil kan dele atlas. */
const style = (p) => `${p.color.r},${p.color.g},${p.color.b}|${flags(p)}`;

/** Det som gjør to deler ulike for shaderen (objects.js materialFor), unntatt fargen på fargedeler. */
function look(p) {
  if (!p.map && !p.arm) return `flat|${flags(p)}`;
  return `${p.map?.uuid}|${p.arm?.uuid}|${style(p)}`;
}

/** Felles posisjon/normal/uv; alle indekserte eller alle uten indeks (krav i mergeGeometries). */
function prepare(geometries) {
  const indexed = geometries.every((g) => g.index);
  return geometries.map((g) => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) if (g.attributes[name]) out.setAttribute(name, g.attributes[name]);
    if (g.index) out.setIndex(g.index);
    return indexed || !out.index ? out : out.toNonIndexed();
  });
}

function flatUV(geometry, u) {
  const uv = new Float32Array(geometry.attributes.position.count * 2);
  for (let i = 0; i < uv.length; i += 2) [uv[i], uv[i + 1]] = [u, 0.5];
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function palette(colors) {
  const data = new Float32Array(colors.length * 4);
  colors.forEach((c, i) => data.set([c.r, c.g, c.b, 1], i * 4));
  const texture = new THREE.DataTexture(data, colors.length, 1, THREE.RGBAFormat, THREE.FloatType);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function mergeGroup(group) {
  const flat = !group[0].map && !group[0].arm;
  const geometries = prepare(group.map((p) => p.geometry));
  if (flat) geometries.forEach((g, i) => flatUV(g, (i + 0.5) / group.length));
  else if (geometries.some((g) => !g.attributes.uv)) return group;
  const geometry = mergeGeometries(geometries);
  if (!geometry) return group;
  return [{
    ...group[0],
    geometry,
    ...(flat ? { map: palette(group.map((p) => p.color)), color: new THREE.Color(1, 1, 1) } : {}),
    overhang: group.every((p) => p.overhang), // brukes bare når modellen sentreres (før dette)
  }];
}

/** @param parts [{ geometry, map, arm, color, alphaTest, side, unlit?, vinyl? }] (sentrert) */
export function mergeParts(parts) {
  if (!merged.has(parts)) {
    const groups = new Map();
    for (const p of atlasParts(parts, style)) {
      const k = look(p);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    }
    merged.set(parts, [...groups.values()].flatMap((g) => (g.length > 1 ? mergeGroup(g) : g)));
  }
  return merged.get(parts);
}
