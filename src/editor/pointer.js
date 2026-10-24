// Peker-input for 2D-skissen: pensel, rektangel, fyll, startpunkt, panorering og zoom.
import { getTheme } from '../core/themes.js';
import { normRect } from '../core/ops.js';
import { paintAt, paintLine, applyRect, applyFill, applyStairs, applySlide, extendSlidePath, placeSpawn, aimSpawn } from './tools.js';

const OBJECT_HELP = 'Objects stand on floor cells (not on water, stairs, pillars or in doorways).';
const CORNER_HELP = 'Click near a corner where two walls meet (inside a room), or where a wall sticks out into a room – it gets cut at 45° or rounded. Right-click removes it.';
const DOOR_HELP = 'A door needs a wall (or a 1-cell gap in a wall) with wall on both ends and a room on at least one side.';

function local(ed, e) {
  const r = ed.canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function spacing(ed) {
  return getTheme(ed.level.theme).lightSpacing;
}

function onDown(ed, e) {
  if (!ed.level || ed.stroke) return;
  ed.canvas.setPointerCapture(e.pointerId);
  const [sx, sy] = local(ed, e);
  if (e.button === 1 || (e.button === 0 && ed.spaceDown)) {
    ed.stroke = { type: 'pan', x: sx, y: sy };
    return;
  }
  if (e.button !== 0 && e.button !== 2) return;
  const erase = e.button === 2 || e.altKey;
  const [wx, wz] = ed.view.toWorld(sx, sy);
  const cell = [Math.floor(wx), Math.floor(wz)];
  const { level } = ed;
  const tool = ed.activeTool;
  if (tool.kind === 'spawn') {
    ed.history.push(level);
    placeSpawn(level, wx, wz);
    ed.stroke = { type: 'spawn' };
    ed.changed('live');
  } else if (tool.kind === 'stairs') {
    ed.stroke = { type: 'stairs', a: cell, b: cell, erase, escalator: tool.escalator, down: tool.down };
  } else if (tool.kind === 'slide') {
    ed.stroke = { type: 'slide', points: [cell], erase };
  } else if (tool.kind === 'door' || tool.kind === 'object' || tool.kind === 'corner') {
    ed.history.push(level);
    const help = { door: DOOR_HELP, object: OBJECT_HELP, corner: CORNER_HELP }[tool.kind];
    if (!paintAt(level, tool, cell[0], cell[1], 1, erase, wx - cell[0], wz - cell[1]) && !erase) ed.options.onHint?.(help);
    ed.history.dropIfUnchanged(level);
    ed.changed('commit');
  } else if (ed.shape === 'rect') {
    ed.stroke = { type: 'rect', a: cell, b: cell, erase };
  } else if (ed.shape === 'fill') {
    ed.history.push(level);
    applyFill(level, tool, cell[0], cell[1], erase, spacing(ed));
    ed.history.dropIfUnchanged(level);
    ed.changed('commit');
  } else {
    ed.history.push(level);
    ed.stroke = { type: 'brush', last: cell, erase };
    if (paintAt(level, tool, cell[0], cell[1], ed.brush, erase)) ed.changed('live');
  }
  ed.invalidate();
}

function onMove(ed, e) {
  if (!ed.level) return;
  const [sx, sy] = local(ed, e);
  const [wx, wz] = ed.view.toWorld(sx, sy);
  const cell = [Math.floor(wx), Math.floor(wz)];
  const prev = ed.hover;
  ed.hover = [wx, wz];
  if (!prev || Math.floor(prev[0]) !== cell[0] || Math.floor(prev[1]) !== cell[1]) ed.options.onHover?.(cell);
  const s = ed.stroke;
  if (s?.type === 'pan') {
    ed.view.pan(sx - s.x, sy - s.y);
    s.x = sx;
    s.y = sy;
  } else if (s?.type === 'brush') {
    if (cell[0] !== s.last[0] || cell[1] !== s.last[1]) {
      if (paintLine(ed.level, ed.activeTool, s.last, cell, ed.brush, s.erase)) ed.changed('live');
      s.last = cell;
    }
  } else if (s?.type === 'rect' || s?.type === 'stairs') {
    s.b = cell;
  } else if (s?.type === 'slide' && !s.erase) {
    extendSlidePath(s.points, cell);
  } else if (s?.type === 'spawn') {
    if (aimSpawn(ed.level, wx, wz)) ed.changed('live');
  }
  ed.invalidate();
}

function onUp(ed) {
  const s = ed.stroke;
  ed.stroke = null;
  if (!s || s.type === 'pan') return ed.invalidate();
  if (s.type === 'stairs') {
    ed.history.push(ed.level);
    applyStairs(ed.level, s.a, s.b, ed.brush, s.erase, s);
  } else if (s.type === 'slide') {
    ed.history.push(ed.level);
    applySlide(ed.level, s.points, { tube: ed.slideTube, color: ed.slideColor }, s.erase);
  } else if (s.type === 'rect') {
    ed.history.push(ed.level);
    applyRect(ed.level, ed.activeTool, normRect(...s.a, ...s.b), s.erase, spacing(ed));
  }
  ed.history.dropIfUnchanged(ed.level);
  ed.changed('commit');
}

export function bindPointer(ed) {
  const c = ed.canvas;
  c.addEventListener('pointerdown', (e) => onDown(ed, e));
  c.addEventListener('pointermove', (e) => onMove(ed, e));
  c.addEventListener('pointerup', () => onUp(ed));
  c.addEventListener('pointercancel', () => onUp(ed));
  c.addEventListener('pointerleave', () => {
    ed.hover = null;
    ed.options.onHover?.(null);
    ed.invalidate();
  });
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  c.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const [sx, sy] = local(ed, e);
      if (e.ctrlKey || !e.shiftKey) ed.view.zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015));
      else ed.view.pan(-e.deltaY, 0);
      ed.invalidate();
    },
    { passive: false },
  );
}
