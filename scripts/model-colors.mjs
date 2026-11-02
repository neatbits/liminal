// Vertex-farger (COLOR_0) blir ensfargede materialer (scripts/models.mjs, "vertexColors": k i model.json). Gjenstandene i
// spillet bruker bare posisjon, normal og teksturkoordinater (world/object-parts.js), så en modell som har fargene i
// hjørnene (skannede modeller, ofte delt i biter på 65k hjørner) ble hvit. Trekantene samles i k fargegrupper (k-means på
// trekantenes snittfarge, i omtrent sRGB så mørke toner skilles), og hver gruppe får et eget materiale med gruppens farge.
// Med "join" slås gruppene sammen etterpå, så modellen ender med k deler (én palett i spillet).

const SAMPLES = 30000; // trekanter som brukes til å finne fargene (alle får en gruppe etterpå)
const ROUNDS = 12;

/** COLOR_0 som lineære RGB-tall (normaliserte heltall gjøres om). */
function colorsOf(accessor) {
  const a = accessor.getArray();
  const n = accessor.getElementSize();
  const max = a instanceof Float32Array ? 1 : a instanceof Uint16Array ? 65535 : a instanceof Uint8Array ? 255 : 1;
  return { get: (i) => [a[i * n] / max, a[i * n + 1] / max, a[i * n + 2] / max] };
}

const toSrgb = (c) => c.map((v) => Math.max(0, v) ** (1 / 2.2));
const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

function nearest(centres, c) {
  let best = 0;
  for (let k = 1; k < centres.length; k++) if (dist(centres[k], c) < dist(centres[best], c)) best = k;
  return best;
}

/** k-means på (sRGB-)fargene: k sentre, startet spredt (k-means++ uten tilfeldighet: lengst unna de valgte). */
function cluster(samples, k) {
  const centres = [samples[0]];
  while (centres.length < k) {
    let far = samples[0];
    let d = -1;
    for (const s of samples) { const m = Math.min(...centres.map((c) => dist(c, s))); if (m > d) [d, far] = [m, s]; }
    centres.push(far);
  }
  for (let r = 0; r < ROUNDS; r++) {
    const sum = centres.map(() => [0, 0, 0, 0]);
    for (const s of samples) { const t = sum[nearest(centres, s)]; t[0] += s[0]; t[1] += s[1]; t[2] += s[2]; t[3]++; }
    sum.forEach((t, j) => { if (t[3]) centres[j] = [t[0] / t[3], t[1] / t[3], t[2] / t[3]]; });
  }
  return centres;
}

/** Gjør vertex-fargene i dokumentet om til k ensfargede materialer per opprinnelig materiale. */
export function vertexColorsToMaterials(doc, k) {
  const prims = doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives().map((p) => ({ mesh, p })))
    .filter(({ p }) => p.getAttribute('COLOR_0') && p.getIndices());
  if (!prims.length) return 0;
  // Trekantenes snittfarge (sRGB til gruppering, lineær til materialfargen).
  const tris = prims.map(({ p }) => {
    const col = colorsOf(p.getAttribute('COLOR_0'));
    const idx = p.getIndices().getArray();
    const out = [];
    for (let t = 0; t < idx.length; t += 3) {
      const [a, b, c] = [col.get(idx[t]), col.get(idx[t + 1]), col.get(idx[t + 2])];
      out.push([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]);
    }
    return out;
  });
  const all = tris.flat();
  const step = Math.max(1, Math.floor(all.length / SAMPLES));
  const centres = cluster(all.filter((_, i) => i % step === 0).map(toSrgb), k);
  // Materialfargen: lineært snitt av trekantene i gruppen.
  const lin = centres.map(() => [0, 0, 0, 0]);
  const group = tris.map((list) => list.map((c) => { const j = nearest(centres, toSrgb(c)); const t = lin[j]; t[0] += c[0]; t[1] += c[1]; t[2] += c[2]; t[3]++; return j; }));
  const materials = new Map(); // `${opprinnelig}|${gruppe}` → materiale
  prims.forEach(({ mesh, p }, n) => {
    const idx = p.getIndices().getArray();
    const base = p.getMaterial();
    for (let j = 0; j < k; j++) {
      const own = [];
      group[n].forEach((g, t) => { if (g === j) own.push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]); });
      if (!own.length) continue;
      const key = `${base?.getName() ?? ''}|${j}`;
      if (!materials.has(key)) {
        const [r, g, b, count] = lin[j];
        const m = doc.createMaterial(`${base?.getName() ?? 'colour'}_${j}`).setBaseColorFactor([r / count, g / count, b / count, 1])
          .setMetallicFactor(0).setRoughnessFactor(1).setDoubleSided(base?.getDoubleSided() ?? false);
        materials.set(key, m);
      }
      const indices = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(own)).setBuffer(p.getIndices().getBuffer());
      const part = doc.createPrimitive().setIndices(indices).setMaterial(materials.get(key)).setMode(p.getMode());
      for (const semantic of p.listSemantics()) if (semantic !== 'COLOR_0') part.setAttribute(semantic, p.getAttribute(semantic));
      mesh.addPrimitive(part);
    }
    mesh.removePrimitive(p);
    p.dispose();
  });
  return materials.size;
}
