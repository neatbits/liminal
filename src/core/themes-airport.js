// Flyplassterminalen om natta (samme format som i themes.js): mønstret teppe, lyse veggpaneler, metallhimling, store
// vinduer mot en mørk rullebane, gater med stolrader, innsjekkingsskranker og bagasjebånd (gen/airport.js). Ingen fly går.
export const AIRPORT_THEMES = {
  airport: {
    id: 'airport',
    label: 'The Terminal',
    description: 'Rows of empty seats, a patterned carpet and black windows over the runway. Every flight is delayed.',
    surfaces: {
      wall: { tex: 'airportWall', size: [2.4, 2.4] },
      base: { h: 0.12, color: '#3b4046' },
      floor: { tex: 'airportCarpet', size: [2, 2] },
      ceiling: { tex: 'airportCeiling', size: [2.4, 2.4] },
      basin: { tex: 'poolTilesBlue', size: [1, 1] },
    },
    defaultHeight: 3.6,
    lightSpacing: 4,
    light: { color: '#eef3ff', intensity: 0.74, falloff: 3, radius: 11, ambient: '#3b4048' },
    fixture: { shape: 'panel', size: [1.2, 0.04, 0.6], color: '#f4f8ff', glow: 3, frame: '#b9bec4' },
    door: { frame: '#8d949a', leaf: 'doorSteel', knob: '#c9ced2', kick: true },
    railing: { rail: '#9aa1a7', bars: '#9aa1a7' },
    window: { sill: 0.25, head: 6, merge: true }, // glassvegger fra gulvet og opp, sammenhengende
    fog: { color: '#2c3138', density: 0.018 },
    exposure: 1.06,
    bloom: 0.45,
    water: { tint: '#3a7f92', absorb: [0.9, 0.35, 0.25], wave: 0.2 },
    sound: { hum: 0.035, buzz: 0.05, room: 0.028, reverb: 0.55, reverbTime: 3.2, step: 'carpet',
      eerie: ['chime', 'footsteps', 'muzak', 'boom', 'chime', 'whisper'] },
    plan: { floor: '#d9dde3', water: '#a9cbd6' },
  },
};
