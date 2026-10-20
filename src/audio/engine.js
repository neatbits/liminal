// Lydmotor for gåmodus: lysrørsurr som følger nærmeste lys, ventilasjon, fottrinn, sus og plask
// fra vannsklier, dører og skumle lyder i rykk og napp (eerie.js). Romklangen følger rommet man
// står i (space.js), og bakgrunnslydene – musikk, regn, stillhet – styres av ambient.js.
import { noiseBuffer, footstepBuffers, buzzBuffer, dripBuffer, thumpBuffer } from './synth.js';
import { createSpace } from './space.js';
import { Ambient } from './ambient.js';
import { eerieBuffer, playAround } from './eerie.js';
import { slideRush, splash, door, shutter, staticHiss, power, pickup } from './effects.js';

const HUM_SCALE = 0.35; // lysrørsurret samlet (temaenes hum ganges med dette)

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.graph = null;
    this.themeId = null;
    this.volume = 0.8;
    this.enabled = true;
    this.steps = {};
    this.eventIn = 20;
    this.burst = 0;
    this.humMood = 1;
    this.humTarget = 1;
    this.humIn = 0;
  }

  _ensure() {
    if (this.ctx) return true;
    const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Ctx) return false;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.white = noiseBuffer(this.ctx, 3, 'white');
    this.brown = noiseBuffer(this.ctx, 4, 'brown');
    this.buzz = buzzBuffer(this.ctx);
    this.drip = dripBuffer(this.ctx);
    this.thump = thumpBuffer(this.ctx);
    return true;
  }

  /** Starter (eller bytter til) lydbildet for et tema. Må kalles fra en brukerhandling første gang. */
  start(theme) {
    if (!this.enabled || !this._ensure()) return;
    this.ctx.resume();
    if (this.themeId !== theme.id) {
      this._teardown();
      this.graph = this._build(theme.sound);
      this.graph.ambient = new Ambient(this, this.graph);
      this.themeId = theme.id;
    }
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.6);
  }

  stop() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  setVolume(v) {
    this.volume = v;
    if (this.ctx && this.graph) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stop();
  }

  _loop(buffer, destination) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(destination);
    src.start();
    return src;
  }

  _build(sound) {
    const ctx = this.ctx;
    const nodes = [];
    const keep = (n) => (nodes.push(n), n);
    const dry = keep(ctx.createGain());
    dry.connect(this.master);
    const space = createSpace(ctx, sound, this.master, keep);
    const reverb = space.input;
    const send = (node, amount) => {
      const g = keep(ctx.createGain());
      g.gain.value = amount;
      node.connect(g).connect(reverb);
      node.connect(dry);
    };

    // Lysrørsurr: 100 Hz (50 Hz nett) med overtoner og en «summende» sagtann.
    const hum = keep(ctx.createGain());
    hum.gain.value = 0;
    send(hum, 0.3);
    const tone = (type, freq, gain, filter) => {
      const osc = keep(ctx.createOscillator());
      osc.type = type;
      osc.frequency.value = freq;
      const g = keep(ctx.createGain());
      g.gain.value = gain;
      if (filter) osc.connect(filter).connect(g);
      else osc.connect(g);
      g.connect(hum);
      osc.start();
    };
    tone('sine', 100, 1);
    tone('sine', 200, 0.35);
    tone('sine', 50, 0.15);
    const band = keep(ctx.createBiquadFilter());
    band.type = 'bandpass';
    band.frequency.value = 1800;
    band.Q.value = 6;
    tone('sawtooth', 100, sound.buzz * 2, band);

    // Romtone (ventilasjon).
    const roomLp = keep(ctx.createBiquadFilter());
    roomLp.type = 'lowpass';
    roomLp.frequency.value = 320;
    const room = keep(ctx.createGain());
    room.gain.value = sound.room;
    roomLp.connect(room);
    send(room, 0.4);
    keep(this._loop(this.brown, roomLp));

    const stepBus = keep(ctx.createGain());
    stepBus.gain.value = 0.45;
    send(stepBus, 0.5 + sound.reverb);
    for (const s of ['carpet', 'tile', 'concrete', 'water', 'foam', 'balls']) this.steps[s] ??= footstepBuffers(ctx, s);
    return { nodes, hum, room, stepBus, sound, space };
  }

  _teardown() {
    if (!this.graph) return;
    for (const n of this.graph.nodes) {
      try {
        n.stop?.();
      } catch {
        /* allerede stoppet */
      }
      n.disconnect();
    }
    this.graph = null;
    this.themeId = null;
  }

  _oneShot(buffer, gain, rate = 1) {
    if (!this.graph || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.graph.stepBus);
    src.start();
  }

  /** Ett fottrinn; volume ganges med (svakere ekko-trinn). */
  step(surface, volume = 1) {
    const list = this.steps[surface] ?? this.steps.carpet;
    // Trinnene skal ligge lavt i lydbildet; fliser i store, ekkoaktige rom (Poolrooms) enda lavere,
    // og teppe lavest – det demper.
    const gain = (surface === 'tile' ? 0.26 : surface === 'carpet' ? 0.17 : 0.34) + Math.random() * (surface === 'carpet' ? 0.07 : 0.14);
    if (list) this._oneShot(list[Math.floor(Math.random() * list.length)], gain * volume, 0.9 + Math.random() * 0.2);
  }

  flickerBuzz(distance) {
    this._oneShot(this.buzz, Math.max(0, 0.6 - distance * 0.08), 0.95 + Math.random() * 0.1);
  }

  // Lydeffekter (effects.js): sklie, plask, dør, kamera, kassett, strømbrudd (down = true) og TV-sus.
  slide(speed) {
    slideRush(this, speed);
  }

  splash(speed) {
    splash(this, speed);
  }

  door(opening) {
    door(this, opening);
  }

  shutter() {
    shutter(this);
  }

  pickup() {
    pickup(this);
  }

  power(down) {
    power(this, down);
  }

  static(level) {
    staticHiss(this, level);
  }

  /** Hvor lytteren står (gåmodus): { level, x, z, y, yaw, windows } – for romklang og bakgrunnslyder. */
  listen(listener) {
    this.listener = listener;
  }

  /** @param humLevel 0..1 – hvor nær og mange lys som surrer */
  update(dt, humLevel) {
    if (!this.graph) return;
    const { sound, hum, ambient } = this.graph;
    ambient.update(dt, this.listener);
    const quiet = ambient.level; // < 1 i de stille periodene
    // Surret er dempet, nesten borte langt fra lysene, og glir sakte opp og ned (bølger) så
    // det ikke ligger helt jevnt hele tiden.
    this.humIn -= dt;
    if (this.humIn <= 0) {
      this.humIn = 6 + Math.random() * 14;
      this.humTarget = 0.35 + Math.random() * 0.65;
    }
    this.humMood += (this.humTarget - this.humMood) * Math.min(1, dt * 0.4);
    const level = sound.hum * HUM_SCALE * (0.05 + 0.95 * humLevel) * this.humMood * quiet;
    hum.gain.setTargetAtTime(level, this.ctx.currentTime, 0.4);
    this.eventIn -= dt;
    if (this.eventIn > 0 || quiet < 1) return; // stille periode: ingen små lyder heller
    // Små lyder (drypp/dunk) ofte, skumle lyder av og til – av og til to-tre tett på hverandre.
    if (this.burst > 0 || Math.random() < 0.45) {
      const name = sound.eerie[Math.floor(Math.random() * sound.eerie.length)];
      playAround(this.ctx, eerieBuffer(this.ctx, name), this.graph.stepBus, sound.eerieGain ?? 0.5);
      if (this.burst > 0) this.burst--;
      else if (Math.random() < 0.3) this.burst = 1 + Math.floor(Math.random() * 2);
    } else if (sound.drips) {
      this._oneShot(this.drip, 0.5, 0.8 + Math.random() * 0.5);
    } else {
      this._oneShot(this.thump, 0.25, 0.7 + Math.random() * 0.3);
    }
    // eerieScale < 1 i Scary mode: de skumle lydene kommer oftere.
    this.eventIn = (this.burst > 0 ? 2.5 + Math.random() * 5 : 12 + Math.random() * 40) * (this.eerieScale ?? 1);
  }
}
