// Romklangen: en kort (små rom, ganger) og en lang (store haller), og blandingen mellom dem
// følger rommet man står i (acoustics.js). Alt som sendes til `input`, får klang.
import { impulseResponse } from './synth.js';

// Klangene gjenbrukes – selve klangnodene, per lydkontekst og lengde/klarhet: å lage en lang klang og gi den til en ny
// node (som da forbereder den) tok flere titalls millisekunder midt i et bilde ved hvert temabytte (Noclip, etasjer).
// Lydbildet som rives, kobler bare nodene fra (engine._teardown), så de kan kobles inn igjen i det neste.
const made = new WeakMap();
function convolver(ctx, seconds, brightness) {
  if (!made.has(ctx)) made.set(ctx, new Map());
  const cache = made.get(ctx);
  const key = `${seconds.toFixed(2)}|${brightness}`;
  if (!cache.has(key)) {
    const node = ctx.createConvolver();
    node.buffer = impulseResponse(ctx, seconds, brightness);
    cache.set(key, node);
  }
  return cache.get(key);
}
const longOf = (sound) => [Math.max(2.6, sound.reverbTime * 1.4), sound.reverb > 0.4 ? 0.7 : 0.5];

/** Lager klangene for temaets lyd på forhånd (neste område i Noclip), så byttet ikke må gjøre det. */
export function warmSpace(ctx, sound) {
  convolver(ctx, 0.5, 0.65);
  convolver(ctx, ...longOf(sound));
}

/**
 * @param sound temaets lyd (reverb = hvor klangfullt temaet er, reverbTime = lengden i store rom)
 * @param keep registrerer noder som skal kobles fra når lydbildet rives
 */
export function createSpace(ctx, sound, out, keep) {
  const input = keep(ctx.createGain());
  const short = keep(convolver(ctx, 0.5, 0.65));
  const long = keep(convolver(ctx, ...longOf(sound)));
  const small = keep(ctx.createGain());
  const large = keep(ctx.createGain());
  const base = 0.3 + sound.reverb; // temaets generelle klangfullhet
  small.gain.value = 0.4 * base;
  large.gain.value = 0.3 * base;
  input.connect(short).connect(small).connect(out);
  input.connect(long).connect(large).connect(out);
  return {
    input,
    /** mix = reverbMix(size): glir over til den nye klangen i løpet av et halvt sekund. */
    set(mix) {
      const now = ctx.currentTime;
      small.gain.setTargetAtTime(mix.small * base, now, 0.5);
      large.gain.setTargetAtTime(mix.large * base, now, 0.5);
    },
  };
}
