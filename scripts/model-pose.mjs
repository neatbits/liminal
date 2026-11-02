// Baker én stilling fra en skjelettanimasjon inn i geometrien (model.json: "pose": sekunder inn i animasjonen). Spillet
// tegner modeller som stillestående geometri med bakt lys (world/objects.js), så uten dette står en animert figur i
// grunnstillingen (ofte med armene rett ut). Skjelettet og animasjonen fjernes etterpå. Kildefilene endres ikke.

/** a · b for 4 × 4-matriser i kolonneorden (glTF). */
function mul(a, b) {
  const out = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    out[c * 4 + r] = s;
  }
  return out;
}

/** Den inverse matrisen (Gauss-Jordan), for en vanlig affin transformasjon. */
function invert(m) {
  const a = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => m[c * 4 + r]).concat([0, 1, 2, 3].map((k) => (k === r ? 1 : 0))));
  for (let i = 0; i < 4; i++) {
    let p = i;
    for (let r = i + 1; r < 4; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
    [a[i], a[p]] = [a[p], a[i]];
    const d = a[i][i];
    for (let c = 0; c < 8; c++) a[i][c] /= d;
    for (let r = 0; r < 4; r++) if (r !== i) { const f = a[r][i]; for (let c = 0; c < 8; c++) a[r][c] -= f * a[i][c]; }
  }
  const out = new Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[c * 4 + r] = a[r][c + 4];
  return out;
}

/** Verdien til en kanal i tiden t (lineær; rotasjoner normaliseres etter blandingen). */
function sample(sampler, t, size) {
  const times = sampler.getInput().getArray();
  const values = sampler.getOutput().getArray();
  let i = 0;
  while (i < times.length - 2 && times[i + 1] <= t) i++;
  const f = times.length < 2 ? 0 : Math.max(0, Math.min(1, (t - times[i]) / (times[i + 1] - times[i] || 1)));
  const out = Array.from({ length: size }, (_, k) => values[i * size + k] * (1 - f) + (values[(i + 1) * size + k] ?? values[i * size + k]) * f);
  if (size === 4) { const n = Math.hypot(...out) || 1; return out.map((v) => v / n); }
  return out;
}

export function bakePose(doc, time) {
  const root = doc.getRoot();
  const animation = root.listAnimations()[0];
  if (!animation) throw new Error('pose krever en animert kilde');
  for (const channel of animation.listChannels()) {
    const node = channel.getTargetNode();
    const path = channel.getTargetPath();
    if (path === 'translation') node.setTranslation(sample(channel.getSampler(), time, 3));
    if (path === 'rotation') node.setRotation(sample(channel.getSampler(), time, 4));
    if (path === 'scale') node.setScale(sample(channel.getSampler(), time, 3));
  }
  for (const node of root.listNodes()) {
    const skin = node.getSkin();
    const mesh = node.getMesh();
    if (!skin || !mesh) continue;
    const inverseMesh = invert(node.getWorldMatrix());
    const ibm = skin.getInverseBindMatrices()?.getArray();
    const joints = skin.listJoints().map((joint, j) => mul(inverseMesh, mul(joint.getWorldMatrix(), ibm ? Array.from(ibm.slice(j * 16, j * 16 + 16)) : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])));
    for (const prim of mesh.listPrimitives()) {
      const J = prim.getAttribute('JOINTS_0');
      const W = prim.getAttribute('WEIGHTS_0');
      if (!J || !W) continue;
      for (const [semantic, w4] of [['POSITION', 1], ['NORMAL', 0]]) {
        const attr = prim.getAttribute(semantic);
        if (!attr) continue;
        const src = attr.getArray();
        const out = new Float32Array(src.length);
        const j = [0, 0, 0, 0];
        const w = [0, 0, 0, 0];
        for (let v = 0; v < attr.getCount(); v++) {
          J.getElement(v, j);
          W.getElement(v, w);
          const [x, y, z] = [src[v * 3], src[v * 3 + 1], src[v * 3 + 2]];
          let [ox, oy, oz] = [0, 0, 0];
          for (let k = 0; k < 4; k++) {
            if (!w[k]) continue;
            const m = joints[j[k]];
            ox += w[k] * (m[0] * x + m[4] * y + m[8] * z + m[12] * w4);
            oy += w[k] * (m[1] * x + m[5] * y + m[9] * z + m[13] * w4);
            oz += w[k] * (m[2] * x + m[6] * y + m[10] * z + m[14] * w4);
          }
          if (!w4) { const n = Math.hypot(ox, oy, oz) || 1; [ox, oy, oz] = [ox / n, oy / n, oz / n]; }
          out.set([ox, oy, oz], v * 3);
        }
        attr.setArray(out);
      }
      prim.setAttribute('JOINTS_0', null);
      prim.setAttribute('WEIGHTS_0', null);
    }
    node.setSkin(null);
    skin.dispose();
  }
  for (const a of root.listAnimations()) a.dispose();
}
