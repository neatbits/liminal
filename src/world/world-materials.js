// Surface material definitions, kept separate from world assembly.
import * as THREE from 'three';
import { surfaceMaterial } from './materials.js';
import { shopGlassMaterial } from './shop-glass.js';
import { SIGN_TEXTURES } from './wayfinding.js';
import { skyCanvas, sunCanvas } from '../textures/windows.js';
import { landscapeMaterial } from './window-landscape.js';
import { SLIDE_COLORS } from '../core/slides.js';
import { roofGlassMaterial } from './roof-glass.js';
import { shopInteriorMaterials } from './shop-interiors.js';
const CAP_COLOR = '#55534e';
const MASS_COLOR = '#a7a49c';
const SLIDE_LEGS = '#c6cbcf';

export function worldMaterials({ s, theme, door, railing, tiles, shared, anisotropy, own, sky, bars, level }) {
  return {
    ...shopInteriorMaterials(shared, anisotropy),
    mallRoofGlass:()=>roofGlassMaterial(level),
    mallRoofFrame:()=>surfaceMaterial({color:'#252b30'},shared,anisotropy),
    mallRoofGlow:()=>new THREE.MeshBasicMaterial({color:new THREE.Color('#f3a4d2').multiplyScalar(1.8)}),
    wall: () => surfaceMaterial({ ...s.wall, map2: s.wall2, base: s.base }, shared, anisotropy),
    floor: () => surfaceMaterial(s.floor, shared, anisotropy),
    shopFloor: () => surfaceMaterial(s.floor, shared, anisotropy),
    shopCeiling: () => surfaceMaterial(s.ceiling, shared, anisotropy),
    shopReveal: () => surfaceMaterial({ ...s.wall, map2: s.wall2, base: s.base }, shared, anisotropy),
    shopGlass: () => shopGlassMaterial(shared),
    shopFrame: () => surfaceMaterial({ color: '#ada88e' }, shared, anisotropy),
    shopFascia: () => surfaceMaterial({ color: '#d6b6c5' }, shared, anisotropy),
    shopSigns: () => surfaceMaterial({ tex: 'shopSigns', size: [1, 1] }, shared, anisotropy),
    ceiling: () => surfaceMaterial(s.ceiling, shared, anisotropy),
    basin: () => surfaceMaterial({ ...s.basin, caustics: s.basin.caustics ?? !theme.pit }, shared, anisotropy),
    fountainStone: () => surfaceMaterial({ tex: 'fountainStone', size: [1.2, 1.2] }, shared, anisotropy),
    fountainTrim: () => surfaceMaterial({ color: '#b59b60' }, shared, anisotropy),
    caps: () => new THREE.MeshBasicMaterial({ color: CAP_COLOR, fog: false }),
    mass: () => new THREE.MeshBasicMaterial({ color: MASS_COLOR, fog: false }),
    trim: () => surfaceMaterial({ color: door.frame ?? '#ffffff' }, shared, anisotropy),
    leaf: () => surfaceMaterial({ tex: door.leaf, size: [1, 1] }, shared, anisotropy),
    closet: () => surfaceMaterial({ tex: door.closet ?? door.leaf, size: [1, 1] }, shared, anisotropy),
    knob: () => surfaceMaterial({ color: door.knob }, shared, anisotropy),
    rail: () => surfaceMaterial({ color: railing.rail }, shared, anisotropy),
    bars: () => surfaceMaterial({ color: railing.bars }, shared, anisotropy),
    railGlass: () => shopGlassMaterial(shared),
    escalatorPanel: () => surfaceMaterial({ color: '#d5ccd0' }, shared, anisotropy),
    escalatorRail: () => surfaceMaterial({ color: '#27282e' }, shared, anisotropy),
    escalatorMetal: () => surfaceMaterial({ color: '#747b80' }, shared, anisotropy),
    escalatorFloor: () => surfaceMaterial(s.floor, shared, anisotropy),
    // Bare vannsklier får vannfilm; Playrooms ballbinger og sklier bruker tørr plast.
    slideLeg: () => surfaceMaterial({ color: SLIDE_LEGS }, shared, anisotropy),
    ...Object.fromEntries(
      Object.entries(SLIDE_COLORS).flatMap(([c, col]) => [
        [`slideIn_${c}`, () => surfaceMaterial({ color: col.inner, caustics: !theme.pit }, shared, anisotropy)],
        [`slideOut_${c}`, () => surfaceMaterial({ color: col.outer }, shared, anisotropy)],
      ]),
    ),
    // Sprosser og karm er ekte geometri; himmel/glassdetaljer males én gang per rom.
    windowFrame: () => surfaceMaterial({ color: theme.window?.frame ?? '#e3e0d7' }, shared, anisotropy),
    signs: () => surfaceMaterial({ tex: SIGN_TEXTURES[theme.id], size: [1, 1] }, shared, anisotropy),
    windowGlass: () => {
      const landscape = landscapeMaterial(sky, theme);
      if (landscape) return landscape;
      const map = own(skyCanvas(sky.sky, null));
      map.colorSpace = THREE.SRGBColorSpace;
      // Lys nok til et svakt skjær rundt vinduet, men ikke så lyst at det blender.
      return new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1, 1, 1).multiplyScalar((sky.sun ? 1.05 : 0.55) / theme.exposure / (1 + theme.bloom * 0.5)) });
    },
    sunPatch: () =>
      new THREE.MeshBasicMaterial({
        map: own(sunCanvas(bars)),
        // Svakere i lyse temaer (Poolrooms): hvite fliser med høy eksponering blir ellers helt hvite.
        color: new THREE.Color(sky.sun?.color ?? '#000').multiplyScalar((sky.sun?.strength ?? 0) / theme.exposure ** 2),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    tileFloor: () => surfaceMaterial(tiles.floor, shared, anisotropy),
    tileWall: () => {
      const wainscot = { ...tiles.wall, split: tiles.height, trim: { h: 0.03, color: tiles.trim } };
      return surfaceMaterial({ ...s.wall, map2: wainscot }, shared, anisotropy);
    },
  };
}
