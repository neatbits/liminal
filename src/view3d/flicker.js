// Styrer de fire blinkegruppene. Verdien per gruppe er 0..1 (1 = fullt lys).
// Ren logikk: tar inn dt og en rand-funksjon, ingen three.js.
import { FLICKER_GROUPS } from '../world/lighting.js';

export class FlickerController {
  constructor(rand = Math.random) {
    this.rand = rand;
    this.values = new Array(FLICKER_GROUPS).fill(1);
    this.groups = Array.from({ length: FLICKER_GROUPS }, () => ({
      wait: 1 + rand() * 8, // tid til neste anfall
      burst: 0, // gjenværende tid i et anfall
      hold: 0, // tid til neste av/på-skifte i anfallet
      level: 1,
    }));
  }

  /**
   * @returns {number[]} indekser for grupper som skiftet kraftig denne rammen (for lyd)
   */
  update(dt) {
    const changed = [];
    const r = this.rand;
    this.groups.forEach((g, i) => {
      const before = g.level;
      if (g.burst > 0) {
        g.burst -= dt;
        g.hold -= dt;
        if (g.hold <= 0) {
          g.level = r() < 0.55 ? 1 : r() * 0.2;
          g.hold = 0.03 + r() * 0.12;
        }
        if (g.burst <= 0) {
          g.level = r() < 0.15 ? 0.04 : 1; // av og til blir lyset liggende av
          g.wait = 2 + r() * 12;
        }
      } else {
        g.wait -= dt;
        if (g.wait <= 0) {
          g.burst = 0.2 + r() * 1.4;
          g.hold = 0;
        }
      }
      if (Math.abs(g.level - before) > 0.5) changed.push(i);
      this.values[i] = g.level;
    });
    return changed;
  }
}
