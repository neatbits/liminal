// Teksturregister: lager canvas-teksturer ved behov og bufrer dem.
import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';
import { wallpaperYellow, carpetDamp, ceilingTiles } from './yellow.js';
import { poolTiles, poolTilesBlue, officeWall, officeCarpet, tileWallWhite, tileFloorGrey } from './tiles.js';
import { concreteWall, concreteFloor, garagePaint } from './concrete.js';
import { hotelCarpet, hotelWallpaper, hotelWood, plaster } from './hotel.js';
import { carpetClean, paintBeige } from './basement.js';
import { doorPanel, doorLouver, doorFlat } from './doors.js';
import { foamMat, playWall, playStripe, ballBed } from './playroom.js';
import { mallFloor, mallWall, mallStone, mallCeiling } from './mall.js';
import { schoolFloor, blockWall, lockers, wardFloor, wardMint } from './school.js';

const PAINTERS = {
  wallpaperYellow,
  carpetDamp,
  ceilingTiles,
  poolTiles,
  poolTilesBlue,
  officeWall,
  officeCarpet,
  concreteWall,
  concreteFloor,
  garagePaint,
  hotelCarpet,
  hotelWallpaper,
  hotelWood,
  plaster,
  carpetClean,
  paintBeige,
  tileWallWhite,
  tileFloorGrey,
  foamMat,
  playWall,
  playStripe,
  ballBed,
  mallFloor,
  mallWall,
  mallStone,
  mallCeiling,
  schoolFloor,
  blockWall,
  lockers,
  wardFloor,
  wardMint,
  // Dørblad per tema
  doorFlatCream: doorFlat('#d6c99c'),
  doorFlatWhite: doorFlat('#e7ecea'),
  doorVeneer: doorFlat('#b48c5c', { grain: true }),
  doorSteel: doorFlat('#66705f'),
  doorPanelWood: doorPanel('#5b3a22', { grain: true }),
  doorPanelWhite: doorPanel('#f1eee7'),
  doorLouverWhite: doorLouver('#efece4'),
};

const cache = new Map();

function seedFor(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Henter (og lager første gang) teksturen for nøkkelen. */
export function getTexture(key, anisotropy = 4) {
  let tex = cache.get(key);
  if (tex) return tex;
  const painter = PAINTERS[key];
  if (!painter) throw new Error(`Unknown texture: ${key}`);
  tex = new THREE.CanvasTexture(painter(mulberry32(seedFor(key))));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

export function textureKeys() {
  return Object.keys(PAINTERS);
}

export function disposeTextures() {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}
