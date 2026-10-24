// Shared geometry and lazy, cached texture pairs: no duplicate GLBs for game variants.
import * as THREE from 'three';
import { arcadeVariant } from '../core/arcades.js';

const URLS = Object.fromEntries(Object.entries(import.meta.glob('../assets/arcade/*.webp', { query: '?url', import: 'default', eager: true }))
  .map(([path, url]) => [path.split('/').pop(), url]));
const loader = new THREE.TextureLoader();
const textures = new Map();
const variants = new WeakMap();

function texture(name) {
  if (!textures.has(name)) textures.set(name, loader.loadAsync(URLS[name]).then(map => {
    map.flipY = false; // glTF UV convention; the generator flips each artwork region.
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }));
  return textures.get(name);
}

export function arcadeParts(parts, o) {
  if (!variants.has(parts)) variants.set(parts, new Map());
  const cache = variants.get(parts), v = arcadeVariant(o), prefix = String(v).padStart(2, '0');
  if (!cache.has(v)) cache.set(v, Promise.all(parts.map(async part => {
    const region = part.materialName === 'ParteFrontal' ? 'front' : part.materialName === 'Caixa' ? 'panel' : null;
    return region ? { ...part, map: await texture(`${prefix}-${region}.webp`) } : part;
  })));
  return cache.get(v);
}
