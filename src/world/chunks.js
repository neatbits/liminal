// Romlig inndeling uten å endre geometri, UV-er eller bakt lys. Ingen three.js.
import { MeshData } from './mesher.js';

export const SURFACE_CHUNK = 16;
export const BALL_CHUNK = 8;

export function spatialBuckets(items, size) {
  const buckets = new Map();
  for (const item of items) {
    const key = `${Math.floor(item.x / size)},${Math.floor(item.z / size)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  return [...buckets.values()];
}

/** Hele firkanter holdes samlet. Bounds beregnes senere fra ekte vertexer, ikke rutestørrelsen. */
export function surfaceChunks(data, size = SURFACE_CHUNK, minVertices = 8192) {
  if (data.vertexCount < minVertices) return [data];
  const chunks = new Map();
  for (let q = 0; q < data.vertexCount; q += 4) {
    let x = 0, z = 0;
    for (let v = q; v < q + 4; v++) { x += data.pos[v * 3]; z += data.pos[v * 3 + 2]; }
    const key = `${Math.floor(x / 4 / size)},${Math.floor(z / 4 / size)}`;
    if (!chunks.has(key)) chunks.set(key, new MeshData());
    const part = chunks.get(key), base = part.vertexCount;
    for (const [attribute, width] of [['pos', 3], ['uv', 2], ['light', 3], ['flick', 4]]) {
      for (let i = q * width; i < (q + 4) * width; i++) part[attribute].push(data[attribute][i]);
    }
    const offset = q / 4 * 6;
    for (let i = offset; i < offset + 6; i++) part.index.push(data.index[i] - q + base);
    part.vertexCount += 4;
  }
  return [...chunks.values()];
}
