// Gjenstander som bygges av enkle former (world/props.js) i stedet for en modellfil – en del av
// katalogen i object-catalog.js (se feltene der). Ren data.
import { HALF_WALL } from './half-walls.js';

export const BUILT_OBJECTS = {
  halfwall: { label: 'Half wall', build: 'halfwall', structural: true,
    size: [HALF_WALL.width, HALF_WALL.height, HALF_WALL.depth] },
  playball: { label: 'Play ball', build: 'playball', size: [0.15, 0.15, 0.15], pit: true,
    loose: { mass: 0.035, com: 0.075, radius: 0.075, restitution: 0.48 } },
  kiosk: { label: 'Food kiosk', build: 'kiosk', size: [3, 2.6, 1.5], glow: 0.22 },
  cafe: { label: 'Café table', build: 'cafe', size: [1.7, 0.92, 1.7] },
  shelf: { label: 'Shop shelf', build: 'shelf', size: [2.1, 1.62, 0.9] },
  wallshelf: { label: 'Wall shelf', build: 'wallshelf', size: [2, 2, 0.45] },
  counter: { label: 'Shop counter', build: 'counter', size: [1.86, 1.0, 0.72], surface: 1.0 },
  // Polstrede lekeklosser i vinyl (lekerommet), i lyse farger etter variant (v).
  softcube: { label: 'Soft cube', build: 'soft', size: [0.6, 0.6, 0.6], soft: true },
  softblock: { label: 'Soft platform', build: 'soft', size: [1.2, 0.6, 1.2], soft: true },
  softpillar: { label: 'Soft pillar', build: 'soft', size: [0.5, 1.5, 0.5], soft: true },
  softbeam: { label: 'Soft beam', build: 'soft', size: [2.4, 0.45, 0.45], soft: true },
  softslab: { label: 'Soft wall', build: 'soft', size: [1.2, 1.2, 0.4], soft: true },
  softramp: { label: 'Soft ramp', build: 'soft', size: [0.9, 0.4, 1.2], soft: true, softForm: 'ramp' },
  softcylinder: { label: 'Soft cylinder', build: 'soft', size: [0.7, 0.4, 0.7], soft: true, softForm: 'cylinder' },
  softsteps: { label: 'Soft steps', build: 'soft', size: [1.2, 0.4, 1.2], soft: true, softForm: 'steps' },
};
