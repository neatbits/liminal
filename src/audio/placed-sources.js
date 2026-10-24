// Physical sound emitters inferred from the room; pure data and spatial mixing.
import { fountainJets } from '../core/fountain-jets.js';
import { escalatorRuns } from '../core/escalators.js';
import { poser } from '../core/objects.js';
import { cellHeights, lineOfSight } from '../world/lighting.js';
import { closedDoorFaces } from '../core/doors.js';

export const PLACED_SOUNDS = {
  fountain: { range: 18, gain: 0.28, cutoff: 4200 },
  escalator: { range: 12, gain: 0.16, cutoff: 1700 },
  arcade: { range: 11, gain: 0.1, cutoff: 3200 },
};

export function placedSources(level) {
  const sources = fountainJets(level).map(j => ({ kind: 'fountain', x: j.x, y: 0.5, z: j.z }));
  for (const r of escalatorRuns(level))
    sources.push({
      kind: 'escalator',
      x: r.origin[0] + r.dir[0] * r.length * 0.5 + (r.dir[0] ? 0 : r.width * 0.5),
      z: r.origin[1] + r.dir[1] * r.length * 0.5 + (r.dir[1] ? 0 : r.width * 0.5),
      y: r.low + r.rise * 0.5 + 0.2,
    });
  const pose = poser(level);
  for (const o of level.objects ?? [])
    if (o.id === 'arcade' || o.id === 'arcade2') {
      const p = pose(o);
      sources.push({ kind: 'arcade', x: p.x, y: p.y + 1.2, z: p.z });
    }
  return sources;
}

export function sourceMix(source, listener, occluded = false, quiet = 1) {
  const def = PLACED_SOUNDS[source.kind],
    dx = source.x - listener.x,
    dz = source.z - listener.z;
  const distance = Math.hypot(dx, dz, source.y - (listener.y + 1.4));
  const fade = Math.max(0, 1 - distance / def.range);
  const gain =
    ((def.gain * fade * fade) / (1 + distance * 0.12)) *
    (occluded ? 0.18 : 1) *
    quiet *
    (listener.power ?? 1);
  const pan = (dx * Math.cos(listener.yaw) - dz * Math.sin(listener.yaw)) / (Math.hypot(dx, dz) || 1);
  return { gain, pan: Math.max(-1, Math.min(1, pan * 0.85)), cutoff: occluded ? 450 : def.cutoff };
}

export class PlacedSourceMap {
  constructor(level) {
    this.level = level;
    this.sources = placedSources(level);
    this.heights = cellHeights(level);
  }
  mix(listener, quiet) {
    this.heights.faces = closedDoorFaces(this.level);
    return Object.keys(PLACED_SOUNDS).map(kind => {
      // Only raycast the two nearest audible candidates of each type, at 4 Hz.
      const candidates = this.sources
        .filter(s => s.kind === kind)
        .map(s => ({ s, m: sourceMix(s, listener, false, quiet) }))
        .filter(c => c.m.gain > 0.00001)
        .sort((a, b) => b.m.gain - a.m.gain)
        .slice(0, 2);
      let best = { gain: 0, pan: 0, cutoff: 450 };
      for (const { s } of candidates) {
        const blocked = !lineOfSight(
          this.level,
          listener.x,
          listener.z,
          s.x,
          s.z,
          this.heights,
          listener.y + 1.4,
          s.y,
        );
        const m = sourceMix(s, listener, blocked, quiet);
        if (m.gain > best.gain) best = m;
      }
      return { kind, ...best };
    });
  }
}
