// Peker-input for 2D-skissen: pensel, rektangel, fyll, startpunkt, panorering og zoom.
import { getTheme } from '../core/themes.js';
import { TILE, getTile } from '../core/level.js';
import { normRect } from '../core/ops.js';
import { storeyCount, storeyLevel } from '../core/storeys.js';
import { addSlide, slidesAt, slidePath } from '../core/slides.js';
import { dropTarget, removeDropsAt } from '../core/slide-drops.js';
import { paintAt, paintLine, applyRect, applyFill, applyStairs, applySlide, extendSlidePath, placeSpawn, aimSpawn } from './tools.js';

const OBJECT_HELP = 'Objects stand on floor cells (not on water, stairs, pillars or in doorways).';
const CORNER_HELP = 'Click near a corner where two walls meet (inside a room), or where a wall sticks out into a room – it gets cut at 45° or rounded. Right-click removes it.';
const STAIRWELL_HELP = 'Stairs up lead to the floor above – add one with + Floor. You come out on the cell past the top.';
const COVERED_HELP = 'There is a pool on this floor right above the pool below – paint Floor over it here, and the pool below shows in blue so you can slide down to it.';
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
    ed.checkpoint();
    placeSpawn(level, wx, wz);
    ed.room.spawnStorey = ed.storey; // man starter i etasjen startpunktet står i
    ed.stroke = { type: 'spawn' };
    ed.changed('live');
  } else if (tool.kind === 'stairs') {
    ed.stroke = { type: 'stairs', a: cell, b: cell, erase, escalator: tool.escalator, down: tool.down, through: tool.through };
  } else if (tool.kind === 'slide') {
    ed.stroke = { type: 'slide', points: [cell], erase };
  } else if (tool.kind === 'door' || tool.kind === 'object' || tool.kind === 'corner') {
    ed.checkpoint();
    const help = { door: DOOR_HELP, object: OBJECT_HELP, corner: CORNER_HELP }[tool.kind];
    if (!paintAt(level, tool, cell[0], cell[1], 1, erase, wx - cell[0], wz - cell[1]) && !erase) ed.options.onHint?.(help);
    ed.settle();
    ed.changed('commit');
  } else if (ed.shape === 'rect') {
    ed.stroke = { type: 'rect', a: cell, b: cell, erase };
  } else if (ed.shape === 'fill') {
    ed.checkpoint();
    applyFill(level, tool, cell[0], cell[1], erase, spacing(ed));
    ed.settle();
    ed.changed('commit');
  } else {
    ed.checkpoint();
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
    ed.checkpoint();
    applyStairs(ed.level, s.a, s.b, ed.brush, s.erase, s);
    if (s.through && !s.erase && ed.storey === storeyCount(ed.room) - 1) ed.options.onHint?.(STAIRWELL_HELP);
  } else if (s.type === 'slide') {
    // Fra gulvet her ned til et basseng i etasjen under: lagres der nede (core/slide-drops.js).
    const below = ed.storey ? storeyLevel(ed.room, ed.storey - 1) : null;
    const [x, z] = s.points[0];
    const drop = !s.erase && dropTarget(ed.room, ed.storey, s.points);
    const undrop = s.erase && below && slidesAt(below, x, z).some((i) => below.slides[i].drop);
    ed.checkpoint(!!(drop || undrop)); // etasjen under endres også
    if (drop) addSlide(drop, s.points, ed.slideTube, ed.slideColor, true);
    else applySlide(ed.level, s.points, { tube: ed.slideTube, color: ed.slideColor }, s.erase);
    if (undrop) removeDropsAt(below, x, z);
    // Et basseng her rett over bassenget under (en kopiert etasje): sklien her virker ikke, si hvorfor.
    const [ex, ez] = s.points[s.points.length - 1];
    const made = !drop && !s.erase && below && ed.level.slides.at(-1);
    if (made && getTile(below, ex, ez) === TILE.WATER && getTile(ed.level, ex, ez) === TILE.WATER && slidePath(ed.level, made).problem) ed.options.onHint?.(COVERED_HELP);
  } else if (s.type === 'rect') {
    ed.checkpoint();
    applyRect(ed.level, ed.activeTool, normRect(...s.a, ...s.b), s.erase, spacing(ed));
  }
  ed.settle();
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
