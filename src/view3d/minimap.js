// Kartet nede til høyre i Noclip: det man har sett (world/discover.js) i områdene rundt seg, med nord opp og en pil der
// man står og ser. Områdene henger sammen over skjøtene (view3d/zones.js), så kartet gjør det også. M (eller et trykk
// på kartet på berøringsskjerm) gjør det stort midt på skjermen, så man ser mye lenger.
import { reveal, seenWall } from '../world/discover.js';
import { cellHeights } from '../world/lighting.js';

const SIZES = { small: [168, 4], big: [560, 6] }; // px, px per meter (stort: ca. 90 m på tvers)
const EVERY = 0.2; // s mellom hver gang man ser seg rundt
const REDRAW = 1 / 15; // s mellom hver tegning (det store kartet har mange ruter)
const FLOOR = 'rgba(236, 226, 186, 0.78)';
const WALL = 'rgba(150, 132, 88, 0.95)'; // lysere enn bakgrunnen, mørkere enn gulvet

export class Minimap {
  constructor(viewer) {
    this.v = viewer;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hud-minimap';
    this.canvas.hidden = true;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.addEventListener('click', () => this.toggle()); // berøring (pekeren er låst på PC)
    viewer.hud.root.append(this.canvas);
    this.wait = 0;
    this.setBig(false);
  }

  show(on) {
    this.canvas.hidden = !on;
    if (!on) this.setBig(false);
  }

  setBig(on) {
    this.big = on;
    this.canvas.classList.toggle('big', on);
    this.canvas.width = this.canvas.height = SIZES[on ? 'big' : 'small'][0] * Math.min(2, window.devicePixelRatio || 1);
  }

  /** Stort eller lite. Returnerer false når kartet ikke vises (da betyr M lyden, som ellers). */
  toggle() {
    if (this.canvas.hidden) return false;
    this.setBig(!this.big);
    this.redraw = 0; // tegnes med en gang i den nye størrelsen
    return true;
  }

  /** Hver ramme mens man er inne: ser seg rundt (av og til) og tegner. */
  update(dt, zones) {
    const zone = zones.zone;
    if (!zone) return this.show(false);
    this.show(true);
    const w = this.v.walk.walker;
    zone.seen ??= new Uint8Array(zone.level.w * zone.level.h);
    zone.heights ??= cellHeights(zone.level);
    if ((this.wait -= dt) <= 0) {
      this.wait = EVERY;
      reveal(zone.level, zone.seen, w.x, w.z, zone.heights);
    }
    if ((this.redraw = (this.redraw ?? 0) - dt) > 0) return;
    this.redraw = REDRAW;
    this.draw(zones, w);
  }

  draw(zones, w) {
    const [SIZE, SCALE] = SIZES[this.big ? 'big' : 'small'];
    const g = this.canvas.getContext('2d');
    const k = this.canvas.width / SIZE;
    const half = SIZE / 2;
    const reach = half / SCALE + 1;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, SIZE, SIZE);
    for (const zone of zones.list) {
      if (!zone?.seen || !zone.offset) continue;
      const { level, seen } = zone;
      const [ox, oz] = zone.offset;
      const x0 = Math.max(0, Math.floor(w.x - ox - reach)), x1 = Math.min(level.w - 1, Math.ceil(w.x - ox + reach));
      const z0 = Math.max(0, Math.floor(w.z - oz - reach)), z1 = Math.min(level.h - 1, Math.ceil(w.z - oz + reach));
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const open = seen[z * level.w + x];
          if (!open && !seenWall(level, seen, x, z)) continue;
          g.fillStyle = open ? FLOOR : WALL;
          g.fillRect(half + (ox + x - w.x) * SCALE, half + (oz + z - w.z) * SCALE, SCALE + 0.5, SCALE + 0.5);
        }
      }
    }
    // Pilen: blikket er (−sin yaw, −cos yaw) i x/z.
    g.translate(half, half);
    g.rotate(-w.yaw);
    g.fillStyle = '#c0392b';
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 5);
    g.lineTo(0, 2.5);
    g.lineTo(-5, 5);
    g.closePath();
    g.fill();
  }
}
