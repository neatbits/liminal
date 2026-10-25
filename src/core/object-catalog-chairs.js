// Løse stoler med fysikk som ikke hører til ett bestemt interiør: trestolen ligger i hauger i
// Level 0 (gen/chair-piles.js) og står i kjellerrommene. Mål etter scale. Ren data.
import { ccBy } from './object-credit.js';

export const CHAIR_OBJECTS = {
  woodenchair: {
    label: 'Wooden chair',
    file: 'wooden_chair',
    scale: 0.9,
    size: [0.418, 0.941, 0.457],
    // Lett: dyttes og velter, og ligger i hauger i Level 0 (gen/chair-piles.js, o.tip). Bein, sete og rygg.
    loose: {
      mass: 4,
      com: 0.45,
      parts: [
        [-0.18, 0.2, 0.18, 0.02, 0.2, 0.02],
        [0.18, 0.2, 0.18, 0.02, 0.2, 0.02],
        [-0.18, 0.2, -0.19, 0.02, 0.2, 0.02],
        [0.18, 0.2, -0.19, 0.02, 0.2, 0.02],
        [0, 0.41, 0, 0.2, 0.02, 0.21],
        [0, 0.685, -0.205, 0.19, 0.255, 0.02],
      ],
    },
    ...ccBy('Wooden Chair', 'Manuel López', 'https://sketchfab.com/3d-models/wooden-chair-75258f5b06534b0fb64e16eb842e3f64', 'https://sketchfab.com/manuelopez'),
  },
};
