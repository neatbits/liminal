import * as THREE from 'three';
import { surfaceMaterial } from './materials.js';

// See-through glass with grazing-angle sheen and faint diagonal light streaks.
export function shopGlassMaterial(shared) {
  const m = surfaceMaterial({ color: '#93b8b8' }, shared);
  m.transparent = true;
  m.depthWrite = false;
  m.side = THREE.DoubleSide;
  m.fragmentShader = m.fragmentShader.replace('gl_FragColor = vec4(col, 1.0);', `
    vec3 N = normalize(cross(dFdx(vPos), dFdy(vPos)));
    vec3 V = normalize(cameraPosition - vPos);
    float fres = pow(1.0 - abs(dot(N, V)), 4.0);
    float streak = pow(max(0.0, sin(vPos.x * 0.9 + vPos.y * 1.7)), 28.0);
    gl_FragColor = vec4(col + vec3(0.24, 0.19, 0.25) * (fres + streak * 0.3) * uBoost, 0.1 + fres * 0.3 + streak * 0.035);`);
  return m;
}
