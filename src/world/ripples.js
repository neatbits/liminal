// Ringer i vannet: små ringer der spilleren vasser eller svømmer (oftere og større i fart), og store,
// doble ringer fra plask. Hver ring er { x, z, t0, s }; vannshaderen (world/water/shader.js) tegner en
// bølgefront som brer seg utover med RIPPLE_SPEED og dør ut etter RIPPLE_LIFE. Ren logikk.

export const RIPPLES = 12; // så mange ringer samtidig (uniform-tabellen i shaderen)
export const RIPPLE_SPEED = 0.9; // m/s
export const RIPPLE_LIFE = 3.5; // s

export class Ripples {
  constructor() {
    this.points = [];
    this.time = 0;
    this._next = 0;
  }

  step(dt) {
    this.time += dt;
    this.points = this.points.filter((p) => this.time - p.t0 < RIPPLE_LIFE);
  }

  /** En ring i (x, z) med styrken s (1 = et skritt i vannet); age > 0 gir en ring som startet før. */
  emit(x, z, s = 1, age = 0) {
    this.points.push({ x, z, t0: this.time - age, s });
    while (this.points.length > RIPPLES) this.points.shift();
  }

  /** Et plask: en kraftig ring og en svakere foran den. */
  splash(x, z, strength = 1.5) {
    const s = Math.min(2.5, Math.max(0.15, 0.25 + strength / 2));
    this.emit(x, z, s * 0.6, 0.35);
    this.emit(x, z, s);
  }

  /** Noen i vannet i (x, z) med farten speed: ringer jevnlig – oftere og større når man beveger seg. */
  wade(x, z, speed) {
    if (this.time < this._next) return;
    const moving = speed > 0.2;
    this.emit(x, z, moving ? Math.min(1, 0.35 + speed * 0.3) : 0.2);
    this._next = this.time + (moving ? 0.32 : 1.4);
  }

  /** Til shaderen: [x, z, alder, styrke] per ring (styrke 0 = ingen ring). */
  values(out = new Float32Array(RIPPLES * 4)) {
    out.fill(0);
    this.points.forEach((p, k) => out.set([p.x, p.z, this.time - p.t0, p.s], k * 4));
    return out;
  }
}
