// Kassettjakten (view3d/tape-hunt.js): kassettene summer svakt – båndsus og en lav, ustø brumtone
// som fra en VHS-spiller – sterkere jo nærmere den nærmeste kassetten er, og panorert mot den.
// Går gjennom fottrinnsbussen, så mute, pause og volum gjelder som for resten av lyden.

const decay = (t, k) => (t < 0 ? 0 : Math.exp(-t / k));

/** @param level 0 = stille, 1 = rett ved kassetten; pan −1 (venstre) … 1 (høyre) */
export function tapeHum(engine, level, pan = 0) {
  const { ctx, graph } = engine;
  if (!graph) return;
  let hum = graph.tapeHum;
  if (!hum && level < 0.01) return;
  if (!hum) {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400;
    band.Q.value = 0.8;
    const tone = ctx.createOscillator();
    tone.type = 'triangle';
    tone.frequency.value = 118;
    const toneGain = ctx.createGain();
    toneGain.gain.value = 0.5;
    // Båndet drar: en langsom vibrato i tonen og en flimrende styrke.
    const wow = ctx.createOscillator();
    wow.frequency.value = 0.7;
    const wowDepth = ctx.createGain();
    wowDepth.gain.value = 1.6;
    wow.connect(wowDepth).connect(tone.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const panner = ctx.createStereoPanner?.() ?? null;
    const out = panner ? (gain.connect(panner), panner) : gain;
    out.connect(graph.stepBus);
    band.connect(gain);
    tone.connect(toneGain).connect(gain);
    const src = engine._loop(engine.white, band);
    tone.start();
    wow.start();
    graph.nodes.push(band, tone, toneGain, wow, wowDepth, gain, src, ...(panner ? [panner] : []));
    hum = graph.tapeHum = { gain, panner };
  }
  const now = ctx.currentTime;
  hum.gain.gain.setTargetAtTime(level * 0.09, now, 0.3);
  hum.panner?.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)) * 0.8, now, 0.2);
}

/** Låst dør: håndtaket rister – to korte klikk i låsen og et dempet dunk. */
function lockedBuffer(ctx) {
  const rate = ctx.sampleRate;
  const b = ctx.createBuffer(1, Math.floor(rate * 0.35), rate);
  const d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    lp += 0.4 * (Math.random() * 2 - 1 - lp);
    let v = 0;
    for (const c of [0, 0.09, 0.2]) v += lp * decay(t - c, 0.008) * (t >= c ? 1 : 0);
    v += Math.sin(2 * Math.PI * 95 * (t - 0.2)) * decay(t - 0.2, 0.04) * (t >= 0.2 ? 0.8 : 0);
    d[i] = v * 0.6;
  }
  return b;
}

export function lockedDoor(engine) {
  if (!engine.ctx || !engine.graph) return;
  engine.lockedSound ??= lockedBuffer(engine.ctx);
  engine._oneShot(engine.lockedSound, 0.7, 0.95 + Math.random() * 0.1);
}
