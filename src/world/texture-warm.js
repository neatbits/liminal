// Teksturene for et rom, malt og lastet opp på forhånd (Noclip, view3d/zones.js): å male et tema første gang (canvas,
// textures/) og laste det opp til grafikkortet skjer ellers midt i byggingen og i første bilde – et hakk. Her tas én
// tekstur om gangen, hver i sin egen oppgave, så bildene kommer imellom.
import { getTheme } from '../core/themes.js';
import { surfacesOf } from '../core/looks.js';
import { getTexture } from '../textures/index.js';
import { SIGN_TEXTURES } from './wayfinding.js';
import { DEFAULT_DOOR } from './world-meshes.js';

const DEFAULT_TILES = ['tileFloorGrey', 'tileWallWhite']; // flislagte rom (build.js DEFAULT_TILES)
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Teksturnøklene flatene i rommet bruker: tapet, gulv, tak, bassengbunn, fliser, dørblad og skilt. */
export function textureKeys(level) {
  const theme = getTheme(level.theme);
  const s = surfacesOf(level, theme);
  const door = { ...DEFAULT_DOOR, ...theme.door };
  const keys = [s.wall, s.wall2, s.floor, s.ceiling, s.basin, theme.tiles?.floor, theme.tiles?.wall].map((d) => d?.tex);
  keys.push(...(theme.tiles ? [] : DEFAULT_TILES), door.leaf, door.closet, SIGN_TEXTURES[theme.id]);
  return [...new Set(keys.filter(Boolean))];
}

/** Maler og laster opp teksturene, én om gangen. renderer: three.js-rendereren (initTexture laster opp). */
export async function warmTextures(level, renderer, anisotropy = 4) {
  for (const key of textureKeys(level)) {
    await pause();
    const texture = getTexture(key, anisotropy);
    await pause();
    renderer?.initTexture?.(texture);
  }
}
