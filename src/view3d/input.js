// Input for gåmodus: tastatur, mus (pointer lock eller dra) og berøring (to «pinner»).

const FORWARD = ['KeyW', 'ArrowUp'];
const BACK = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];
const RUN = ['ShiftLeft', 'ShiftRight'];
const MOVE_KEYS = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT]);

function typingTarget(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

export class WalkInput {
  constructor(element) {
    this.element = element;
    this.keys = new Set();
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
    const k = (list) => list.some((c) => this.keys.has(c));
    return (k(FORWARD) ? 1 : 0) - (k(BACK) ? 1 : 0) - this.touchMove.y;
  }

  get strafe() {
    const k = (list) => list.some((c) => this.keys.has(c));
    return (k(RIGHT) ? 1 : 0) - (k(LEFT) ? 1 : 0) + this.touchMove.x;
  }

  get running() {
    return RUN.some((c) => this.keys.has(c));
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
    this.lookX = this.lookY = 0;
    this.touchMove = { x: 0, y: 0 };
    this._touches.clear();
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

  /** Venstre halvdel styrer gange, høyre halvdel styrer blikket. */
  _touch(e, phase) {
    if (!this.enabled) return;
    const rect = this.element.getBoundingClientRect();
    for (const t of e.changedTouches) {
      if (phase === 'start') {
        const role = t.clientX - rect.left < rect.width / 2 ? 'move' : 'look';
        this._touches.set(t.identifier, { role, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY });
      } else if (phase === 'move') {
        const s = this._touches.get(t.identifier);
        if (!s) continue;
        if (s.role === 'look') {
          this.lookX += (t.clientX - s.x) * 1.5;
          this.lookY += (t.clientY - s.y) * 1.5;
        } else {
          const clamp = (v) => Math.max(-1, Math.min(1, v / 60));
          this.touchMove = { x: clamp(t.clientX - s.x0), y: clamp(t.clientY - s.y0) };
        }
        s.x = t.clientX;
        s.y = t.clientY;
      } else {
        const s = this._touches.get(t.identifier);
        if (s?.role === 'move') this.touchMove = { x: 0, y: 0 };
        this._touches.delete(t.identifier);
      }
    }
    if (phase !== 'end') e.preventDefault();
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}
