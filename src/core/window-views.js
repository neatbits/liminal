// Rene data for virtuelle uteområder. Level 0 beholder diffus himmel.
// Størrelsene er halve boksutstrekninger [minste verdi, tilfeldig tillegg], i meter.
const BASE = {
  ground: '#a4af8c', stone: '#d7d1bf', firstRow: 48, rowGap: 43, spacing: 48,
  groundY: -0.8, width: [4, 4], height: [1.8, 1.6], depth: [4, 3],
  groundStyle: 0, windows: 0, lit: 0, fog: 0.008,
  roof: 0, setback: 0, greenery: [0, 2.2, 5.5], leaf: '#6e8060',
};
const view = (changes) => Object.freeze({ ...BASE, ...changes });

export const WINDOW_VIEWS = Object.freeze({
  playroom: view({ roof: 1.4, windows: 1, greenery: [0.62, 2.2, 5.5] }),
  pool: view({ ground: '#a8cbd0', stone: '#e0e7df', firstRow: 62, rowGap: 55, spacing: 72,
    groundY: -0.65, width: [12, 8], height: [1.2, 1.2], depth: [6, 4], groundStyle: 5, fog: 0.012 }),
  office: view({ ground: '#828a8f', stone: '#a3afb8', firstRow: 65, rowGap: 65, spacing: 46,
    groundY: -7, width: [6, 8], height: [6, 11], depth: [7, 8],
    groundStyle: 4, windows: 1, lit: 0.1, fog: 0.0055, setback: 0.18 }),
  mall: view({ ground: '#96999a', stone: '#d3c8b8', firstRow: 65, rowGap: 70, spacing: 70,
    width: [18, 8], height: [2.8, 1.7], depth: [12, 6], groundStyle: 1, fog: 0.006 }),
  garage: view({ ground: '#818789', stone: '#abb1af', firstRow: 56, rowGap: 60, spacing: 60,
    width: [9, 5], height: [2.5, 4], depth: [8, 5], groundStyle: 1, fog: 0.007 }),
  school: view({ ground: '#a5aaa2', stone: '#bcb09a', firstRow: 55, rowGap: 55, spacing: 58,
    width: [10, 5], height: [2.4, 1.5], depth: [7, 4], groundStyle: 2, windows: 1, lit: 0.02,
    roof: 1.1, greenery: [0.45, 2.6, 6] }),
  ward: view({ ground: '#9eae9b', stone: '#d2dad4', firstRow: 50, rowGap: 50, spacing: 64,
    width: [12, 6], height: [2.8, 2], depth: [8, 5], groundStyle: 3, windows: 1, lit: 0.07,
    greenery: [0.7, 2.5, 6] }),
  hotel: view({ ground: '#a29d95', stone: '#cfbda5', firstRow: 50, rowGap: 45, spacing: 32,
    groundY: -2, width: [4, 3], height: [3, 4], depth: [5, 3],
    groundStyle: 4, windows: 1, lit: 0.25, fog: 0.009, roof: 1.8 }),
  // A hand-built Basement window reveals an impossible upper-floor city view.
  basement: view({ city: true, haze: '#a3ada7', ground: '#666d69', stone: '#92968a',
    firstRow: 42, rowGap: 42, spacing: 34, groundY: -52,
    width: [9, 5], height: [20, 30], depth: [8, 5],
    groundStyle: 4, windows: 1, lit: 0.035, fog: 0.0065 }),
});

export function windowViewFor(theme) {
  const id = typeof theme === 'string' ? theme : theme?.id;
  return Object.hasOwn(WINDOW_VIEWS, id) ? WINDOW_VIEWS[id] : null;
}
