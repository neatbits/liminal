// Hvor monsteret tror du er. Uten chase.sense vet det det alltid. Med sense går det etter sporet: det ser deg
// innenfor chase.sight med fri sikt, ellers får det vite hvor du er bare hvert sense sekund. Så kan man riste
// det av seg rundt et hjørne, men ikke gjemme seg for godt. Ren logikk.
import { lineOfSight } from './lighting.js';

export class Trail {
  constructor() {
    this.at = null; // { x, z }: der det leter nå
    this.age = 0; // s siden det sist visste hvor du var
  }

  clear() {
    this.at = null;
  }

  /** @param from monsteret { x, z } @param chase stemningens jakt (gen/moods.js) @returns { x, z } */
  follow(dt, level, from, player, { sense, sight = Infinity }) {
    this.age += dt;
    const seen = () => Math.hypot(from.x - player.x, from.z - player.z) < sight && lineOfSight(level, from.x, from.z, player.x, player.z);
    if (!sense || !this.at || this.age >= sense || seen()) {
      this.at = { x: player.x, z: player.z };
      this.age = 0;
    }
    return this.at;
  }
}
