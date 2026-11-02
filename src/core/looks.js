// Utseendet til en bygning: samme tema, men egen tapet og teppefarge (level.look, 0 = temaets eget).
// Maleriene ligger i textures/ (paletter i textures/looks.js). Velges av generatoren og i romfanen. Ren logikk.
import { getTheme } from './themes.js';

export const LOOKS = {
  backrooms: [
    { label: 'Yellow' },
    { label: 'Pale', wall: 'wallpaperYellowPale', floor: 'carpetDampPale' },
    { label: 'Mustard', wall: 'wallpaperYellowMustard', floor: 'carpetDampMustard' },
    { label: 'Dingy', wall: 'wallpaperYellowDingy', floor: 'carpetDampDingy' },
  ],
  hotel: [
    { label: 'Burgundy' },
    { label: 'Emerald', wall: 'hotelWallpaperEmerald', floor: 'hotelCarpetEmerald' },
    { label: 'Navy', wall: 'hotelWallpaperNavy', floor: 'hotelCarpetNavy' },
    { label: 'Ochre', wall: 'hotelWallpaperOchre', floor: 'hotelCarpetOchre' },
    { label: 'Plum', wall: 'hotelWallpaperPlum', floor: 'hotelCarpetPlum' },
  ],
  office: [
    { label: 'Grey' },
    { label: 'Blue', wall: 'officeWallBlue', floor: 'officeCarpetBlue' },
    { label: 'Green', wall: 'officeWallGreen', floor: 'officeCarpetGreen' },
    { label: 'Beige', wall: 'officeWallBeige', floor: 'officeCarpetBrown' },
    { label: 'Dark', wall: 'officeWallDark', floor: 'officeCarpetCharcoal' },
  ],
  pool: [
    { label: 'White' },
    { label: 'Seafoam', wall: 'poolTilesSeafoam', floor: 'poolTilesSeafoam', ceiling: 'poolTilesSeafoam', basin: 'poolTilesBlue' },
    { label: 'Blush', wall: 'poolTilesBlush', floor: 'poolTilesBlush', ceiling: 'poolTiles', basin: 'poolTilesBlue' },
    { label: 'Sand', wall: 'poolTilesSand', floor: 'poolTilesSand', ceiling: 'poolTiles', basin: 'poolTilesSeafoam' },
    { label: 'Black', wall: 'poolTilesBlack', floor: 'poolTilesBlack', ceiling: 'poolTilesBlack', basin: 'poolTilesBlack' },
    // Cyan over og under, et rosa bånd imellom (0,75–1,125 m over gulvet): båndet ligger i den nedre delen av veggen (split).
    { label: 'Pink & cyan', wall: 'poolTilesCyan', wall2: 'poolTilesCyanPink', split: 1.25, floor: 'poolTilesCyan', ceiling: 'poolTiles', basin: 'poolTilesBlue' },
  ],
  school: [
    { label: 'Green' },
    { label: 'Blue', wall: 'blockWall', wall2: 'schoolPaintBlue', floor: 'schoolFloor', basin: 'poolTilesBlue' },
    { label: 'Peach', wall: 'blockWall', wall2: 'schoolPaintPeach', floor: 'schoolFloor', basin: 'poolTilesBlue' },
    { label: 'Yellow', wall: 'blockWall', wall2: 'schoolPaintYellow', floor: 'schoolFloor', basin: 'poolTilesBlue' },
  ],
  ward: [
    { label: 'Mint' },
    { label: 'Blue', wall: 'plaster', wall2: 'wardMintBlue', floor: 'wardFloorBlue', basin: 'poolTilesBlue' },
    { label: 'Rose', wall: 'plaster', wall2: 'wardMintRose', floor: 'wardFloorRose', basin: 'poolTilesBlue' },
    { label: 'Cream', wall: 'plaster', wall2: 'wardMintCream', floor: 'wardFloorCream', basin: 'poolTilesBlue' },
  ],
  garage: [
    { label: 'Green' },
    { label: 'Yellow', wall: 'concreteWall', wall2: 'garagePaintYellow', floor: 'concreteFloor' },
    { label: 'Red', wall: 'concreteWall', wall2: 'garagePaintRed', floor: 'concreteFloor' },
    { label: 'Blue', wall: 'concreteWall', wall2: 'garagePaintBlue', floor: 'concreteFloor' },
  ],
  playroom: [
    { label: 'Primary' },
    { label: 'Pastel', wall: 'playWallPastel', wall2: 'playStripePastel', floor: 'foamMatPastel', basin: 'ballBed' },
    { label: 'Faded', wall: 'playWallFaded', wall2: 'playStripeFaded', floor: 'foamMatFaded', basin: 'ballBed' },
    { label: 'Neon', wall: 'playWallNeon', wall2: 'playStripeNeon', floor: 'foamMatNeon', basin: 'ballBed' },
  ],
};

export const looksOf = (theme) => LOOKS[theme] ?? null;

export function clampLook(theme, value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < (LOOKS[theme]?.length ?? 0) ? n : 0;
}

/** Temaets flater med bygningens tapet og teppe. */
export function surfacesOf(level, theme = getTheme(level.theme)) {
  const look = LOOKS[theme.id]?.[level.look ?? 0];
  const s = theme.surfaces;
  if (!look?.wall) return s;
  const out = { ...s, wall: { ...s.wall, tex: look.wall }, floor: { ...s.floor, tex: look.floor }, basin: { ...s.basin, tex: look.basin ?? look.floor } };
  if (look.ceiling) out.ceiling = { ...s.ceiling, tex: look.ceiling };
  // split: temaet har ingen nedre del selv (Poolrooms) – den nedre delen dekker split meter én gang, med veggens glans.
  if (look.wall2) out.wall2 = { ...s.wall2, tex: look.wall2, ...(look.split ? { size: [s.wall.size[0], look.split], split: look.split, gloss: s.wall.gloss } : {}) };
  return out;
}
