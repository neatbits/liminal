// Romklangen: en kort (små rom, ganger) og en lang (store haller), og blandingen mellom dem
// følger rommet man står i (acoustics.js). Alt som sendes til `input`, får klang.
import { impulseResponse } from './synth.js';

/**
 * @param sound temaets lyd (reverb = hvor klangfullt temaet er, reverbTime = lengden i store rom)
 * @param keep registrerer noder som skal kobles fra når lydbildet rives
 */
export function createSpace(ctx, sound, out, keep) {
  const input = keep(ctx.createGain());
  const short = keep(ctx.createConvolver());
  short.buffer = impulseResponse(ctx, 0.5, 0.65);
  const long = keep(ctx.createConvolver());
  long.buffer = impulseResponse(ctx, Math.max(2.6, sound.reverbTime * 1.4), sound.reverb > 0.4 ? 0.7 : 0.5);
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
