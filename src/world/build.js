// Setter sammen hele 3D-verdenen for et rom: flater, materialer og armaturer.
import * as THREE from 'three';
import { getTheme } from '../core/themes.js';
import { collectLights, createLightField } from './lighting.js';
import { buildSurfaces } from './surfaces.js';
import { createSharedUniforms, toGeometry } from './materials.js';
import { surfaceChunks } from './chunks.js';
import { buildFixtures } from './fixtures.js';
import { createGlossUniforms } from './gloss.js';
import { createFloorReflection } from './floor-reflection.js';
import { buildDoors } from './doors.js';
import { buildRailings } from './railings.js';
import { buildEscalators } from './escalators.js';
import { createEscalatorMotion } from './escalator-motion.js';
import { buildFountains } from './fountains.js';
import { createFountainSpray } from './fountain-spray.js';
import { buildMallRoof } from './mall-roof.js';
import { createSwingDoors } from './swing-doors.js';
import { buildSlides } from './slides.js';
import { createBalls } from './balls.js';
import { createObjects } from './objects.js';
import { buildWindows } from './windows.js';
import { buildShopfronts } from './shopfronts.js';
import { buildWayfinding } from './wayfinding.js';
import { skyOf } from '../core/windows.js';
import { worldMaterials } from './world-materials.js';
import { buildWaterData } from './water/geometry.js';
import { createWater } from './water/water.js';

const DEFAULT_DOOR = { frame: null, leaf: 'doorFlatCream', closet: null, knob: '#b9b3a6' };
const DEFAULT_RAILING = { rail: '#8c8a84', bars: '#8c8a84' };
// Flislagte rom: flisgulv, og fliser på veggene opp til `height` med en list øverst.
const DEFAULT_TILES = {
  floor: { tex: 'tileFloorGrey', size: [0.9, 0.9], gloss: { amount: 0.8, grid: 3 } },
  wall: { tex: 'tileWallWhite', size: [0.6, 0.6], gloss: { amount: 1, grid: 4 } },
  height: 1.4,
  trim: '#d8d8d2',
};

/**
 * @param options anisotropy, waterQuality (true = speiling og lysbrytning i vannet), waterDetail (detaljert vann)
 * @returns {{ group, theme, lights, field, water, doors, objects, balls, stats, update(time, flicker),
 *            setBoost(v), setPower(p), setTint(rgb), dispose() }}
 *          doors: dører som kan dreies (createSwingDoors), objects: gjenstandene (createObjects),
 *          balls: ballbingene (createBalls) eller null
 */
export function buildWorld(level, { anisotropy = 4, waterQuality = true, waterDetail = false, waterWaves = 1 } = {}) {
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
    ...buildEscalators(level, field),
    ...buildFountains(level, field),
    ...buildMallRoof(level, field),
    ...buildSlides(level, field),
    ...buildShopfronts(level, field),
  };
  const panes = buildWindows(level, field);
  meshes.windowFrame = panes.frame;
  meshes.windowGlass = panes.glass;
  meshes.sunPatch = panes.sun;
  meshes.signs = buildWayfinding(level, field);
  const sky = skyOf(level);
  const bars = theme.window?.bars === true; // bare temaer som uttrykkelig bruker sprosser
  const ownTextures = []; // teksturer laget for akkurat dette rommet (himmel, sol)
  const own = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    ownTextures.push(t);
    return t;
  };
  const shared = createSharedUniforms(field.color);
  const gloss = createGlossUniforms(level, lights, theme); // armaturene speiler seg i blanke fliser
  Object.assign(shared, gloss.uniforms);
  const floorReflection = createFloorReflection(level, shared);
  const s = theme.surfaces;

  // Materialene lages bare for flater som finnes (teksturene males første gang de brukes).
  const defs = worldMaterials({ s, theme, door, railing, tiles, shared, anisotropy, own, sky, bars, level });

  const group = new THREE.Group();
  const escalators = createEscalatorMotion(level, field, shared);
  group.add(escalators.group);
  const geometries = [];
  const materials = {};
  for (const [key, make] of Object.entries(defs)) {
    const data = meshes[key];
    if (!data.vertexCount) continue;
    materials[key] = make();
    const parts = surfaceChunks(data);
    const batch = parts.length > 1 ? new THREE.Group() : null;
    if (batch) { batch.name = key; group.add(batch); }
    for (const part of parts) {
      const geometry = toGeometry(part);
      geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, materials[key]);
      mesh.name = key;
      (batch ?? group).add(mesh);
    }
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
  const water = balls || theme.pit ? null : createWater(buildWaterData(level, field), theme, shared, { quality: waterQuality, detail: waterDetail, waves: waterWaves });
  if (water) group.add(water.mesh);
  const spray = createFountainSpray(level, field, shared);
  group.add(spray.group);

  // Gjenstander (ferdige 3D-modeller) lastes i bakgrunnen og dukker opp når de er klare.
  const objects = createObjects(level, field, shared);
  group.add(objects.group);
  floorReflection?.attach(group);

  let lastTime = null;
  let boost = 1;
  let power = 1; // strømmen (strømbrudd i gåmodus): demper flater og armaturer
  let tint = [1, 1, 1]; // lysfargen (core/tints.js)
  let vertices = escalators.vertices+spray.vertices;
  if (balls) vertices += balls.vertices;
  for (const g of geometries) vertices += g.attributes.position.count;
  if (water) vertices += water.mesh.geometry.attributes.position.count;

  return {
    group,
    theme,
    lights,
    field,
    water,
    floorReflection,
    spray,
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
      fixtures.update(flicker, power, tint);
    },
    setBoost(v) {
      boost = v;
      shared.uBoost.value = boost * power;
    },
    setPower(p) {
      power = p;
      shared.uBoost.value = boost * power;
    },
    setTint(rgb) {
      tint = rgb;
      shared.uTint.value.set(rgb[0], rgb[1], rgb[2]);
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of Object.values(materials)) m.dispose();
      for (const t of ownTextures) t.dispose();
      gloss.dispose();
      floorReflection?.dispose();
      escalators.dispose();
      fixtures.dispose();
      doors.dispose();
      water?.dispose();
      spray.dispose();
      balls?.dispose();
      objects.dispose();
    },
  };
}
