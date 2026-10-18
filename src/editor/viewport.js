// Transformasjon mellom skjermpiksler (CSS-px) og ruter i skissen. Ren logikk.

export const MIN_SCALE = 3;
export const MAX_SCALE = 72;

export class Viewport {
  constructor() {
    this.scale = 16; // piksler per meter
    this.ox = 0;
    this.oy = 0;
  }

  toScreen(x, z) {
    return [this.ox + x * this.scale, this.oy + z * this.scale];
  }

  /** Skjermpunkt → kontinuerlig posisjon i meter. */
  toWorld(sx, sy) {
    return [(sx - this.ox) / this.scale, (sy - this.oy) / this.scale];
  }

  cellAt(sx, sy) {
    const [x, z] = this.toWorld(sx, sy);
    return [Math.floor(x), Math.floor(z)];
  }

  pan(dx, dy) {
    this.ox += dx;
    this.oy += dy;
  }

  /** Zoomer rundt et skjermpunkt slik at punktet ligger fast. */
  zoomAt(sx, sy, factor) {
    const [wx, wz] = this.toWorld(sx, sy);
    this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.scale * factor));
    this.ox = sx - wx * this.scale;
    this.oy = sy - wz * this.scale;
  }

  /** Tilpasser et w × h-rom i området fra (left, top) til (viewW, viewH). */
  fit(w, h, viewW, viewH, left = 0, top = 0, margin = 28) {
    const availW = Math.max(1, viewW - left - margin * 2);
    const availH = Math.max(1, viewH - top - margin * 2);
    this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(availW / w, availH / h)));
    this.ox = left + (viewW - left - w * this.scale) / 2;
    this.oy = top + (viewH - top - h * this.scale) / 2;
  }
}
