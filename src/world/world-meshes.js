// Den tunge, rene delen av en 3D-verden (world/build.js): alle flatene med bakt lys (gulv, vegger, tak, dører, rekkverk,
// rulletrapper, fontener, sklier, butikkfronter, vinduer, skilt) og vannet. Uten three.js-objekter og DOM, så den kan
// lages i en bakgrunnstråd (view3d/zone-worker.js) og sendes over uten kopiering (packMeshes). Ren logikk.
import { getTheme } from '../core/themes.js';
import { MeshData } from './mesher.js';
import { surfaceChunks } from './chunks.js';
import { collectLights, createLightField } from './lighting.js';
import { buildSurfaces } from './surfaces.js';
import { buildDoors } from './doors.js';
import { buildRailings } from './railings.js';
import { buildEscalators } from './escalators.js';
import { buildFountains } from './fountains.js';
import { buildMallRoof } from './mall-roof.js';
import { buildSlides } from './slides.js';
import { buildShopfronts } from './shopfronts.js';
import { addGlassWalls } from './glass-walls.js';
import { buildWindows } from './windows.js';
import { buildWayfinding } from './wayfinding.js';
import { buildWaterData } from './water/geometry.js';

export const DEFAULT_DOOR = { frame: null, leaf: 'doorFlatCream', closet: null, knob: '#b9b3a6' };

/** { meshes, waterData } for rommet; waterData er null der det ikke er vann (ballbinger: temaet har `pit`). */
export function buildWorldMeshes(level, field = createLightField(level, getTheme(level.theme), collectLights(level))) {
  const theme = getTheme(level.theme);
  const meshes = {
    ...buildSurfaces(level, field),
    ...buildDoors(level, { ...DEFAULT_DOOR, ...theme.door }, field),
    ...buildRailings(level, field),
    ...buildEscalators(level, field),
    ...buildFountains(level, field),
    ...buildMallRoof(level, field),
    ...buildSlides(level, field),
    ...buildShopfronts(level, field),
  };
  addGlassWalls(level, meshes.shopGlass);
  const panes = buildWindows(level, field);
  meshes.windowFrame = panes.frame;
  meshes.windowGlass = panes.glass;
  meshes.sunPatch = panes.sun;
  meshes.signs = buildWayfinding(level, field);
  return { meshes, waterData: theme.pit ? null : buildWaterData(level, field) };
}

/** Deler de store flatene i biter (surfaceChunks) på forhånd, så build.js slipper det: { vertexCount, chunks }. */
export function presplit({ meshes, waterData }) {
  const out = {};
  for (const [key, m] of Object.entries(meshes)) out[key] = m instanceof MeshData ? { vertexCount: m.vertexCount, chunks: surfaceChunks(m) } : m;
  return { meshes: out, waterData };
}

const FLOATS = ['pos', 'uv', 'light', 'flick', 'edge', 'depth'];
const isMesh = (v) => v instanceof MeshData || (v && typeof v === 'object' && 'vertexCount' in v && Array.isArray(v.pos));

/**
 * Gjør flatene om til data som kan sendes mellom tråder: hver MeshData (og vannet) blir typede arrayer, og bufferne legges
 * i `transfer` (de flyttes, ikke kopieres). Lysfeltet følger ikke med. Resultatet brukes som MeshData av build.js.
 */
export function packMeshes(value, transfer = []) {
  if (Array.isArray(value)) return value.map((v) => packMeshes(v, transfer));
  if (isMesh(value)) {
    const out = { vertexCount: value.vertexCount };
    for (const key of [...FLOATS, 'index']) {
      if (!value[key]) continue;
      out[key] = key === 'index' ? Uint32Array.from(value[key]) : Float32Array.from(value[key]);
      transfer.push(out[key].buffer);
    }
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (k !== 'field') out[k] = packMeshes(v, transfer);
    return out;
  }
  return value;
}
