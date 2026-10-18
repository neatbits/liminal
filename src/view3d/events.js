// Hendelser i gåmodus: strømbrudd. Med ujevne mellomrom flimrer alle lysene voldsomt, går ut
// i noen sekunder (bare TV-er lyser) og kommer tilbake. Ren logikk – gir strømmen 0..1 og
// hendelsesnavn som lyd og HUD reagerer på.

const between = (rand, [a, b]) => a + rand() * (b - a);

export const DARK = 0.05; // hvor mye lys som er igjen når strømmen er borte

export class Blackout {
  /**
   * @param timing first: sekunder til første strømbrudd, every: mellom strømbruddene,
   *               dark: hvor lenge det er mørkt
   */
  constructor(rand = Math.random, { first = [70, 140], every = [120, 260], dark = [6, 11] } = {}) {
    this.rand = rand;
    this.every = every;
    this.dark = dark;
    this.phase = 'idle';
    this.t = between(rand, first);
    this.hold = 0;
    this.power = 1;
  }

  /** Starter et strømbrudd nå (f.eks. når man kommer inn på et nytt nivå). */
  trigger(delay = 0) {
    this.phase = 'idle';
    this.t = delay;
  }

  /**
   * @returns {'flicker' | 'down' | 'up' | 'done' | null} hendelsen som skjedde denne rammen
   */
  update(dt) {
    const r = this.rand;
    this.t -= dt;
    if (this.phase === 'idle') {
      this.power = 1;
      if (this.t > 0) return null;
      this.phase = 'flicker';
      this.t = 1.6;
      return 'flicker';
    }
    if (this.phase === 'flicker' || this.phase === 'return') {
      this.hold -= dt;
      if (this.hold <= 0) {
        this.hold = 0.04 + r() * 0.1;
        // Flimmer: ofte nesten av, av og til fullt på; på vei tilbake blir det stadig mer lys.
        const rising = this.phase === 'return' ? 1 - Math.max(0, this.t) / 1.2 : 0;
        this.power = r() < 0.5 - rising * 0.35 ? DARK + r() * 0.25 : 1;
      }
      if (this.t > 0) return null;
      if (this.phase === 'return') {
        this.phase = 'idle';
        this.power = 1;
        this.t = between(r, this.every);
        return 'done';
      }
      this.phase = 'dark';
      this.power = DARK;
      this.t = between(r, this.dark);
      return 'down';
    }
    // Mørkt.
    this.power = DARK;
    if (this.t > 0) return null;
    this.phase = 'return';
    this.t = 1.2;
    return 'up';
  }
}
