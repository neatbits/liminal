// Temadefinisjoner (rene data). Farger er sRGB-hex; lysintensiteter er lineære.
// Teksturnøkler peker til painters i src/textures/. `water`: farge, absorpsjon per
// meter (r, g, b) og bølgestyrke for vannshaderen. `door`: karmfarge (null = ingen karm),
// dørblad, dørblad for boder (dør med vegg bak, valgfri) og håndtaksfarge. `railing`:
// farge på håndlist/stolper og spiler. Vinduer er uten sprosser med mindre `window.bars === true`.
// Valgfri `tiles` overstyrer flisene i build.js (`step`: fottrinnene på belegget, ellers fliser).
// `pit: 'balls'` fyller bassengene med baller (ballbinge) i stedet for vann. `gloss` på en flate
// ({ amount, grid = fliser per teksturflate }) gjør flisene blanke (world/gloss.js). De nyeste temaene
// ligger i themes-more.js.
import { MORE_THEMES } from './themes-more.js';

export const THEMES = {
  backrooms: {
    id: 'backrooms',
    label: 'Level 0 – yellow rooms',
    description: 'Soft carpet, muted yellow wallpaper and fluorescent lights humming forever.',
    surfaces: {
      wall: { tex: 'wallpaperYellow', size: [1.6, 1.6] },
      base: { h: 0.09, color: '#7d6a3e' },
      floor: { tex: 'carpetDamp', size: [2, 2] },
      ceiling: { tex: 'levelZeroCeiling', size: [1.2, 1.2] },
      basin: { tex: 'carpetDamp', size: [2, 2] },
    },
    defaultHeight: 2.7,
    lightSpacing: 3,
    light: { color: '#fff0c4', intensity: 0.62, falloff: 2.6, radius: 9, ambient: '#3d3722' },
    // Mørke deler (gen/darkness.js) i genererte nivåer: alltid når stemningen har dem, og større.
    dark: { chance: 1, share: 0.25 },
    fixture: { shape: 'panel', size: [1.2, 0.04, 0.6], color: '#fff6dc', glow: 2.6, frame: '#b9b196' },
    door: { frame: null, leaf: 'doorFlatCream', knob: '#a99a6a' },
    railing: { rail: '#8a7a4c', bars: '#8a7a4c' },
    fog: { color: '#6b5f38', density: 0.05 },
    exposure: 1.0,
    bloom: 0.35,
    water: { tint: '#4a4526', absorb: [1.5, 1.2, 1.7], wave: 0.25 },
    sound: { hum: 0.06, buzz: 0.35, room: 0.02, reverb: 0.22, reverbTime: 1.4, step: 'carpet',
      eerie: ['buzz', 'footsteps', 'knocks', 'whisper', 'buzz'] },
    plan: { floor: '#efe4b8', water: '#a9d3df' },
  },

  pool: {
    id: 'pool',
    label: 'The Poolrooms',
    description: 'White tiles, still water and light that seems to come from everywhere.',
    surfaces: {
      wall: { tex: 'poolTiles', size: [1, 1], gloss: { amount: 0.6, grid: 8 } },
      base: null,
      floor: { tex: 'poolTiles', size: [1, 1], gloss: { amount: 0.85, grid: 8 } },
      ceiling: { tex: 'poolTiles', size: [1, 1] },
      basin: { tex: 'poolTilesBlue', size: [1, 1] },
    },
    defaultHeight: 3.4,
    lightSpacing: 4,
    light: { color: '#f2ffff', intensity: 0.8, falloff: 3.2, radius: 10, ambient: '#8a9a9c' },
    fixture: { shape: 'panel', size: [0.5, 0.04, 0.5], color: '#f4ffff', glow: 2.7, frame: '#d4dcdc' },
    door: { frame: null, leaf: 'doorFlatWhite', knob: '#c9ced2' },
    railing: { rail: '#c8cdd1', bars: '#c8cdd1' },
    window: { bars: false, merge: true, flush: true, inset: 0.025, depth: 0.1, sill: 0.45, head: 3, frame: '#d8e4e5' },
    fog: { color: '#a9c6ca', density: 0.035 },
    exposure: 1.1,
    bloom: 0.32,
    water: { tint: '#3a9fb2', absorb: [0.9, 0.32, 0.22], wave: 0.5 },
    sound: { hum: 0.015, buzz: 0.08, room: 0.025, drips: true, reverb: 0.55, reverbTime: 4, step: 'tile',
      eerie: ['gurgle', 'whisper', 'footsteps', 'boom', 'gurgle'] },
    plan: { floor: '#e3eff1', water: '#8ccbe0' },
  },

  office: {
    id: 'office',
    label: 'The Office',
    description: 'Grey carpet, ceiling tiles, and nobody has been here for a long time.',
    surfaces: {
      wall: { tex: 'officeWall', size: [2, 2] },
      base: { h: 0.1, color: '#45464a' },
      floor: { tex: 'officeCarpet', size: [1, 1] },
      ceiling: { tex: 'ceilingTiles', size: [1.2, 1.2] },
      basin: { tex: 'officeCarpet', size: [1, 1] },
    },
    defaultHeight: 2.7,
    lightSpacing: 3,
    light: { color: '#e6efff', intensity: 0.55, falloff: 2.4, radius: 8, ambient: '#24282d' },
    fixture: { shape: 'panel', size: [1.2, 0.04, 0.6], color: '#f0f5ff', glow: 3.2, frame: '#a3a8ae' },
    door: { frame: '#8e9297', leaf: 'doorVeneer', knob: '#c9ced2', kick: true },
    railing: { rail: '#8e9297', bars: '#8e9297' },
    fog: { color: '#15191d', density: 0.07 },
    exposure: 1.05,
    bloom: 0.5,
    water: { tint: '#2c3a40', absorb: [1.0, 0.7, 0.6], wave: 0.3 },
    sound: { hum: 0.05, buzz: 0.25, room: 0.03, reverb: 0.15, reverbTime: 0.9, step: 'carpet',
      eerie: ['phone', 'knocks', 'footsteps', 'buzz'] },
    plan: { floor: '#e4e7ec', water: '#a3c8da' },
  },

  garage: {
    id: 'garage',
    label: 'The Parking Garage',
    description: 'Concrete, pillars and fluorescent tubes buzzing green.',
    surfaces: {
      wall: { tex: 'concreteWall', size: [2.5, 2.5] },
      wall2: { tex: 'garagePaint', size: [2, 1.1], split: 1.1, trim: { h: 0.1, color: '#c19a2e' } },
      base: null,
      floor: { tex: 'concreteFloor', size: [3, 3] },
      ceiling: { tex: 'concreteWall', size: [2.5, 2.5] },
      basin: { tex: 'concreteFloor', size: [3, 3] },
    },
    defaultHeight: 2.6,
    lightSpacing: 4,
    light: { color: '#dcf2cc', intensity: 0.7, falloff: 2.8, radius: 10, ambient: '#20241f' },
    fixture: { shape: 'tube', size: [1.3, 0.07, 0.12], color: '#e6ffd9', glow: 4, frame: '#55594f', drop: 0.1 },
    door: { frame: '#4f544b', leaf: 'doorSteel', knob: '#9aa09a', kick: true },
    railing: { rail: '#c19a2e', bars: '#6b6f66' },
    fog: { color: '#1b201b', density: 0.045 },
    exposure: 1.0,
    bloom: 0.6,
    water: { tint: '#262b22', absorb: [1.4, 1.1, 1.3], wave: 0.2 },
    sound: { hum: 0.04, buzz: 0.5, room: 0.035, reverb: 0.5, reverbTime: 3.2, step: 'concrete',
      eerie: ['groan', 'boom', 'footsteps', 'buzz', 'groan'] },
    plan: { floor: '#e2e2de', water: '#9fc4cf' },
  },

  hotel: {
    id: 'hotel',
    label: 'The Hotel Corridor',
    description: "Patterned carpet, dark wood panelling and doors you don't remember.",
    surfaces: {
      wall: { tex: 'hotelWallpaper', size: [1, 1] },
      wall2: { tex: 'hotelWood', size: [1, 0.95], split: 0.95, trim: { h: 0.05, color: '#3d2615' } },
      base: { h: 0.1, color: '#2b1a10' },
      floor: { tex: 'hotelCarpet', size: [1.2, 1.2] },
      ceiling: { tex: 'plaster', size: [2, 2] },
      basin: { tex: 'hotelCarpet', size: [1.2, 1.2] },
    },
    defaultHeight: 2.6,
    lightSpacing: 4,
    light: { color: '#ffd4a3', intensity: 0.6, falloff: 2.2, radius: 8, ambient: '#2c2321' },
    fixture: { shape: 'disc', size: [0.44, 0.06, 0.44], color: '#ffe4ba', glow: 3, frame: null },
    door: { frame: '#3d2615', leaf: 'doorPanelWood', knob: '#c9a45a', handle: 'knob' },
    railing: { rail: '#3d2615', bars: '#2b1a10' },
    window: { bars: true }, // tradisjonelle vinduer i hotellkorridoren
    fog: { color: '#1e140e', density: 0.07 },
    exposure: 1.05,
    bloom: 0.6,
    water: { tint: '#3a2a20', absorb: [1.4, 1.2, 1.2], wave: 0.3 },
    sound: { hum: 0.012, buzz: 0.05, room: 0.015, reverb: 0.12, reverbTime: 0.7, step: 'carpet',
      eerie: ['knocks', 'creak', 'footsteps', 'whisper', 'knocks'] },
    plan: { floor: '#f0ddd6', water: '#a9cbd6' },
  },
  ...MORE_THEMES,
};

export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = 'backrooms';

export function getTheme(id) {
  return THEMES[id] ?? THEMES[DEFAULT_THEME];
}
