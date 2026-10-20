// Setter sammen hele 3D-verdenen for et rom: flater, materialer og armaturer.
import * as THREE from 'three';
import { getTheme } from '../core/themes.js';
import { collectLights, createLightField } from './lighting.js';
import { buildSurfaces } from './surfaces.js';
import { createSharedUniforms, surfaceMaterial, toGeometry } from './materials.js';
import { buildFixtures } from './fixtures.js';
import { createGlossUniforms } from './gloss.js';
import { buildDoors } from './doors.js';
import { buildRailings } from './railings.js';
import { createSwingDoors } from './swing-doors.js';
import { buildSlides } from './slides.js';
import { createBalls } from './balls.js';
import { createObjects } from './objects.js';
import { buildWindows } from './windows.js';
import { skyOf } from '../core/windows.js';
import { skyCanvas, sunCanvas } from '../textures/windows.js';
import { SLIDE_COLORS } from '../core/slides.js';
import { buildWaterData } from './water/geometry.js';
import { createWater } from './water/water.js';

const CAP_COLOR = '#55534e';
const MASS_COLOR = '#a7a49c';
const DEFAULT_DOOR = { frame: null, leaf: 'doorFlatCream', closet: null, knob: '#b9b3a6' };
const DEFAULT_RAILING = { rail: '#8c8a84', bars: '#8c8a84' };
const SLIDE_LEGS = '#c6cbcf';
// Flislagte rom: flisgulv, og fliser på veggene opp til `height` med en list øverst.
const DEFAULT_TILES = {
  floor: { tex: 'tileFloorGrey', size: [0.9, 0.9], gloss: { amount: 0.8, grid: 3 } },
  wall: { tex: 'tileWallWhite', size: [0.6, 0.6], gloss: { amount: 1, grid: 4 } },
  height: 1.4,
  trim: '#d8d8d2',
};

/**
 * @param options anisotropy, waterQuality (true = speiling og lysbrytning i vannet)
 * @returns {{ group, theme, lights, field, water, doors, objects, balls, stats, update(time, flicker),
 *            setBoost(v), setPower(p), dispose() }}
 *          doors: dører som kan dreies (createSwingDoors), objects: gjenstandene (createObjects),
 *          balls: ballbingene (createBalls) eller null
 */
