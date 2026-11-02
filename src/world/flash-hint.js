// Hintet om lommelykten: står man en stund i mørket med lykten av, minner spillet om den – høyst noen ganger, med god
// avstand, og aldri igjen etter at man har brukt den. Ren logikk; view3d/fog-light.js gir lyset og viser teksten.
export const FLASH_HINT = {
  AFTER: 2.5, // s i mørket før hintet
  AGAIN: 75, // s før det kan komme igjen
  TIMES: 3, // høyst så mange ganger
  DARK: 0.35, // lyset rundt deg (0–1, som tåken) under dette er mørkt
};

export class FlashHint {
  constructor() {
    this.dark = 0; // s i mørket nå
    this.wait = 0; // s til neste hint kan komme
    this.shown = 0;
    this.used = false; // har brukt lykten: da kan man den
  }

  /**
   * @param o { light: 0–1 rundt deg, on: lykten er på, empty: batteriet er tomt (The Descent) }
   * @returns {boolean} true: vis hintet nå
   */
  update(dt, { light, on, empty = false }) {
    if (on) this.used = true;
    this.wait = Math.max(0, this.wait - dt);
    this.dark = light < FLASH_HINT.DARK && !on && !empty ? this.dark + dt : 0;
    if (this.used || this.shown >= FLASH_HINT.TIMES || this.wait > 0 || this.dark < FLASH_HINT.AFTER) return false;
    this.shown++;
    this.wait = FLASH_HINT.AGAIN;
    this.dark = 0;
    return true;
  }
}
