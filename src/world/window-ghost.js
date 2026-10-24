// Spøkelset utenfor vinduene (world/window-ghost-view.js): hvor det står utenfor et vindu, og om man
// ser mot den veggretningen. Det synes gjennom alle vinduer med samme retning, så det må dukke opp
// og forsvinne mens man ser en annen vei. Ren logikk – view3d/window-ghost.js setter uniformene.

/**
 * Et sted ute i byen, et stykke unna vinduet, med midten omtrent i øyehøyde (det svever over
 * gatene). y er bunnen av spøkelset (bildet er 1,7 m høyt, core/ghost.js).
 * @param win vinduet ({ x, z, n: [dx, dz] inn i rommet, floor }, core/windows.js)
 * @returns {{ along, y, out, frame }} i vindusutsiktens koordinater (langs veggen, høyde, ut fra veggen)
 */
export function ghostSpot(win, rand) {
  const [nx, nz] = win.n;
  const face = [win.x + 0.5 + nx * 0.5, win.z + 0.5 + nz * 0.5]; // veggflaten mot rommet
  const along = face[0] * -nz + face[1] * nx + (rand() - 0.5) * 8;
  return { along, y: win.floor + 0.75 + (rand() - 0.6) * 3, out: 8 + rand() * 7, frame: [nx, nz] };
}

/** Ser man (blikket i xz, forward) ut mot veggretningen frame (normalen inn i rommet)? */
export function facingWall(forward, frame) {
  const len = Math.hypot(forward[0], forward[1]) || 1;
  return -(forward[0] * frame[0] + forward[1] * frame[1]) / len > 0.25;
}