export function buildWorld(level, { anisotropy = 4, waterQuality = true } = {}) {
  const started = performance.now();
  const theme = getTheme(level.theme);
  const lights = collectLights(level);
  const field = createLightField(level, theme, lights);
  const door = { ...DEFAULT_DOOR, ...theme.door };
  const railing = { ...DEFAULT_RAILING, ...theme.railing };
  const tiles = { ...DEFAULT_TILES, ...theme.tiles };
  const meshes = {
    ...buildSurfaces(level, field),
    ...buildDoors(level, door, field),
    ...buildRailings(level, field),
    ...buildSlides(level, field),
  };
  const panes = buildWindows(level, field);
  meshes.windowFrame = panes.frame;
  meshes.windowGlass = panes.glass;
  meshes.sunPatch = panes.sun;
  const sky = skyOf(level);
  const bars = theme.window?.bars !== false; // sprosser i vinduene
  const ownTextures = []; // teksturer laget for akkurat dette rommet (himmel, sol)
  const own = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    ownTextures.push(t);
    return t;
  };
  const shared = createSharedUniforms(field.color);
  const gloss = createGlossUniforms(level, lights, theme); // armaturene speiler seg i blanke fliser
  Object.assign(shared, gloss.uniforms);
  const s = theme.surfaces;

  // Materialene lages bare for flater som finnes (teksturene males første gang de brukes).
  const defs = {
    wall: () => surfaceMaterial({ ...s.wall, map2: s.wall2, base: s.base }, shared, anisotropy),
    floor: () => surfaceMaterial(s.floor, shared, anisotropy),
    ceiling: () => surfaceMaterial(s.ceiling, shared, anisotropy),
    basin: () => surfaceMaterial({ ...s.basin, caustics: !theme.pit }, shared, anisotropy),
    caps: () => new THREE.MeshBasicMaterial({ color: CAP_COLOR, fog: false }),
    mass: () => new THREE.MeshBasicMaterial({ color: MASS_COLOR, fog: false }),
    trim: () => surfaceMaterial({ color: door.frame ?? '#ffffff' }, shared, anisotropy),
    leaf: () => surfaceMaterial({ tex: door.leaf, size: [1, 1] }, shared, anisotropy),
    closet: () => surfaceMaterial({ tex: door.closet ?? door.leaf, size: [1, 1] }, shared, anisotropy),
    knob: () => surfaceMaterial({ color: door.knob }, shared, anisotropy),
    rail: () => surfaceMaterial({ color: railing.rail }, shared, anisotropy),
    bars: () => surfaceMaterial({ color: railing.bars }, shared, anisotropy),
    // Innsiden av sklien glitrer som vannfilm (samme kaustikk som bassengbunnen).
    slideLeg: () => surfaceMaterial({ color: SLIDE_LEGS }, shared, anisotropy),
    ...Object.fromEntries(
      Object.entries(SLIDE_COLORS).flatMap(([c, col]) => [
        [`slideIn_${c}`, () => surfaceMaterial({ color: col.inner, caustics: true }, shared, anisotropy)],
        [`slideOut_${c}`, () => surfaceMaterial({ color: col.outer }, shared, anisotropy)],
      ]),
    ),
    // Vinduer: hvit karm, himmel i glasset (så lys at den «brenner ut») og solflekker på gulvet.
    windowFrame: () => surfaceMaterial({ color: '#ecebe6' }, shared, anisotropy),
    windowGlass: () => {
      const map = own(skyCanvas(sky.sky, bars ? undefined : null));
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

  const group = new THREE.Group();
  const geometries = [];
  const materials = {};
  for (const [key, make] of Object.entries(defs)) {
    const data = meshes[key];
    if (!data.vertexCount) continue;
    const geometry = toGeometry(data);
    geometries.push(geometry);
    materials[key] = make();
    const mesh = new THREE.Mesh(geometry, materials[key]);
    mesh.name = key;
    group.add(mesh);
  }

  // Dører med rom på begge sider kan åpnes og lukkes mens man går.
  materials.leaf ??= defs.leaf();
  materials.knob ??= defs.knob();
  const doors = createSwingDoors(meshes.swing, materials.leaf, materials.knob);
  group.add(doors.group);

  const fixtures = buildFixtures(lights.filter((l) => !l.object), theme);
  group.add(fixtures.group);

  // Ballbinger (theme.pit === 'balls') fylles med baller; ellers vann med speiling og brytning.
  const balls = theme.pit === 'balls' ? createBalls(level, field, shared, theme.pitColors) : null;
  if (balls) group.add(balls.mesh);
  const water = balls || theme.pit ? null : createWater(buildWaterData(level, field), theme, shared, { quality: waterQuality });
  if (water) group.add(water.mesh);

  // Gjenstander (ferdige 3D-modeller) lastes i bakgrunnen og dukker opp når de er klare.
  const objects = createObjects(level, field, shared);
  group.add(objects.group);

  let lastTime = null;
  let boost = 1;
  let power = 1; // strømmen (strømbrudd i gåmodus): demper flater og armaturer
  let vertices = 0;
  for (const g of geometries) vertices += g.attributes.position.count;
  if (water) vertices += water.mesh.geometry.attributes.position.count;

  return {
    group,
    theme,
    lights,
    field,
    water,
    stats: { vertices, lights: lights.length, ms: Math.round(performance.now() - started) },
    doors,
    objects,
    balls,
    update(time, flicker) {
      const dt = Math.min(0.1, Math.max(0, time - (lastTime ?? time)));
      doors.update(dt);
      balls?.update(dt);
      objects.update(dt);
      lastTime = time;
      shared.uTime.value = time;
      shared.uFlick.value.set(flicker[0], flicker[1], flicker[2], flicker[3]);
      fixtures.update(flicker, power);
    },
    setBoost(v) {
      boost = v;
      shared.uBoost.value = boost * power;
    },
    setPower(p) {
      power = p;
      shared.uBoost.value = boost * power;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of Object.values(materials)) m.dispose();
      for (const t of ownTextures) t.dispose();
      gloss.dispose();
      fixtures.dispose();
      doors.dispose();
      water?.dispose();
      balls?.dispose();
      objects.dispose();
    },
  };
}
