// Side profiles in local [z, height] coordinates, used by rendering and physics.
export function softProfile(form, h, d) {
  if (form === 'ramp') return [[-d / 2, 0], [d / 2, 0], [d / 2, .025], [-d / 2, h]];
  if (form === 'steps') return [[-d / 2, 0], [d / 2, 0], [d / 2, h / 2], [0, h / 2], [0, h], [-d / 2, h]];
  return null;
}
