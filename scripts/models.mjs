// Gjør kildemodellene i 3dmodels/<navn>/ (glTF fra Poly Haven, Sketchfab …) om til én komprimert
// models/<navn>.glb hver: teksturer som WebP på maks 1024 px, meshopt-komprimert geometri og
// ubrukte data fjernet. Kjør med `npm run models` etter å ha lagt til eller endret en modell.
//
// Forbehandling før komprimeringen:
// - Materialer i det gamle spec/gloss-formatet gjøres om til metal/rough (three.js leser ikke
//   spec/gloss lenger – teksturene ville forsvunnet).
// - Modeller med «bakt» lys i emissive-teksturen og ingen fargetekstur (vanlig fra Blender,
//   ofte med unlit-materialer) får emissive-teksturen som fargetekstur – three.js viser ellers
//   ikke teksturen på unlit-materialer.
// - Valgfri 3dmodels/<navn>/model.json: { "drop": ["Plane_BakedTable", …] } fjerner deler av
//   modellen (noder med navn som begynner slik), f.eks. et bord eller et gulv modellen kom med,
//   og "textureSize": 512 gir mindre teksturer (for store filer). "simplify": 0.15 forenkler
//   geometrien til ca. 15 % av trekantene (tunge modeller; "simplifyError" = tillatt feil).
//   "split": { "<navn>": "<nodeprefiks>", … } deler en fil med flere modeller i hver sin
//   models/<navn>.glb (bare noden som starter med prefikset, og det under den, beholdes).
// Bare modeller som er nyere enn sin .glb (eller mangler den) bygges; --all bygger alle.
import { readdirSync, mkdirSync, statSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, prune, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const SRC = '3dmodels';
const OUT = 'models';
const all = process.argv.includes('--all');
mkdirSync(OUT, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

/** Nyeste endringstid i mappen (modellfil, bin, teksturer, model.json). */
function newest(dir) {
  let t = 0;
  for (const f of readdirSync(dir, { recursive: true })) t = Math.max(t, statSync(join(dir, String(f))).mtimeMs);
  return t;
}

for (const name of readdirSync(SRC)) {
  const dir = join(SRC, name);
  if (!statSync(dir).isDirectory()) continue;
  const file = readdirSync(dir).find((f) => ['.gltf', '.glb'].includes(extname(f).toLowerCase()));
  if (!file) {
    console.warn(`${name}: ingen .gltf/.glb – hoppet over`);
    continue;
  }
  const configFile = join(dir, 'model.json');
  const config = existsSync(configFile) ? JSON.parse(readFileSync(configFile, 'utf8')) : {};
  for (const [target, keep] of config.split ? Object.entries(config.split) : [[name, null]]) {
    await build(dir, file, config, target, keep);
  }
}

async function build(dir, file, config, name, keep) {
  const out = join(OUT, `${name}.glb`);
  if (!all && existsSync(out) && statSync(out).mtimeMs > newest(dir)) return;

  const doc = await io.read(join(dir, file));
  if (keep) {
    // Bare den ene modellen: søsknene til noden med prefikset fjernes.
    const node = doc.getRoot().listNodes().find((n) => n.getName().startsWith(keep));
    if (!node) throw new Error(`${name}: fant ingen node som starter med «${keep}»`);
    for (const sib of node.getParentNode()?.listChildren() ?? []) if (sib !== node) sib.dispose();
  }
  for (const prefix of config.drop ?? []) {
    for (const node of doc.getRoot().listNodes()) if (node.getName().startsWith(prefix)) node.dispose();
  }
  for (const m of doc.getRoot().listMaterials()) {
    if (m.getBaseColorTexture() || !m.getEmissiveTexture()) continue;
    m.setBaseColorTexture(m.getEmissiveTexture());
    m.setBaseColorFactor([1, 1, 1, 1]);
    m.setEmissiveTexture(null);
    m.setEmissiveFactor([0, 0, 0]);
  }
  await doc.transform(metalRough(), prune());
  // Tunge modeller (f.eks. AI-genererte): færre trekanter, med liten synlig feil.
  if (config.simplify) {
    await MeshoptSimplifier.ready;
    await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: config.simplify, error: config.simplifyError ?? 0.004 }));
  }
  const tmp = join(tmpdir(), `liminal-model-${name}.glb`);
  await io.write(tmp, doc);

  execFileSync(
    process.execPath,
    [
      'node_modules/@gltf-transform/cli/bin/cli.js',
      'optimize',
      tmp,
      out,
      '--compress', 'meshopt',
      '--texture-compress', 'webp',
      '--texture-size', String(config.textureSize ?? 1024),
      '--simplify', 'false',
    ],
    { stdio: 'inherit' },
  );
  rmSync(tmp, { force: true });
  console.log(`${name}: ${(statSync(out).size / 1024).toFixed(0)} kB → ${out}`);
}
