// Gjenstander som ligger veltet (o.tip): på ryggen eller på siden – stolene i haugene i Level 0
// (gen/chair-piles.js). tipFrame sier hvordan modellen dreies og hvor bunnpunktet dens havner, så
// 3D (world/objects.js) og fysikken (world/softphysics.js) legger den likt. Sammen med o.lift
// (løftet, oppå de andre i haugen) og o.off (flyttet innenfor ruten, [dx, dz] m). Ren logikk.

export const TIP = Object.freeze({ UP: 0, BACK: 1, SIDE: 2 });
export const TIPS = 3;
const HALF = Math.PI / 2;

/**
 * Veltingen i gjenstandens egne akser (før rot; forsiden mot +z, bunnen i y = 0):
 * { axis, angle } dreier modellen om bunnpunktet, offset er der bunnpunktet havner sett fra midten
 * av fotavtrykket på gulvet, og size = utstrekningen [x, høyde, z] etterpå.
 * @param size gjenstandens [bredde, høyde, dybde] stående (katalogens size)
 */
export function tipFrame(tip, [w, h, d]) {
  // På ryggen: ryggen (−z) ned i gulvet, beina peker fram.
  if (tip === TIP.BACK) return { axis: [1, 0, 0], angle: -HALF, offset: [0, d / 2, h / 2], size: [w, d, h] };
  // På siden: høyre side (+x) ned, toppen peker mot −x.
  if (tip === TIP.SIDE) return { axis: [0, 0, 1], angle: HALF, offset: [h / 2, w / 2, 0], size: [h, w, d] };
  return { axis: [0, 1, 0], angle: 0, offset: [0, 0, 0], size: [w, h, d] };
}

/** Bunnpunktet til modellen i rommet: posituren (midt i fotavtrykket på gulvet) + offset dreid med rot. */
export function tipOrigin(pose, size) {
  const [ox, oy, oz] = tipFrame(pose.tip ?? 0, size).offset;
  const a = (-pose.rot * Math.PI) / 2; // som rotation.y i world/objects.js
  return [pose.x + ox * Math.cos(a) + oz * Math.sin(a), pose.y + oy, pose.z - ox * Math.sin(a) + oz * Math.cos(a)];
}

/** Dreiningen som kvaternion [x, y, z, w]: først veltingen, så rot om loddaksen. */
export function tipQuaternion(pose, size) {
  const { axis, angle } = tipFrame(pose.tip ?? 0, size);
  const t = [axis[0] * Math.sin(angle / 2), axis[1] * Math.sin(angle / 2), axis[2] * Math.sin(angle / 2), Math.cos(angle / 2)];
  const half = (-pose.rot * Math.PI) / 4;
  const y = [0, Math.sin(half), 0, Math.cos(half)];
  // y · t (Hamilton-produkt)
  return [
    y[3] * t[0] + y[0] * t[3] + y[1] * t[2] - y[2] * t[1],
    y[3] * t[1] - y[0] * t[2] + y[1] * t[3] + y[2] * t[0],
    y[3] * t[2] + y[0] * t[1] - y[1] * t[0] + y[2] * t[3],
    y[3] * t[3] - y[0] * t[0] - y[1] * t[1] - y[2] * t[2],
  ];
}

/** o.tip/o.lift/o.off fra en fil: gyldige verdier, ellers utelatt. */
export function tipFromJSON(o) {
  const out = {};
  const tip = Math.trunc(Number(o?.tip));
  if (tip > 0 && tip < TIPS) out.tip = tip;
  const lift = Number(o?.lift);
  if (lift > 0 && lift <= 3) out.lift = Math.round(lift * 1000) / 1000;
  const off = o?.off;
  if (Array.isArray(off) && off.length === 2 && off.every((v) => Number.isFinite(Number(v)))) {
    const [dx, dz] = off.map((v) => Math.round(Math.max(-0.5, Math.min(0.5, Number(v))) * 1000) / 1000);
    if (dx || dz) out.off = [dx, dz];
  }
  return out;
}
