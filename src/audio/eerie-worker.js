// Lager de skumle lydene (audio/eerie.js) i en bakgrunnstråd: de syntetiseres prøve for prøve, og en lyd kunne ta opptil
// 100 ms – midt i et bilde. Lydkonteksten finnes ikke her, så oppskriftene får en stedfortreder med samme sampleRate og
// createBuffer; prøvene sendes tilbake uten kopiering (audio/eerie-pool.js lager AudioBuffer av dem).
import { eerieBuffer } from './eerie.js';

function fakeContext(sampleRate) {
  return {
    sampleRate,
    createBuffer(channels, length, rate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { length, numberOfChannels: channels, sampleRate: rate, duration: length / rate, getChannelData: (c) => data[c] };
    },
  };
}

self.onmessage = ({ data: { id, name, sampleRate } }) => {
  try {
    const b = eerieBuffer(fakeContext(sampleRate), name);
    const channels = Array.from({ length: b.numberOfChannels }, (_, c) => b.getChannelData(c));
    self.postMessage({ id, name, sampleRate: b.sampleRate, channels }, channels.map((c) => c.buffer));
  } catch (error) {
    self.postMessage({ id, name, error: String(error?.message ?? error) });
  }
};
