// Scary mode i gåmodus: monsteret (world/monster-ai.js + view3d/monster.js) med hjertebank
// og pust, og «noclip» til et nytt nivå når det tar deg. Styres av view3d/explore.js.
import { MonsterAI } from '../world/monster-ai.js';
import { Monster3D } from './monster.js';
import { heartbeat, breath, caught } from '../audio/scary.js';

/** Bryteren i gålinjen (X): av → på → på uten jumpscares (mild) → av. Lagrer valget. */
export function cycleScary(viewer) {
  const s = viewer.settings;
  [s.scary, s.scaryMild] = !s.scary ? [true, false] : !s.scaryMild ? [true, true] : [false, false];
  if (s.scary) {
    viewer.hud.flash(
      s.scaryMild
        ? 'Scary mode, no jumpscares: it is still out there, but it will never catch you.'
        : 'Scary mode: darker rooms, more blackouts – and something in the dark. When the lights go out, run.',
      4500,
    );
  }
  viewer.hud.setToggles(s);
  viewer._applyLook();
  viewer.options.onSettingsChange?.(s);
}

export class Scary {
  constructor(viewer) {
    this.v = viewer;
    this.monster = new Monster3D();
    viewer.scene.add(this.monster.group);
    this.ai = null;
    this.beatIn = 0;
    this.breathIn = 0;
  }

  /** Av: monsteret forsvinner. */
  hide() {
    if (this.ai) this.ai.state = 'hidden';
    this.monster.group.visible = false;
  }

  /** Nytt nivå (eller nytt rom): monsteret begynner på nytt. */
  reset() {
    this.ai = null;
    this.hide();
  }

  /**
   * @param dark lyset er borte (strømbrudd) · gentle: «no jumpscares» (det tar deg aldri) ·
   *        onCaught() kalles når monsteret tar deg
   */
  update(dt, power, dark, gentle, onCaught) {
    const v = this.v;
    const w = v.walk.walker;
    if (!this.ai || this.ai.level !== v.walk.level) this.ai = new MonsterAI(v.walk.level);
    this.ai.gentle = gentle;
    const player = { x: w.x, z: w.z, y: w.floorY, yaw: w.yaw };
    const event = this.ai.update(dt, player, dark);
    this.monster.update(dt, this.ai, player, power);
    const sound = v.walk.sound;
    if (event === 'caught') {
      if (sound) caught(v.audio);
      onCaught();
      return;
    }
    if (!this.ai.visible || !sound) return;
    const dx = this.ai.x - w.x;
    const dz = this.ai.z - w.z;
    const d = Math.hypot(dx, dz);
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
      const pan = (dx * Math.cos(w.yaw) - dz * Math.sin(w.yaw)) / Math.max(d, 1e-6);
      breath(v.audio, pan, 0.15 + 0.75 * (1 - d / 14));
    }
  }
}
