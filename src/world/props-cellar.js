// Innredning av enkle former til kjelleren (core/object-catalog-rooms.js), forsiden mot +z og bunnen i y = 0:
// fyrkjelen (køyesengen er en modell).
import { box, cylinder, parts } from './props-geo.js';

const STEEL = '#8d9396';
const DARK = '#2c2e31';

/** Fyrkjelen: en stor, malt tank på føtter, med rør opp mot taket, en måler og et lite vindu mot flammen. */
export function boiler() {
  return parts([
    { color: '#7f6f5a', geoms: [cylinder(0.52, 1.7, 0, 1.0, 0, 28), cylinder(0.56, 0.08, 0, 1.86, 0, 28), cylinder(0.56, 0.08, 0, 0.16, 0, 28)] },
    { color: STEEL, geoms: [cylinder(0.08, 0.5, 0.2, 2.1, -0.1, 12), cylinder(0.06, 0.5, -0.24, 2.1, 0.08, 12), box(0.9, 0.06, 0.06, 0.1, 0.06, 0), box(0.06, 0.06, 0.9, 0, 0.06, 0)] },
    { color: DARK, geoms: [box(0.34, 0.24, 0.06, 0, 0.5, 0.52), cylinder(0.025, 0.24, 0.32, 1.5, 0.4, 8).rotateZ(Math.PI / 2)] },
    { color: '#e9e3d2', geoms: [cylinder(0.08, 0.03, 0, 0, 0, 16).rotateX(Math.PI / 2).translate(0.18, 1.35, 0.53)] },
    { color: '#ff8a3a', unlit: true, geoms: [box(0.16, 0.08, 0.01, 0, 0.5, 0.555)] },
  ]);
}
