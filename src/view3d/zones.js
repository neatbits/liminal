// Områdene i Noclip (gen/zones.js): én sammenhengende verden. Området man går i, og naboene før og etter, er bygget og
// står ved siden av hverandre; hvert er klippet til sin side av skjøtene (world/clip.js). Krysser man skjøten midt i
// en gang, blir naboen verdenen man går i (storeys.adopt) og alt flyttes, så den står i origo – uten at noe synes.
// Neste område lages i bakgrunnen (view3d/zone-worker.js; går ikke det, her) og bygges i 3D når det er klart: en kort
// pause mens man går, men aldri en svart skjerm. Man kan gå tilbake.
import * as THREE from 'three';
import { buildWorld } from '../world/build.js';
import { clipWorld } from '../world/clip.js';
import { warmTextures } from '../world/texture-warm.js';
import { showZone } from './zone-show.js';
import { SEAM, makeZone, zoneOffset, seamWest, seamEast } from '../gen/zones.js';
import { markWall, noclipMood } from '../gen/noclip.js';
import { getLevelSize } from '../gen/sizes.js';
import { activeTint, tintFactor } from '../core/tints.js';
import { quietMood } from './mood.js';
import { getTheme } from '../core/themes.js';

const KEEP = 1; // så mange områder før og etter som holdes bygget
const LATER = 400; // ms etter et bytte før neste område lages (man er i gangen)
const FAR = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e6); // klipper ingenting

export class Zones {
  constructor(viewer) {
    this.v = viewer;
    this.list = []; // { level, entry, exit, world, offset: [x, z], planes }
    this.c = 0; // området man er i
    this.shifted = 0; // m vestover alt er flyttet (avstanden fra der man kom inn)
    this.active = false;
    this.pending = new Set(); // områder som lages i bakgrunnen
    this.meshing = new Set(); // områder der bare flatene lages i bakgrunnen (de var kastet)
    this.worker = undefined; // lages første gang; null når den ikke virker
  }

  get zone() {
    return this.list[this.c];
  }

  /** Avstanden innover fra veggen i butikken, i meter. */
  get distance() {
    return Math.max(0, this.shifted + this.v.walk.walker.x - (this.list[0]?.start ?? 0));
  }

  /** Fra butikken: det første området (Level 0) med en firkant tilbake. Kalles mens skjermen er svart. */
  begin(explorer) {
    const v = this.v;
    this.clear();
    v.renderer.localClippingEnabled = true;
    this.seed = Math.floor(Math.random() * 1e9);
    this.active = true;
    const first = this._make(0);
    markWall(first.level);
    first.start = first.level.spawn.x;
    quietMood(v, noclipMood(1));
    explorer.depth = 1;
    v.walk.noLoops = true;
    explorer.arrive(first.level);
    first.world = v.world;
    first.world.zone = true;
    first.offset = [0, 0];
    this._clip(first);
    this._later();
  }

  _request(i) {
    return { index: i, seed: this.seed, prevTheme: this.list[i - 1]?.level.theme ?? null, mood: noclipMood(i + 1), scale: getLevelSize(this.v.settings.levelSize).scale };
  }

  _store(i, made) {
    const zone = { ...made, world: null, offset: null, planes: [FAR.clone(), FAR.clone()] };
    this.list[i] = zone;
    return zone;
  }

  /** Her og nå (det første området, eller når man kom fram før bakgrunnen var ferdig). */
  _make(i) {
    this.pending.delete(i);
    return this._store(i, makeZone(this._request(i)));
  }

