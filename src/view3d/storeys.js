// Etasjene i 3D (core/storeys.js, core/stairwells.js): én verden per etasje, løftet til etasjehøyden.
// Etasje 0 er viewer.world i oversikten. I oversikten vises etasjene opp til den som tegnes; i
// gåmodus etasjen man står i og naboene, og man bytter etasje midt på reposet i et trapperom: da
// blir den etasjens verden viewer.world og rommet walk.level, i samme punkt og høyde. Bare
// etasjen man står i har speiling og brytning i vannet.
import { buildWorld } from '../world/build.js';
import { storeyCount, storeyElevations, spawnStorey } from '../core/storeys.js';
import { walkLevels, storeyAt } from '../core/stairwells.js';
import { slidePath } from '../core/slides.js';

const OVERVIEW_BOOST = 1.15; // som etasje 0 i oversikten (view3d/look.js)

export class Storeys {
  constructor(viewer) {
    this.v = viewer;
    this.all = []; // verdenene, [0] = etasje 0
    this.levels = []; // etasjene slik de bygges og gås i (walkLevels)
    this.wells = [];
    this.at = [0]; // gulvhøyden i hver etasje
    this.shown = 0; // høyeste etasje som vises i oversikten
    this.current = 0; // etasjen man går i
    this.walking = false;
    this.spawn = 0; // etasjen man starter i (room.spawnStorey)
    viewer.walk.beforeEnter = () => this.enter(this.spawn); // gåing (og «våkn opp») starter der
    viewer.walk.dropAt = (w) => this.dropAt(w); // sklier ned til etasjen under (core/slide-drops.js)
  }

  get worlds() {
    return this.all.slice(1);
  }

  /** Bygger alle etasjene. Returnerer { world (etasje 0), level (etasje 0 til gåing), stats }. */
  build(room, options) {
    this.dispose();
    const multi = storeyCount(room) > 1;
    ({ levels: this.levels, wells: this.wells } = multi ? walkLevels(room) : { levels: [room], wells: [] });
    this.at = multi ? storeyElevations(room) : [0];
    this.spawn = spawnStorey(room);
    const stats = { vertices: 0, lights: 0, ms: 0 };
    this.levels.forEach((level, k) => {
      const world = buildWorld(level, k ? { ...options, waterQuality: false } : options);
      world.group.position.y = this.at[k];
      if (k) {
        // Massiv vegg er ingenting i en øvre etasje: toppen ville ligget som en plate over etasjen under.
        const mass = world.group.getObjectByName('mass');
        if (mass) mass.visible = false;
      }
      this.v.scene.add(world.group);
      this.all.push(world);
      for (const key of Object.keys(stats)) stats[key] += world.stats[key];
    });
    this._apply();
    return { world: this.all[0], level: this.levels[0], stats };
  }

  /**
   * Etter ombygging: står man i en øvre etasje, går man rett inn i den nye verdenen for den (uten å
   * regne om høyden). Returnerer false når gåingen skal fortsette i etasje 0 (viewer gjør det).
   */
  rebuilt() {
    const k = this.walking ? this.current : 0;
    this.current = 0;
    if (!k || k >= this.all.length) {
      this.v.walk.base = 0;
      return false;
    }
    this._switch(k);
    return true;
  }

  /** Viser etasjene opp til k i oversikten. */
  show(k) {
    this.shown = k;
    this._apply();
  }

  floorY() {
    return this.at[Math.min(this.shown, this.at.length - 1)];
  }

  /** Ut av gåmodus (viewer.exitWalk): tilbake til etasje 0, som er oversiktens verden. */
  leave() {
    if (this.current) this._switch(0, false);
  }

  /** Kalles først i applyLook. */
  setWalking(on) {
    this.walking = on;
    for (const world of this.worlds) world.setBoost(on ? 1 : OVERVIEW_BOOST);
    this._apply();
  }

  /** Der man kommer inn i etasje k: reposet fra trappen nedenfra, ellers foten av trappen opp (eller null). */
  entry(k) {
    const well = this.wells.find((x) => x.k + 1 === k) ?? this.wells.find((x) => x.k === k);
    if (!well) return null;
    const { w } = this.levels[0];
    const i = well.k + 1 === k ? well.landing : well.run[0];
    return { x: (i % w) + 0.5, z: Math.floor(i / w) + 0.5 };
  }

  /**
   * Står man på toppen av en sklie ned til etasjen under, går man inn i den etasjen og får banen
   * (i dens koordinater) – ellers null.
   */
  dropAt(w) {
    const k = this.current - 1;
    if (k < 0) return null;
    const [cx, cz] = [Math.floor(w.x), Math.floor(w.z)];
    const slide = this.levels[k].slides.find(({ drop, points: [[x, z]] }) => drop && x === cx && z === cz);
    if (!slide || Math.hypot(w.x - cx - 0.5, w.z - cz - 0.5) > 0.55) return null;
    const path = slidePath(this.levels[k], slide); // før byttet: virker ikke banen, blir man stående
    if (path.problem) return null;
    this.enter(k);
    return path;
  }

  /** Hver ramme i gåmodus: bytt etasje om man har krysset midten av et repos. */
  follow() {
    if (!this.wells.length || this.v.walk.rider.active) return;
    const w = this.v.walk.walker;
    const k = storeyAt(this.wells, this.current, w.x, w.z, this.levels[0].w);
    if (k !== this.current) this.enter(k);
  }

  /** Går inn i etasje k: samme punkt, høyden regnet om til etasjens egne koordinater. */
  enter(k) {
    if (!this.all[k] || k === this.current) return;
    this.v.walk.walker.floorY += this.at[this.current] - this.at[k];
    this._switch(k);
  }

  _switch(k, look = true) {
    const v = this.v;
    const from = this.all[this.current];
    const to = this.all[k];
    this.current = k;
    v.walk.base = this.at[k];
    from.water?.setQuality(false);
    from.floorReflection?.setEnabled(false);
    to.water?.setQuality(v.settings.waterReflections);
    to.water?.setSize(v._rtW, v._rtH);
    to.floorReflection?.setSize(v._rtW, v._rtH);
    v.world = to;
    v.walk.setWorld(this.levels[k], to.theme, to.field, to.doors, to);
    v.explorer?.shifts.reset(); // dørene og lysene man har gått forbi var i en annen etasje
    this._apply();
    if (look) v._applyLook();
  }

  update(time, flicker, camera, tint) {
    for (const world of this.all) {
      if (world === this.v.world || !world.group.visible) continue;
      world.setTint(tint);
      world.update(time, flicker, camera);
    }
  }

  /** Strømmen (strømbrudd) gjelder hele bygget. */
  setPower(p) {
    for (const world of this.all) world.setPower(p);
  }

  _apply() {
    this.all.forEach((world, k) => (world.group.visible = this.walking ? Math.abs(k - this.current) <= 1 : k <= this.shown));
  }

  dispose() {
    for (const world of this.all) {
      this.v.scene.remove(world.group);
      world.dispose();
    }
    this.all = [];
  }
}
