// Reproduserbar CPU-måling av generering og lysbakte flater, uten GPU eller modellnedlasting.
import { generateLevel } from '../src/gen/index.js';
import { getTheme } from '../src/core/themes.js';
import { windows } from '../src/core/windows.js';
import { collectLights, createLightField } from '../src/world/lighting.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { objectPose, poser } from '../src/core/object-pose.js';

const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
for (const theme of ['office', 'mall', 'playroom', 'school']) {
  const runs = [];
  let stats;
  for (let run = 0; run < 6; run++) {
    const start = performance.now();
    const level = generateLevel({ theme, w: 64, h: 48, seed: 6 });
    const generated = performance.now();
    const lights = collectLights(level);
    const field = createLightField(level, getTheme(theme), lights);
    const data = buildSurfaces(level, field);
    const baked = performance.now();
    const legacyStart = performance.now();
    for (const o of level.objects) objectPose(level, o);
    const legacyMs = performance.now() - legacyStart;
    const pose = poser(level);
    const sharedStart = performance.now();
    for (const o of level.objects) pose(o);
    const sharedMs = performance.now() - sharedStart;
    if (run) runs.push([generated - start, baked - generated, legacyMs, sharedMs]);
    stats = { windows: windows(level).length, lights: lights.length, objects: level.objects.length,
      vertices: Object.values(data).reduce((n, mesh) => n + mesh.vertexCount, 0) };
  }
  const [generateMs, bakeMs, separatePosesMs, sharedPosesMs] = [0, 1, 2, 3].map((i) => +median(runs.map((r) => r[i])).toFixed(2));
  console.log(JSON.stringify({ theme, size: '64x48', seed: 6, ...stats, generateMs, bakeMs, separatePosesMs, sharedPosesMs }));
}
