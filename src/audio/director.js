// Bakgrunnslydene over tid: ventilasjonen som slår seg av og på, dempet musikk fra et annet rom,
// regn mot taket og lange perioder med nesten total stillhet. Bare bestemmer *når* – lydene
// lages i ambient.js. Ren logikk.

const between = (rand, [a, b]) => a + rand() * (b - a);

const TIMES = {
  ventOn: [40, 120],
  ventOff: [25, 70],
  quietEvery: [150, 320], // til neste stille periode
  quietFor: [20, 40],
  musicEvery: [60, 180],
  musicFor: [35, 80],
  rainEvery: [120, 300],
  rainFor: [90, 240],
};

export class AmbienceDirector {
  /** @param rainy om regn er mulig her (f.eks. nivåer med vinduer eller tak mot himmelen) */
  constructor(rand = Math.random, { rainy = true, startRaining = false } = {}) {
    this.rand = rand;
    this.rainy = rainy;
    this.vent = { on: true, t: between(rand, TIMES.ventOn) };
    this.quiet = { on: false, t: between(rand, TIMES.quietEvery) };
    this.music = { on: false, t: between(rand, TIMES.musicEvery) };
    this.rain = { on: rainy && startRaining, t: between(rand, startRaining ? TIMES.rainFor : TIMES.rainEvery) };
  }

  _flip(name, onTimes, offTimes, allowed = true) {
    const s = this[name];
    s.t -= this._dt;
    if (s.t > 0) return null;
    s.on = allowed && !s.on;
    s.t = between(this.rand, s.on ? onTimes : offTimes);
    return `${name}:${s.on ? 'on' : 'off'}`;
  }

  /** @returns {string[]} hendelser denne rammen, f.eks. ['vent:off', 'quiet:on'] */
  update(dt) {
    this._dt = dt;
    const events = [
      this._flip('vent', TIMES.ventOn, TIMES.ventOff),
      this._flip('quiet', TIMES.quietFor, TIMES.quietEvery),
      // Musikk bare av og til (40 %), og aldri mens det er stille.
      this._flip('music', TIMES.musicFor, TIMES.musicEvery, !this.quiet.on && this.rand() < 0.4),
      this._flip('rain', TIMES.rainFor, TIMES.rainEvery, this.rainy),
    ].filter(Boolean);
    if (this.quiet.on && this.music.on) {
      this.music.on = false;
      events.push('music:off');
    }
    return events;
  }

  /** Hvor mye av bakgrunnslydene som høres nå (stillhet demper nesten alt). */
  get level() {
    return this.quiet.on ? 0.12 : 1;
  }
}
