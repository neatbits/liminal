// Den sorte skikkelsen (Uncanny, Nightmare): høyde og bevegelse. Selve kroppen tegnes i en shader
// (view3d/figure-material.js), og AI-en står i world/monster-ai.js. Ren logikk.

export const FIGURE = {
  height: 2.05, // m: litt for høy
  plane: [1.5, 2.3], // m: flaten kroppen tegnes på, med plass til røyken rundt
};

/** Det som synes av bevegelsen; AI-koordinatene og kollisjonen ligger på gulvet. */
export function figurePose(time, ai, player) {
  return {
    x: ai.x,
    y: ai.y,
    z: ai.z,
    yaw: Math.atan2(player.x - ai.x, player.z - ai.z), // flaten vender alltid mot den som ser
    sway: Math.sin(time * 0.9) * 0.05 + Math.sin(time * 2.3 + 0.7) * 0.015,
  };
}
