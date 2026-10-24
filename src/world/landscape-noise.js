// Én liten, deterministisk støykilde per utsiktsmateriale. GPU-en filtrerer og
// minifiserer den i stedet for å beregne mange sinusbaserte støyverdier per piksel.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';

export function landscapeNoise() {
  const size = 128, data = new Uint8Array(size * size), random = mulberry32(29);
  for (let i = 0; i < data.length; i++) data[i] = Math.floor(random() * 256);
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
