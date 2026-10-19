// Glans i blanke fliser: armaturene i taket speiler seg i gulv- og veggfliser. Billig – ingen
// ekstra tegnepass: speilstrålen fra hver piksel følges opp til armaturhøyden og slås opp i et
// lite kart over armaturene (world/lamp-map.js), med noen stikkprøver for vegger i veien. Fugene
// er matte, og hver flis ligger litt skjevt, så speilbildet brytes opp flis for flis.
import * as THREE from 'three';
import { lampData, LAMP_STEP } from './lamp-map.js';

export const GLOSS_PARS = /* glsl */ `
uniform sampler2D uLamps;
uniform vec2 uLampGrid;
uniform vec2 uLampHalf;
uniform float uLampRound;
uniform vec3 uLampColor;
vec4 lampAt(vec2 xz) { return texture2D(uLamps, (floor(xz) + 0.5) / uLampGrid); }
float tileHash(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
vec3 lampGlint(vec3 p, vec3 N, vec3 V) {
  vec3 R = reflect(-V, N);
  if (R.y < 0.02) return vec3(0.0);
  vec2 from = p.xz + N.xz * 0.2;
  float t = (lampAt(from).b * ${(255 * LAMP_STEP).toFixed(2)} - p.y) / R.y;
  if (t <= 0.0) return vec3(0.0);
  vec2 hit = p.xz + R.xz * t;
  if (any(lessThan(hit, vec2(0.0))) || any(greaterThanEqual(hit, uLampGrid))) return vec3(0.0);
  vec4 lamp = lampAt(hit);
  if (lamp.r < 0.5) return vec3(0.0);
  for (int k = 1; k < 4; k++) if (lampAt(mix(from, hit, float(k) * 0.25)).a < 0.5) return vec3(0.0);
  vec2 cell = floor(hit);
  t = (lamp.b * ${(255 * LAMP_STEP).toFixed(2)} - p.y) / R.y;
  vec2 d = abs(p.xz + R.xz * t - cell - 0.5) / uLampHalf;
  float dist = uLampRound > 0.5 ? length(d) : max(d.x, d.y);
  float blur = (0.01 + t * 0.012) / min(uLampHalf.x, uLampHalf.y);
  float s = 1.0 - smoothstep(1.0 - blur, 1.0 + blur, dist);
  float g = floor(lamp.g * 255.0 + 0.5) - 1.0;
  if (g >= 0.0) s *= 0.04 + 0.96 * dot(uFlick, vec4(equal(vec4(g), vec4(0.0, 1.0, 2.0, 3.0))));
  return uLampColor * s;
}
// gUv: flisrutenettet (1 per flis), amount: hvor blank flaten er.
vec3 gloss(vec2 gUv, float amount, vec3 light) {
  vec2 f = fract(gUv);
  float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  float mask = smoothstep(0.03, 0.07, edge) * amount;
  if (mask <= 0.0) return vec3(0.0);
  vec3 N = normalize(cross(dFdx(vPos), dFdy(vPos)));
  vec3 V = normalize(cameraPosition - vPos);
  if (dot(N, V) < 0.0) N = -N;
  vec2 c = floor(gUv);
  vec3 tilt = (vec3(tileHash(c), tileHash(c + 17.0), tileHash(c + 41.0)) - 0.5) * 0.025;
  N = normalize(N + tilt - N * dot(N, tilt));
  float fres = 0.05 + 0.95 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  return (lampGlint(vPos, N, V) + light * 0.25) * fres * mask;
}`;

/** Uniforms for glansen (legges i de delte uniformene), og kartet som må frigjøres. */
export function createGlossUniforms(level, lights, theme) {
  const f = theme.fixture;
  const below = (f.drop ?? 0) + f.size[1];
  const tex = new THREE.DataTexture(lampData(level, lights, below), level.w, level.h, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return {
    uniforms: {
      uLamps: { value: tex },
      uLampGrid: { value: new THREE.Vector2(level.w, level.h) },
      uLampHalf: { value: new THREE.Vector2(f.size[0] / 2, f.size[2] / 2) },
      uLampRound: { value: f.shape === 'disc' || f.shape === 'dome' ? 1 : 0 },
      uLampColor: { value: new THREE.Color(f.color).multiplyScalar(f.glow) },
    },
    dispose: () => tex.dispose(),
  };
}
