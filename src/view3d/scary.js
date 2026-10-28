// Monsteret i de sterkeste stemningene (Uncanny, Nightmare): monsteret (world/monster-ai.js + view3d/monster.js) med hjertebank,
// pust og (Nightmare) et brøl når jakten begynner, og «noclip» til et nytt nivå når det tar deg. Styres av view3d/explore.js.
import { MonsterAI, heardFrom } from '../world/monster-ai.js';
import { Monster3D } from './monster.js';
import { getMood } from '../gen/moods.js';
import { heartbeat, breath, caught, roarAt, warmScary } from '../audio/scary.js';

const ROAR_AGAIN = 20; // s: tidligst neste brøl
const ROAR_FAR = 30; // m: så langt unna høres brølet svakest og mørkest
const FOLLOW = 2.5; // s: så lenge det tar før et jagende monster kommer etter opp/ned trappen

export class Scary {
  constructor(viewer) {
    this.v = viewer;
    this.monster = new Monster3D();
    viewer.scene.add(this.monster.group);
    this.ai = null;
    this.beatIn = 0;
    this.breathIn = 0;
    this.roarIn = null;
    this.roarAgain = 0;
  }

  /** Av: monsteret forsvinner. */
  hide() {
    if (this.ai) this.ai.state = 'hidden';
    this.monster.group.visible = false;
  }

  /**
   * Nytt nivå (eller nytt rom): monsteret begynner på nytt. prepare: under overgangen, så modellen
   * lastes og tegnes usynlig én gang mens skjermen er svart (Monster3D.warm), ikke midt i gåingen.
   */
  reset(prepare = false) {
    this.ai = null;
    this.follow = null;
    this.roarIn = null;
    this.roarAgain = 0;
    this.hide();
    if (!prepare || !getMood(this.v.settings.mood).monster) return;
    const v = this.v;
    this.monster.load().then((ok) => ok && !this.ai?.visible && this.monster.warm(v.renderer, v.camera, v.scene));
  }

  /**
   * @param dark lyset er borte (strømbrudd, eller mørke i Nightmare) · gentle: «no jumpscares» (det
   *        tar deg aldri) · onCaught() kalles når monsteret tar deg · chase: stemningens jakt (moods.js)
   */
  update(dt, power, dark, gentle, onCaught, chase = {}) {
    this.monster.load(); // Prefetch while hidden; first appearance needs no download pause.
    const v = this.v;
    const w = v.walk.walker;
    if (!this.ai || this.ai.level !== v.walk.level) this._newFloor(w);
    if (this.follow && (this.follow.t -= dt) <= 0) {
      // Det kommer etter: dukker opp på reposet der man gikk inn, og jakter videre.
      this.ai._place([Math.floor(this.follow.x), Math.floor(this.follow.z)]);
      this.ai.state = 'hunt';
      this.follow = null;
    }
    this.ai.gentle = gentle;
    this.ai.chase = chase;
    const player = { x: w.x, z: w.z, y: w.floorY, yaw: w.yaw };
    const event = this.ai.update(dt, player, dark);
    this.monster.base = v.walk.base;
    this.monster.update(dt, this.ai, player, power);
    // Alt det første gangen koster, gjøres på forhånd: tegningen (GPU) og lydene (i små biter).
    if (!this.ai.visible) this.monster.warm(v.renderer, v.camera, v.scene);
    const sound = v.walk.sound;
    if (sound) warmScary(v.audio, !!chase.roar);
    if (event === 'caught') {
      if (sound) caught(v.audio);
      onCaught();
      return;
    }
    this._roar(dt, event, chase.roar, player);
    if (!this.ai.visible || !sound) return;
    const { pan, dist: d } = heardFrom(this.ai.x, this.ai.z, player);
    // Hjertebank: raskere og sterkere jo nærmere det er.
    this.beatIn -= dt;
    if (this.beatIn <= 0) {
      const near = Math.max(0, 1 - d / 22);
      this.beatIn = 1.1 - near * 0.7;
      heartbeat(v.audio, (0.2 + near * 0.6) * (gentle ? 0.5 : 1));
    }
    // Pust fra den siden det er, når det jakter og er i nærheten.
    this.breathIn -= dt;
    if (this.ai.state === 'hunt' && d < 14 && this.breathIn <= 0) {
      this.breathIn = 1.3 + Math.random() * 1.2;
      breath(v.audio, pan, 0.15 + 0.75 * (1 - d / 14));
    }
  }

  /**
   * Nytt rom for monsteret: et nytt nivå, en ombygging – eller en annen etasje (view3d/storeys.js).
   * Jaktet det da man tok trappen, kommer det etter litt senere.
   */
  _newFloor(w) {
    const v = this.v;
    const climbed = this.ai && this.floor !== v.storeys.current;
    const hunting = this.ai?.state === 'hunt';
    this.ai = new MonsterAI(v.walk.level);
    this.floor = v.storeys.current;
    this.follow = climbed && hunting ? { t: FOLLOW, x: w.x, z: w.z } : null;
  }

  /** Nightmare: et brøl like etter at jakten begynner, fra der monsteret er – en advarsel om å løpe. */
  _roar(dt, event, delay, player) {
    this.roarAgain -= dt;
    if (event === 'hunt' && delay && this.roarAgain <= 0) this.roarIn = delay[0] + Math.random() * (delay[1] - delay[0]);
    if (this.roarIn === null || (this.roarIn -= dt) > 0) return;
    this.roarIn = null;
    if (this.ai.state !== 'hunt' || !this.v.walk.sound) return;
    this.roarAgain = ROAR_AGAIN;
    const { pan, dist } = heardFrom(this.ai.x, this.ai.z, player);
    const far = Math.min(1, dist / ROAR_FAR);
    roarAt(this.v.audio, pan, 1.1 - far * 0.5, far);
  }
}
