// Ekte Web Audio-graf i OfflineAudioContext. Ingen lyd sendes til høyttalere.
import { AudioEngine } from '../src/audio/engine.js';
import { noiseBuffer, thumpBuffer } from '../src/audio/synth.js';
import { bump } from '../src/audio/effects.js';
import { getTheme } from '../src/core/themes.js';
import { mulberry32 } from '../src/core/rng.js';

function wavBase64(data, rate) {
  const bytes = new ArrayBuffer(44 + data.length * 2), view = new DataView(bytes);
  const text = (at, value) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, 36 + data.length * 2, true); text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) view.setInt16(44 + 2 * i, Math.max(-32768, Math.min(32767, Math.round(data[i] * 32767))), true);
  const array = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < array.length; i += 4096) binary += String.fromCharCode(...array.subarray(i, i + 4096));
  return btoa(binary);
}

export async function renderContact(surface, { muted = false, paused = false } = {}) {
  const rate = 48000, ctx = new OfflineAudioContext(1, rate, rate);
  const audio = new AudioEngine();
  const oldRandom = Math.random;
  Math.random = mulberry32(18);
  try {
    audio.ctx = ctx;
    audio.master = ctx.createGain(); audio.master.gain.value = audio.volume; audio.master.connect(ctx.destination);
    audio.brown = noiseBuffer(ctx, 1, 'brown');
    audio.thump = thumpBuffer(ctx);
    const theme = surface === 'carpet' ? 'backrooms' : ['tile', 'water'].includes(surface) ? 'pool' : 'playroom';
    audio.graph = audio._build({ ...getTheme(theme).sound, room: 0, hum: 0, buzz: 0 });
    audio.playing = !paused; audio.enabled = !muted;
    if (surface === 'rubber' || surface === 'plastic') bump(audio, 1, surface);
    else audio.step(surface);
  } finally { Math.random = oldRandom; }
  const result = await ctx.startRendering(), data = result.getChannelData(0);
  let energy = 0, early = 0, tail = 0, peak = 0;
  for (let i = 0; i < data.length; i++) {
    energy += data[i] ** 2; peak = Math.max(peak, Math.abs(data[i]));
    if (i < rate * 0.012) early += data[i] ** 2;
    if (i > rate * 0.35) tail += data[i] ** 2;
  }
  return { peak, rms: Math.sqrt(energy / data.length), early: energy ? early / energy : 0,
    tail: energy ? tail / energy : 0, wav: wavBase64(data, rate) };
}
