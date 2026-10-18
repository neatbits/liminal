// Bakgrunnslydene i gåmodus (director.js bestemmer når): ventilasjonen som slår seg av og på med
// et klunk, dempet musikk fra et annet rom (mer dempet med vegger imellom), regn mot taket (lysere
// og sterkere ved vinduene) og stille perioder. Romklangen følger rommet (acoustics.js).
import { AmbienceDirector } from './director.js';
import { measureRoom, reverbMix } from './acoustics.js';
import { eerieBuffer } from './eerie.js';
import { lineOfSight } from '../world/lighting.js';
import { TILE } from '../core/level.js';

/** Regn: jevn, mørk sus og enkeltdråper som klikker. */
function rainBuffer(ctx) {
  const len = 6;
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const d = b.getChannelData(0);
  let lp = 0;
  let drop = 0;
  for (let i = 0; i < d.length; i++) {
    lp += 0.12 * (Math.random() * 2 - 1 - lp);
    if (Math.random() < 0.0016) drop = 0.6 + Math.random() * 0.6;
    drop *= 0.985;
    d[i] = lp * 0.6 + (Math.random() * 2 - 1) * drop * 0.35;
  }
  return b;
}

export class Ambient {
  constructor(engine, graph) {
    this.e = engine;
    this.g = graph;
    this.director = new AmbienceDirector();
    this.every = 0;
    this.music = null;
    this.rain = null;
  }

  get level() {
    return this.director.level;
  }

  /** En kjede kilde → lavpass → gain → panorering → trinnbussen (med romklang). */
  _chain(buffer, gain0 = 0) {
    const { ctx } = this.e;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const gain = ctx.createGain();
    gain.gain.value = gain0;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    lp.connect(gain).connect(pan).connect(this.g.stepBus);
    const src = this.e._loop(buffer, lp);
    this.g.nodes.push(lp, gain, pan, src);
    return { lp, gain, pan, src };
  }

  /** Musikken spiller fra en rute 8–22 m unna – helst en man ikke ser. */
  _musicSource(l) {
    const { level } = l;
    let best = null;
    for (let k = 0; k < 60; k++) {
      const x = Math.floor(Math.random() * level.w);
      const z = Math.floor(Math.random() * level.h);
      if (level.tiles[z * level.w + x] !== TILE.FLOOR) continue;
      const d = Math.hypot(x + 0.5 - l.x, z + 0.5 - l.z);
      if (d < 8 || d > 22) continue;
      best = [x + 0.5, z + 0.5];
      if (!lineOfSight(level, l.x, l.z, x + 0.5, z + 0.5)) break;
    }
    return best;
  }

  _event(name, l) {
    const { ctx } = this.e;
    if (name === 'vent:on' || name === 'vent:off') {
      this.e._oneShot(this.e.thump, 0.35, name === 'vent:on' ? 0.55 : 0.75); // klunk i ventilasjonsanlegget
    } else if (name === 'music:on' && l) {
      this.musicAt = this._musicSource(l);
      if (!this.musicAt) return;
      this.music ??= this._chain(eerieBuffer(ctx, 'muzak'));
      this.musicFade = 1;
    } else if (name === 'music:off') {
      this.musicFade = 0;
    } else if (name === 'rain:on') {
      this.rain ??= this._chain(rainBuffer(ctx));
      this.rainFade = 1;
    } else if (name === 'rain:off') {
      this.rainFade = 0;
    }
  }

  /** @param l lytteren: { level, x, z, y, yaw, windows } (eller null utenfor gåmodus) */
  update(dt, l) {
    for (const name of this.director.update(dt)) this._event(name, l);
    this.every -= dt;
    if (!l || this.every > 0) return;
    this.every = 0.25;
    const { ctx } = this.e;
    const now = ctx.currentTime;
    const level = this.director.level;
    const { sound, room, space } = this.g;
    space.set(reverbMix(measureRoom(l.level, l.x, l.z, l.y).size));
    room.gain.setTargetAtTime(this.director.vent.on ? sound.room * level : 0, now, 0.8);
    const toSide = (x, z) => {
      const d = Math.hypot(x - l.x, z - l.z) || 1;
      return ((x - l.x) * Math.cos(l.yaw) - (z - l.z) * Math.sin(l.yaw)) / d;
    };
    if (this.music && this.musicAt) {
      const [mx, mz] = this.musicAt;
      const d = Math.hypot(mx - l.x, mz - l.z);
      const seen = lineOfSight(l.level, l.x, l.z, mx, mz);
      this.music.lp.frequency.setTargetAtTime(seen ? 1800 : 380, now, 0.6);
      this.music.gain.gain.setTargetAtTime((this.musicFade * level * 0.35) / (1 + d * d * 0.008), now, 1.2);
      this.music.pan.pan?.setTargetAtTime(toSide(mx, mz) * 0.8, now, 0.4);
    }
    if (this.rain) {
      // Nærmeste vindu: der høres regnet tydelig; ellers er det et dempet sus mot taket.
      let dw = Infinity;
      for (const w of l.windows ?? []) dw = Math.min(dw, Math.hypot(w.x + 0.5 - l.x, w.z + 0.5 - l.z));
      const close = Number.isFinite(dw) ? 1 / (1 + dw * dw * 0.06) : 0;
      this.rain.lp.frequency.setTargetAtTime(700 + 3800 * close, now, 0.8);
      this.rain.gain.gain.setTargetAtTime(this.rainFade * level * (0.05 + 0.16 * close), now, 2);
    }
  }
}
