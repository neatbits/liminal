// Rounded padding stays within the catalog/physics box; one mesh for all six panels.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const softRadius = (w, h, d) => Math.min(0.045, Math.min(w, h, d) * 0.1);
export const softPanels = (w, h, d) => [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];

export function softGeometry(w, h, d) {
  const source = new RoundedBoxGeometry(w, h, d, 2, softRadius(w, h, d));
  const uv = source.attributes.uv;
  const perFace = uv.count / 6;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / perFace);
    // Three columns × two rows, with a one-pixel gutter around every 256px panel.
    const u = (face % 3 + (1 + uv.getX(i) * 254) / 256) / 3;
    const v = (1 - Math.floor(face / 3) + (1 + uv.getY(i) * 254) / 256) / 2;
    uv.setXY(i, u, v);
  }
  source.translate(0, h / 2, 0);
  source.clearGroups();
  const geometry = mergeVertices(source);
  source.dispose();
  return geometry;
}
