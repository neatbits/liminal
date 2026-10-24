// Phone controls: a floating joystick (WalkInput's left half), Run/Jump/Use and a menu button.
import { h } from '../ui/dom.js';

export class TouchControls {
  constructor(root, walk) {
    this.walk = walk;
    this.pointers = new Map();
    const hold = (name, label, title, code) => {
      const b = h('button', {
        type: 'button',
        class: `touch-${name}`,
        text: label,
        'aria-label': title,
        dataset: { control: name },
      });
      b.addEventListener('pointerdown', e => {
        if (!walk.active || walk.paused) return;
        e.preventDefault();
        e.stopPropagation();
        this.pointers.set(e.pointerId, { b, code });
        walk.input.buttons.add(code);
        b.classList.add('held');
        b.setPointerCapture(e.pointerId);
      });
      const release = e => {
        const p = this.pointers.get(e.pointerId);
        if (!p) return;
        this.pointers.delete(e.pointerId);
        if (![...this.pointers.values()].some(q => q.code === p.code)) {
          walk.input.buttons.delete(p.code);
          p.b.classList.remove('held');
        }
      };
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
        b.addEventListener(type, release);
      return b;
    };
    // Run is a toggle, so the right thumb stays free to look around while running.
    this.run = h('button', {
      type: 'button',
      class: 'touch-run',
      text: 'Run',
      'aria-label': 'Run',
      'aria-pressed': 'false',
      dataset: { control: 'run' },
      onclick: () => this.setRunning(!walk.input.buttons.has('ShiftLeft')),
    });
    const use = h('button', {
      type: 'button',
      class: 'touch-use',
      text: 'Use',
      'aria-label': 'Use nearby door',
      dataset: { control: 'use' },
      onclick: () => walk.useDoor(),
    });
    this.knob = h('div', { class: 'touch-knob' });
    this.stick = h('div', { class: 'touch-stick', 'aria-hidden': 'true' }, this.knob);
    this.root = h(
      'div',
      { class: 'touch-controls' },
      this.stick,
      h('div', { class: 'touch-action-pad' }, this.run, hold('jump', 'Jump', 'Jump', 'Space'), use),
      h('button', {
        type: 'button',
        class: 'touch-menu',
        text: 'Ⅱ Menu',
        'aria-label': 'Pause and open menu',
        onclick: () => walk.session.setPaused(true),
      }),
    );
    root.append(this.root);
    walk.input.onReset = () => this.clear();
    walk.input.onStick = s => this._showStick(s);
    this.use = use;
  }

  setRunning(on) {
    if (on) this.walk.input.buttons.add('ShiftLeft');
    else this.walk.input.buttons.delete('ShiftLeft');
    this.run.classList.toggle('held', on);
    this.run.setAttribute('aria-pressed', String(on));
  }

  /** The stick rests faintly bottom left and jumps to wherever the thumb lands. */
  _showStick(s) {
    const { stick, knob } = this;
    stick.classList.toggle('active', !!s);
    if (!s) {
      stick.style.left = stick.style.top = '';
      knob.style.transform = '';
      return;
    }
    const r = this.root.getBoundingClientRect();
    stick.style.left = `${s.x0 - r.left}px`;
    stick.style.top = `${s.y0 - r.top}px`;
    knob.style.transform = `translate(${s.x - s.x0}px, ${s.y - s.y0}px)`;
  }

  clear() {
    const held = [...this.pointers.entries()];
    this.pointers.clear();
    this.walk.input.buttons.clear();
    this.setRunning(false);
    this._showStick(null);
    for (const [id, { b }] of held) {
      b.classList.remove('held');
      if (b.hasPointerCapture(id)) b.releasePointerCapture(id);
    }
  }
}
