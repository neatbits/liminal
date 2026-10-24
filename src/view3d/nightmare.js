// Nightmare-reglene for jakten (stemningens chase, gen/moods.js): monsteret jakter også der det er
// mørkt uten strømbrudd (de mørke delene av nivået), og tar det deg, våkner du i starten av nivået
// – og kassettene du har funnet her, er spredt på nytt. Brukes av view3d/explore.js.
import { waitWhileWalking } from './walk-session.js';

const DARK_IN = 0.05; // lysstyrke i øyehøyde (bakt lys) som regnes som mørkt …
const DARK_OUT = 0.09; // … og som må nås før det ikke lenger gjør det (så det ikke blafrer)

export class Darkness {
  constructor(viewer) {
    this.v = viewer;
    this.dark = false;
  }

  /** Står spilleren i mørket? Prøver på et 0,5 m-gitter, så lysfeltet kan bufre dem. */
  update() {
    const { walker } = this.v.walk, field = this.v.world?.field;
    if (!field) return (this.dark = false);
    const q = (n) => Math.round(n * 2) / 2;
    const s = field.sample(q(walker.x), q(walker.floorY + 1.2), q(walker.z), 0, 1, 0);
    const light = s[0] * 0.2126 + s[1] * 0.7152 + s[2] * 0.0722 + (s[3] + s[4] + s[5] + s[6]) * 0.5;
    this.dark = light < (this.dark ? DARK_OUT : DARK_IN);
    return this.dark;
  }
}

/** Tatt i Nightmare: glitch, svart, og tilbake til starten av nivået med kassettene spredt på nytt. */
export async function wakeAtStart(explorer) {
  const v = explorer.v;
  if (explorer.busy || v.walk.paused) return;
  const transition = {};
  explorer._transition = transition;
  const current = () => explorer._transition === transition;
  explorer.busy = true;
  v.hud.glitch();
  v.hud.fade(true);
  try {
    if (!(await waitWhileWalking(v, 900, current))) return;
    v.walk.enter(); // tilbake til startpunktet
    explorer.hunt.lost(explorer.found - explorer.levelFound);
    explorer.found = explorer.levelFound;
    explorer.scary.reset();
    explorer.blackout = explorer._newBlackout();
    explorer._placeTapes();
    v.hud.title('YOU WOKE UP', explorer.total > explorer.found ? 'The tapes have moved' : 'Back where you started');
    await waitWhileWalking(v, 250, current);
  } finally {
    if (current()) explorer._cancelTransition();
  }
}
