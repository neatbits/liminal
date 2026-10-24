// CPU-måling av fysisk simulering (ingen rendering). Ikke en FPS- eller GPU-måling.
import { generateLevel } from '../src/gen/index.js';
import { SoftPhysics } from '../src/world/softphysics.js';
import { ballLayout } from '../src/world/ball-layout.js';

for (const [w, h] of [[48, 40], [96, 80]]) {
  const level = generateLevel({ theme: 'playroom', w, h, seed: 6 });
  const drawn = ballLayout(level).length;
  for (const enabled of [false, true]) {
    const copy = { ...level, objects: level.objects.filter((o) => enabled || o.id !== 'playball') };
    const start = performance.now(), phys = new SoftPhysics(copy);
    const buildMs = performance.now() - start;
    const times = [];
    for (let i = 0; i < 600; i++) {
      const began = performance.now();
      phys.step(1 / 60, { x: level.spawn.x + Math.sin(i / 90) * 2, z: level.spawn.z, y: 0, vx: Math.cos(i / 90), vz: 0 });
      if (i >= 120) times.push(performance.now() - began);
    }
    times.sort((a, b) => a - b);
    console.log(JSON.stringify({ size: `${w}x${h}`, enabled, drawnBalls: drawn,
      physicalBalls: phys.blocks.filter((p) => p.radius).length, movingBodies: phys.blocks.length,
      buildMs: +buildMs.toFixed(2), medianStepMs: +times[240].toFixed(3), p95StepMs: +times[456].toFixed(3) }));
  }
}