  /** I bakgrunnen; bygges i 3D når det kommer tilbake (om man fortsatt er i nærheten). */
  _ask(i) {
    if (i < 0 || this.list[i] || this.pending.has(i) || (i > 0 && !this.list[i - 1])) return;
    if (this.worker === undefined) {
      try {
        this.worker = new Worker(new URL('./zone-worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }) => this._arrived(data);
        this.worker.onerror = () => (this.worker = null);
      } catch {
        this.worker = null;
      }
    }
    if (!this.worker) return void this._make(i);
    this.pending.add(i);
    this.worker.postMessage({ id: `${this.seed}:${i}`, ...this._request(i) });
  }

  _arrived({ id, zone, prebuilt, error }) {
    const [seed, index, kind] = id.split(':');
    const i = Number(index);
    if (!this.active || Number(seed) !== this.seed) return;
    if (kind === 'm') { // bare flatene til et område man går tilbake til
      if (!this.meshing.delete(i) || !this.list[i]) return;
      this.list[i].prebuilt = prebuilt ?? null;
      if (Math.abs(i - this.c) <= KEEP) this._build(i, false, true);
      return;
    }
    if (!this.pending.has(i)) return;
    this.pending.delete(i);
    if (error || !zone) return void this._make(i);
    this._store(i, zone).prebuilt = prebuilt ?? null;
    if (Math.abs(i - this.c) <= KEEP) this._build(i, false, true);
    setTimeout(() => this.active && this.v.audio.prepare(getTheme(zone.level.theme)), 300); // romklangen før man kommer dit
    this._ask(i + 1 <= this.c + KEEP ? i + 1 : -1);
  }

  /** Flatene til et område som er laget før (og kastet): lages i bakgrunnen igjen. */
  _askMeshes(i) {
    if (this.meshing.has(i)) return;
    this.meshing.add(i);
    this.worker.postMessage({ id: `${this.seed}:${i}:m`, level: this.list[i].level });
  }

  /**
   * Bygger område i ved siden av naboen som allerede står. Flatene med bakt lys kommer ferdige fra bakgrunnen (prebuilt);
   * her settes bare 3D-en sammen. now: man er allerede ved skjøten – lag det som mangler her og nå. ready: svaret fra
   * bakgrunnen er her (da bygges det selv uten flatene, om de ikke kunne lages der).
   */
  _build(i, now = false, ready = false) {
    if (i < 0 || this.list[i]?.world) return;
    if (!this.list[i] && !now) return void this._ask(i);
    const zone = this.list[i] ?? this._make(i);
    if (!zone.prebuilt && !now && !ready && this.worker) return void this._askMeshes(i);
    if (now) return void this._assemble(zone, i, true);
    if (zone.warming) return;
    // Teksturene til et nytt tema males og lastes opp i små biter først (world/texture-warm.js), så settes 3D-en sammen.
    zone.warming = true;
    const seed = this.seed;
    warmTextures(zone.level, this.v.renderer, this.v.anisotropy).then(() => {
      zone.warming = false;
      if (this.active && this.seed === seed && this.list[i] === zone && !zone.world && Math.abs(i - this.c) <= KEEP) this._assemble(zone, i, false);
    });
  }

  _assemble(zone, i, now) {
    const v = this.v;
    const next = this.list[i + 1];
    const prev = this.list[i - 1];
    if (prev?.offset) zone.offset = add(prev.offset, zoneOffset(prev, zone));
    else if (next?.offset) zone.offset = sub(next.offset, zoneOffset(zone, next));
    else return;
    const world = buildWorld(zone.level, { anisotropy: v.anisotropy, waterQuality: false, waterDetail: v.settings.waterDetail, waterWaves: v.settings.waterWaves, prebuilt: zone.prebuilt });
    zone.prebuilt = null; // geometrien eier arrayene nå; kastes området, lages flatene på nytt i bakgrunnen
    world.zone = true;
    world.setBoost(1);
    world.setPower(v.walk.power ?? 1);
    world.group.position.set(zone.offset[0], 0, zone.offset[1]);
    zone.world = world;
    this._clip(zone);
    showZone(v, zone, now); // inn i scenen uten hakk (view3d/zone-show.js)
  }

  /** Planene i verdens koordinater: området tegnes mellom skjøten inn og skjøten ut. */
  _clip(zone) {
    const [ox] = zone.offset;
    const [west, east] = zone.planes;
    if (zone.entry !== null) west.set(new THREE.Vector3(1, 0, 0), -(ox + seamWest()));
    east.set(new THREE.Vector3(-1, 0, 0), ox + seamEast(zone.level));
    if (!zone.clipped) clipWorld(zone.world, zone.planes);
    zone.clipped = true;
  }

  _later() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.active && this._settle(), LATER);
  }

  /** Naboene bygges, og det som er lenger unna, kastes (nivået huskes, så det kan bygges igjen). */
  _settle() {
    for (let i = this.c - KEEP; i <= this.c + KEEP; i++) this._build(i);
    this.list.forEach((zone, i) => {
      if (zone.world && Math.abs(i - this.c) > KEEP) this._drop(zone);
    });
  }

  _drop(zone) {
    if (!zone.world) return;
    this.v.scene.remove(zone.world.group);
    zone.world.dispose();
    zone.world = null;
    zone.clipped = false;
  }

  /** Hver ramme: naboene får lys og strøm, og krysser man en skjøt, bytter man område. */
  update(dt, depthChanged) {
    if (!this.active) return;
    const v = this.v;
    this.list.forEach((zone, i) => {
      if (!zone.world || i === this.c) return;
      zone.world.setPower(v.walk.power ?? 1);
      zone.world.setTint(tintFactor(activeTint(v.settings.light, zone.level), v.time, zone.world.field.color));
      zone.world.update(v.time, v.flicker.values, v.camera);
    });
    const { x } = v.walk.walker;
    const zone = this.zone;
    if (x > seamEast(zone.level)) this._cross(1, depthChanged);
    else if (zone.entry !== null && x < seamWest()) this._cross(-1, depthChanged);
  }

  _cross(d, depthChanged) {
    const v = this.v;
    const i = this.c + d;
    if (!this.list[i]?.world) this._build(i, true); // kom fram før den var klar: lag og bygg nå
    const to = this.list[i];
    if (!to?.world) return;
    if (!to.world.group.parent) v.scene.add(to.world.group); // skyggeleggerne var ikke ferdig kompilert (_show)
    to.reveal?.(); // resten av området, om det fortsatt legges inn litt om gangen (view3d/zone-show.js)
    const [dx, dz] = to.offset;
    for (const zone of this.list) {
      if (!zone?.offset) continue; // også de som ikke er bygget: kartet tegner dem der de ligger
      zone.offset = sub(zone.offset, [dx, dz]);
      if (!zone.world) continue;
      zone.world.group.position.set(zone.offset[0], 0, zone.offset[1]);
      this._clip(zone);
    }
    const w = v.walk.walker;
    w.x -= dx;
    w.z -= dz;
    this.shifted += dx;
    this.c = i;
    quietMood(v, noclipMood(i + 1));
    v.storeys.adopt(to.level, to.world);
    depthChanged(i + 1);
    this._later();
  }

  /** Alle områdene kastes (ut av modusen, eller tilbake til butikken). */
  clear() {
    clearTimeout(this._timer);
    this.pending.clear();
    this.meshing.clear();
    this.seed = -1; // svar fra bakgrunnen som kommer etterpå, gjelder ikke lenger
    for (const zone of this.list) this._drop(zone);
    this.list = [];
    this.c = 0;
    this.shifted = 0;
    this.active = false;
    this.v.walk.noLoops = false;
  }
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export { SEAM };
