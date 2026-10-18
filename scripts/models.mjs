// Gjør kildemodellene i 3dmodels/<navn>/ (glTF fra f.eks. Poly Haven) om til én komprimert
// models/<navn>.glb hver: teksturer som WebP på maks 1024 px, meshopt-komprimert geometri og
// ubrukte data fjernet. Kjør med `npm run models` etter å ha lagt til eller endret en modell.
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const SRC = '3dmodels';
const OUT = 'models';
mkdirSync(OUT, { recursive: true });

for (const name of readdirSync(SRC)) {
  const dir = join(SRC, name);
  if (!statSync(dir).isDirectory()) continue;
  const file = readdirSync(dir).find((f) => ['.gltf', '.glb'].includes(extname(f).toLowerCase()));
  if (!file) {
    console.warn(`${name}: ingen .gltf/.glb – hoppet over`);
    continue;
  }
  const out = join(OUT, `${name}.glb`);
  execFileSync(
    process.execPath,
    [
      'node_modules/@gltf-transform/cli/bin/cli.js',
      'optimize',
      join(dir, file),
      out,
      '--compress', 'meshopt',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--simplify', 'false',
    ],
    { stdio: 'inherit' },
  );
  console.log(`${name}: ${(statSync(out).size / 1024).toFixed(0)} kB → ${out}`);
}
