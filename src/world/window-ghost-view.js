// The ghost, motionless, outside a window (Uncanny and Nightmare, view3d/window-ghost.js): a still
// image of the real ghost model (view3d/ghost-snapshot.js), set upright in the analytic window view
// (the Basement city and the other themes' landscapes) and hazed like the buildings. It stands
// outside one wall direction only (uGhostFrame = that wall's normal into the room).
export const WINDOW_GHOST = /* glsl */ `
uniform vec4 uGhost; // along, bottom of the image (y), distance out from the wall, visible (0/1)
uniform vec2 uGhostFrame;
uniform vec2 uGhostSize; // the image in metres
uniform sampler2D uGhostMap;
bool ghostHit(vec3 ro, vec3 rd, vec2 n, float limit, inout vec3 col, inout float dist) {
  float t = (uGhost.z - ro.z) / max(rd.z, 1e-4);
  vec2 q = (ro + rd * t).xy - uGhost.xy;
  // Seen from the room the view's x runs the other way than the image's.
  vec2 uv = vec2(0.5 - q.x / uGhostSize.x, q.y / uGhostSize.y);
  // Derivatives before any branch: implicit ones are undefined in non-uniform control flow,
  // and the mipmap level (the image is small at this distance) depends on them.
  vec2 du = dFdx(uv), dv = dFdy(uv);
  if (uGhost.w < 0.5 || rd.z <= 0.0 || dot(normalize(n), uGhostFrame) < 0.99) return false;
  if (t <= 0.0 || t >= limit) return false;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return false;
  vec4 image = textureGrad(uGhostMap, uv, du, dv);
  if (image.a < 0.5) return false;
  col = image.rgb;
  dist = t;
  return true;
}
`;
