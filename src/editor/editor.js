// 2D-skissen: håndterer canvas, etasjer, angre/gjør om og tegning. Peker-input ligger i
// pointer.js, verktøytilstanden i tool-state.js.
import { History } from '../core/history.js';
import { storeyCount, storeyLevel, spawnStorey } from '../core/storeys.js';
import { throughRuns } from '../core/stairwells.js';
import { dropTarget } from '../core/slide-drops.js';
import { getTheme } from '../core/themes.js';
import { zoneLabels } from '../core/zones.js';
import { stairCells } from '../core/stairs.js';
import { normRect } from '../core/ops.js';
import { Viewport } from './viewport.js';
import { drawPlan, RULER_LEFT, RULER_TOP } from './render.js';
import { planImage } from './plan-image.js';
import { bindPointer } from './pointer.js';
import { ToolState } from './tool-state.js';

export class Editor extends ToolState {
  /** @param options { onChange(kind) – 'live' under strøk, 'commit' etter, onHover(cell|null), onHint(tekst), onStorey(k) } */
  constructor(canvas, options = {}) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    this.view = new Viewport();
    this.history = new History();
    this.room = null; // hele rommet (etasje 0, med room.storeys over)
    this.storey = 0; // etasjen som tegnes – this.level er den (core/storeys.js)
    this.level = null;
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

  setLevel(room, { keepView = false } = {}) {
    this.room = this.level = room;
    this.storey = 0;
    this.history.clear();
    this.stroke = null;
    if (!keepView) this.fit();
    this.refresh();
    this.options.onStorey?.(0);
  }

  /** Kalles når rommet er endret utenfra (tema, størrelse, generering). */
  refresh() {
    if (this.room) this.level = storeyLevel(this.room, (this.storey = Math.min(this.storey, storeyCount(this.room) - 1)));
    this._image = null;
    this._zones = null;
    this._wells = null;
    this.invalidate();
  }

  /** Tegner i etasje k (0 = nederst). */
  setStorey(k) {
    this.storey = Math.max(0, k);
    this.stroke = null;
    this.refresh();
    this.options.onStorey?.(this.storey);
  }

  undo() {
    this._went(this.history.undo(this.room));
  }

  redo() {
    this._went(this.history.redo(this.room));
  }

  /** Angre/gjør om viser etasjen som ble endret. */
  _went(step) {
    if (!step) return;
    if (!step.all && step.storey !== this.storey) this.setStorey(step.storey);
    this.changed('commit');
  }

  /** Angre-punkt før en endring i etasjen som tegnes – eller i hele bygget (all: størrelse, etasjer). */
  checkpoint(all = false) {
    this.history.push(this.room, all ? 'all' : this.storey);
  }

  /** Etter endringen: fjerner angre-punktet hvis ingenting endret seg. */
  settle() {
    this.history.dropIfUnchanged(this.room);
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
    const below = this.storey ? storeyLevel(this.room, this.storey - 1) : null;
    this._wells ??= { runs: this.storey < storeyCount(this.room) - 1 ? throughRuns(this.level) : [], below: below ? throughRuns(below) : [] };
    drawPlan(this.ctx, {
      level: this.level,
      below,
      wells: this._wells,
      spawn: this.storey === spawnStorey(this.room),
      theme: getTheme(this.level.theme),
      view: this.view,
      width,
      height,
      image: this._image,
      zones: this._zones,
      hover: this.stroke?.type === 'pan' ? null : this.hover,
      preview: this.stroke?.type === 'rect' ? normRect(...this.stroke.a, ...this.stroke.b) : null,
      stairs: this.stroke?.type === 'stairs' ? { ...stairCells(this.stroke.a, this.stroke.b, this.brush), erase: this.stroke.erase, down: this.stroke.escalator && this.stroke.down } : null,
      slide: this.stroke?.type === 'slide' && !this.stroke.erase ? { points: this.stroke.points, tube: this.slideTube, color: this.slideColor, drop: !!dropTarget(this.room, this.storey, this.stroke.points) } : null,
      tool: this.activeTool,
      brush: this.brush,
      erase: this.stroke?.erase ?? false,
      grid: this.grid,
      rulers: this.rulers,
      highlight: this._highlight,
    });
  }
}
