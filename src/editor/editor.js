// 2D-skissen: håndterer canvas, verktøy, angre/gjør om og tegning. Peker-input ligger i
// pointer.js.
import { History } from '../core/history.js';
import { getTheme } from '../core/themes.js';
import { ZONES, zoneLabels } from '../core/zones.js';
import { DOOR } from '../core/doors.js';
import { stairCells } from '../core/stairs.js';
import { DEFAULT_SLIDE_COLOR } from '../core/slides.js';
import { OBJECT_IDS } from '../core/objects.js';
import { normRect } from '../core/ops.js';
import { Viewport } from './viewport.js';
import { drawPlan, RULER_LEFT, RULER_TOP } from './render.js';
import { planImage } from './plan-image.js';
import { toolById } from './tools.js';
import { bindPointer } from './pointer.js';

export class Editor {
  /** @param options { onChange(kind) – 'live' under strøk, 'commit' etter, onHover(cell|null), onHint(tekst) } */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    this.view = new Viewport();
    this.history = new History();
    this.level = null;
    this.tool = toolById('floor');
    this.shape = 'brush';
    this.brush = 1;
    this.zone = { ceiling: 4, depth: 1.5, floor: 1.2, finish: 1, deck: 4 }; // høyden soneverktøyene maler (m)
    this.doorState = DOOR.CLOSED; // dørene dørverktøyet setter inn
    this.slideTube = false; // nye sklier: åpen renne eller lukket rør …
    this.slideColor = DEFAULT_SLIDE_COLOR; // … og fargen (SLIDE_COLORS)
    this.objectId = OBJECT_IDS[0]; // gjenstanden objektverktøyet setter inn
    this.grid = true;
    this.rulers = true;
    this.hover = null;
    this.stroke = null;
    this.spaceDown = false;
    this._image = null;
    this._zones = null;
    this._frame = 0;
    bindPointer(this);
    new ResizeObserver(() => this._resize()).observe(canvas.parentElement);
  }

  setLevel(level, { keepView = false } = {}) {
    this.level = level;
    this.history.clear();
    this.stroke = null;
    if (!keepView) this.fit();
    this.refresh();
  }

  /** Kalles når rommet er endret utenfra (tema, størrelse, generering). */
  refresh() {
    this._image = null;
    this._zones = null;
    this.invalidate();
  }

  /** Aktivt verktøy; sone- og dørverktøy får høyden/dørtilstanden de skal bruke som `value`. */
  get activeTool() {
    const t = this.tool;
    if (t.kind === 'zone') return { ...t, value: this.zone[t.layer] };
    if (t.kind === 'door') return { ...t, value: this.doorState };
    if (t.kind === 'object') return { ...t, value: this.objectId };
    if (t.kind === 'slide') return { ...t, value: this.slideTube };
    return t;
  }

  setTool(id) {
    this.tool = toolById(id);
    this.invalidate();
  }

  setShape(id) {
    this.shape = id;
    this.invalidate();
  }

  setBrush(n) {
    this.brush = Math.max(1, Math.min(9, n));
    this.invalidate();
  }

  setZoneValue(layer, metres) {
    this.zone[layer] = ZONES[layer].clamp(metres);
    this.invalidate();
  }

  setSlideTube(tube) {
    this.slideTube = tube;
  }

  setSlideColor(color) {
    this.slideColor = color;
  }

  setDoorState(state) {
    this.doorState = state;
  }

  setObjectId(id) {
    this.objectId = id;
  }

  undo() {
    if (this.history.undo(this.level)) this.changed('commit');
  }

  redo() {
    if (this.history.redo(this.level)) this.changed('commit');
  }

  /** Lagrer et angre-punkt før en endring som gjøres utenfra (f.eks. «Fyll med lys»). */
  checkpoint() {
    this.history.push(this.level);
  }

  /** Markerer steder i skissen en stund: [{ x, z, r }] (f.eks. det «Make it wrong» endret). */
  highlight(markers, ms) {
    this._highlight = markers;
    clearTimeout(this._highlightTimer);
    this._highlightTimer = setTimeout(() => {
      this._highlight = null;
      this.invalidate();
    }, ms);
    this.invalidate();
  }

  fit() {
    if (!this.level) return;
    const { width, height } = this._size();
    this.view.fit(this.level.w, this.level.h, width, height, this.rulers ? RULER_LEFT : 0, this.rulers ? RULER_TOP : 0);
    this.invalidate();
  }

  invalidate() {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = 0;
      this._render();
    });
  }

  /** Rommet er endret i skissen: tegn på nytt og si fra til appen. */
  changed(kind) {
    this.refresh();
    this.options.onChange?.(kind);
  }

  _size() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    return { width: Math.max(1, r.width), height: Math.max(1, r.height) };
  }

  _resize() {
    const { width, height } = this._size();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (!this._fitted && this.level) {
      this._fitted = true;
      this.fit();
    }
    this.invalidate();
  }

  _render() {
    if (!this.level) return;
    const { width, height } = this._size();
    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._image ??= planImage(this.level);
    this._zones ??= zoneLabels(this.level);
    drawPlan(this.ctx, {
      level: this.level,
      theme: getTheme(this.level.theme),
      view: this.view,
      width,
      height,
      image: this._image,
      zones: this._zones,
      hover: this.stroke?.type === 'pan' ? null : this.hover,
      preview: this.stroke?.type === 'rect' ? normRect(...this.stroke.a, ...this.stroke.b) : null,
      stairs: this.stroke?.type === 'stairs' ? { ...stairCells(this.stroke.a, this.stroke.b, this.brush), erase: this.stroke.erase } : null,
      slide: this.stroke?.type === 'slide' && !this.stroke.erase ? { points: this.stroke.points, tube: this.slideTube, color: this.slideColor } : null,
      tool: this.activeTool,
      brush: this.brush,
      erase: this.stroke?.erase ?? false,
      grid: this.grid,
      rulers: this.rulers,
      highlight: this._highlight,
    });
  }
}
