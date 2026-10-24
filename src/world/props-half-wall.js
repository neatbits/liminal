import * as THREE from 'three';
import { HALF_WALL } from '../core/half-walls.js';
import { getTheme } from '../core/themes.js';
import { getTexture } from '../textures/index.js';
import { box, parts } from './props-geo.js';

/** Metre-based wallpaper UVs and enough vertices for the baked ceiling lights. */
function panel(w, h, d, y, size) {
  const g = new THREE.BoxGeometry(w, h, d, Math.ceil(w * 3), Math.ceil(h * 4), 1);
  g.translate(0, y, 0);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const u = Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i);
    uv.setXY(i, u / size[0], p.getY(i) / size[1]);
  }
  return g;
}

export function halfwall(key, texture = getTexture) {
  const s = getTheme(key.split(':')[1] ?? 'backrooms').surfaces;
  const { width: w, height: h, depth: d, bodyDepth: body, cap } = HALF_WALL;
  const base = s.base?.h ?? 0.07;
  return parts([
    { color: s.wall.color ?? '#ffffff', map: texture(s.wall.tex),
      geoms: [panel(w, h - cap, body, (h - cap) / 2, s.wall.size)] },
    { color: '#977348', geoms: [box(w, cap, d, 0, h - cap / 2, 0)] },
    { color: s.base?.color ?? '#827660', geoms: [box(w, base, body + 0.014, 0, base / 2, 0)] },
  ]);
}
