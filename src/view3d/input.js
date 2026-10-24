// Input for gåmodus: tastatur, mus (pointer lock eller dra) og berøring (to «pinner»).

const FORWARD = ['KeyW', 'ArrowUp'];
const BACK = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];
const RUN = ['ShiftLeft', 'ShiftRight'];
const MOVE_KEYS = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT, 'Space']); // mellomrom: hopp (og ikke «klikk» på en knapp)
const STICK = 56; // px fra midten av joysticken til full fart
const DEAD = 0.12; // dødsone i joysticken (andel av STICK)
const TOUCH_LOOK = 3.5; // sveip gir mer dreining enn mus: én skjermbredde ≈ en halv runde

function typingTarget(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

export class WalkInput {
  constructor(element) {
    this.element = element;
    this.keys = new Set();
    this.buttons = new Set(); // held on-screen controls, independent of physical keys
    this.lookX = 0;
    this.lookY = 0;
    this.touchMove = { x: 0, y: 0 };
    this.enabled = false;
    this.locked = false;
    this._drag = null;
    this._touches = new Map();
    this._bind();
  }

  get forward() {
    const k = (list) => list.some((c) => this.keys.has(c) || this.buttons.has(c));
    return (k(FORWARD) ? 1 : 0) - (k(BACK) ? 1 : 0) - this.touchMove.y;
  }

  get strafe() {
    const k = (list) => list.some((c) => this.keys.has(c) || this.buttons.has(c));
    return (k(RIGHT) ? 1 : 0) - (k(LEFT) ? 1 : 0) + this.touchMove.x;
  }

  get running() {
    return RUN.some((c) => this.keys.has(c) || this.buttons.has(c));
  }

  get jumping() {
    return this.keys.has('Space') || this.buttons.has('Space');
  }

  /** Henter og nullstiller akkumulert musebevegelse. */
  consumeLook() {
    const out = [this.lookX, this.lookY];
    this.lookX = 0;
    this.lookY = 0;
    return out;
  }

  reset() {
    this.keys.clear();
    this.buttons.clear();
    this.onReset?.();
    this.lookX = this.lookY = 0;
    this.touchMove = { x: 0, y: 0 };
    this._touches.clear();
    this._drag = null;
  }

  _bind() {
    const el = this.element;
    this._onKeyDown = (e) => {
      if (!this.enabled || typingTarget(e) || e.ctrlKey || e.metaKey) return;
      this.keys.add(e.code);
      if (MOVE_KEYS.has(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => this.keys.clear();
    this._onMouseMove = (e) => {
      if (!this.enabled) return;
      if (this.locked) {
        this.lookX += e.movementX;
        this.lookY += e.movementY;
      } else if (this._drag) {
        this.lookX += e.clientX - this._drag.x;
        this.lookY += e.clientY - this._drag.y;
        this._drag = { x: e.clientX, y: e.clientY };
      }
    };
    this._onMouseDown = (e) => {
      if (this.enabled && !this.locked && e.button === 0) this._drag = { x: e.clientX, y: e.clientY };
    };
    this._onMouseUp = () => (this._drag = null);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    el.addEventListener('mousedown', this._onMouseDown);
    el.addEventListener('touchstart', (e) => this._touch(e, 'start'), { passive: false });
    el.addEventListener('touchmove', (e) => this._touch(e, 'move'), { passive: false });
    el.addEventListener('touchend', (e) => this._touch(e, 'end'));
    el.addEventListener('touchcancel', (e) => this._touch(e, 'end'));
  }

  /** Venstre halvdel er en analog joystick der tommelen settes ned, høyre halvdel styrer blikket. */
  _touch(e, phase) {
    if (!this.enabled) return;
    const rect = this.element.getBoundingClientRect();
    for (const t of e.changedTouches) {
      if (phase === 'start') {
        const role = t.clientX - rect.left < rect.width / 2 ? 'move' : 'look';
        const s = { role, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY };
        this._touches.set(t.identifier, s);
        if (role === 'move') this.onStick?.(s);
      } else if (phase === 'move') {
        const s = this._touches.get(t.identifier);
        if (!s) continue;
        if (s.role === 'look') {
          this.lookX += (t.clientX - s.x) * TOUCH_LOOK;
          this.lookY += (t.clientY - s.y) * TOUCH_LOOK;
        } else this._stick(s, t.clientX, t.clientY);
        s.x = t.clientX;
        s.y = t.clientY;
      } else {
        const s = this._touches.get(t.identifier);
        if (s?.role === 'move') {
          this.touchMove = { x: 0, y: 0 };
          this.onStick?.(null);
        }
        this._touches.delete(t.identifier);
      }
    }
    if (phase !== 'end') e.preventDefault();
  }

  /** Analog styrke med dødsone; drar tommelen forbi kanten, følger midten etter. */
  _stick(s, x, y) {
    let dx = x - s.x0, dy = y - s.y0;
    const len = Math.hypot(dx, dy);
    if (len > STICK) {
      s.x0 = x - (dx / len) * STICK;
      s.y0 = y - (dy / len) * STICK;
      dx = x - s.x0;
      dy = y - s.y0;
    }
    const m = Math.min(1, len / STICK);
    const k = m < DEAD ? 0 : (m - DEAD) / (1 - DEAD) / (Math.hypot(dx, dy) || 1);
    this.touchMove = { x: dx * k, y: dy * k };
    this.onStick?.({ x0: s.x0, y0: s.y0, x, y });
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}
