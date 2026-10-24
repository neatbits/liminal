// Rosa betong til betongsalene (et sjeldent nivå i den uendelige utforskingen, gen/babbdi.js):
// støvete, rosa-beige forskalingsbetong med bordstruktur, skjøter og stagjernshull, og et glatt,
// litt flekkete gulv. Samme oppskrift som parkeringskjellerens betong (concrete.js).
import { fbm, periodicNoise, smoothstep } from './noise.js';
import { makeCanvas, pixelPass, blotch } from './paint.js';

function setRGB(d, i, rgb, f) {
  d[i] = rgb[0] * f;
  d[i + 1] = rgb[1] * f;
  d[i + 2] = rgb[2] * f;
  d[i + 3] = 255;
}

/** 512 px = 3 m (temaets size): bord på ~18 cm, skjøter og fire stagjernshull per felt. */
export function concretePink(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  const n1 = fbm(S, 4, 6, rand);
  const boards = periodicNoise(32, 1, rand);
  const base = [216, 190, 179];
  pixelPass(ctx, S, (x, y, i, d) => {
    const n = n1[y * S + x];
    let f = 0.86 + 0.16 * n + (rand() - 0.5) * 0.05;
    f *= 0.96 + 0.06 * boards((y / S) * 32, 0); // bordene i forskalingen
    if (y % 32 < 1) f *= 0.94;
    if (y % 256 < 2 || x % 256 < 2) f *= 0.82; // skjøter mellom forskalingsfeltene
    const hx = (x % 128) - 64, hy = (y % 128) - 64;
    if (hx * hx + hy * hy < 16) f *= 0.55; // stagjernshull
    f *= 1 - 0.12 * smoothstep(0.65, 0.95, n) * (y / S); // rennestriper nedover
    setRGB(d, i, base, f);
  });
  return canvas;
}

export function concretePinkFloor(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  const n1 = fbm(S, 3, 6, rand);
  const base = [200, 174, 164];
  pixelPass(ctx, S, (x, y, i, d) => {
    let f = 0.88 + 0.14 * n1[y * S + x] + (rand() - 0.5) * 0.06;
    if (x < 2 || y < 2) f *= 0.7;
    setRGB(d, i, base, f);
  });
  for (let k = 0; k < 4; k++) blotch(ctx, S, rand() * S, rand() * S, 30 + rand() * 50, 'rgba(90,60,50,0.18)');
  return canvas;
}
