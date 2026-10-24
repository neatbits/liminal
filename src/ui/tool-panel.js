// Verktøyseksjonen i sidepanelet: verktøy, form, penselstørrelse, høyden soneverktøyene
// (tak, dybde, gulv) maler, tilstanden dørverktøyet setter inn og formen på nye sklier.
// Tekstene ligger i tool-info.js.
import { TOOLS, SHAPES } from '../editor/tools.js';
import { h } from './dom.js';
import { section, unitInput } from './fields.js';
import { SWATCH, HINT, HINTS, ZONE, DOOR_STATES, SLIDE_SHAPES, SLIDE_COLOR_CHOICES, TOOL_GROUPS, CORNER_KINDS, ESCALATOR_DIRECTIONS } from './tool-info.js';
import { objectPicker } from './object-picker.js';
import { PILLAR_DIAMETERS } from '../core/pillars.js';
import { FINISHES } from '../core/finishes.js';

/** Knapperad med ett valg: [[verdi, tekst], …]. select(verdi) markerer valget. */
function choices(options, pick) {
  const buttons = options.map(([value, text]) => [value, h('button', { type: 'button', text, onclick: () => pick(value) })]);
  const row = h('div', { class: 'segmented', hidden: true }, buttons.map(([, b]) => b));
  return { row, select: (v) => buttons.forEach(([value, b]) => b.classList.toggle('active', value === v)) };
}

export class ToolPanel {
  /** @param a handlinger: tool(id), shape(id), brush(delta), zoneValue(layer, metres), doorState(state), slideTube(bool), slideColor(name), objectId(id) */
  constructor(a) {
    this.toolButtons = new Map(
      TOOLS.map((t) => [
        t.id,
        h(
          'button',
          { type: 'button', class: 'tool', title: `${t.label} (${t.key})`, onclick: () => a.tool(t.id) },
          h('kbd', { text: t.key }),
          h('span', { class: 'swatch', dataset: { tool: t.id } }),
          h('span', { text: t.label }),
        ),
      ]),
    );
    this.shapeButtons = new Map(
      SHAPES.map((s) => [s.id, h('button', { type: 'button', title: `${s.label} (${s.key})`, text: s.label, onclick: () => a.shape(s.id) })]),
    );
    this.brushLabel = h('span');
    this.layer = null;
    this.zoneLabel = h('span');
    this.zoneInput = unitInput('m', { step: 0.1, onchange: (e) => a.zoneValue(this.layer, +e.target.value) });
    this.zoneRow = h('div', { class: 'brush-row zone-row', hidden: true }, this.zoneLabel, this.zoneInput);
    this.finish = h('select', { 'aria-label': 'Floor finish', onchange: e => a.zoneValue('finish', +e.target.value) },
      FINISHES.map(f => h('option', { value: f.value, text: f.label })));
    this.finishRow = h('label', { class: 'brush-row', hidden: true }, h('span', { text: 'Finish' }), this.finish);
    this.door = choices(DOOR_STATES, (state) => a.doorState(state));
    this.corner = choices(CORNER_KINDS, (kind) => a.cornerKind(kind));
    this.pillar = choices(PILLAR_DIAMETERS.map(d => [d, `${d} m`]), d => a.pillarDiameter(d));
    this.pillar.row.setAttribute('aria-label','Pillar diameter');
    this.pillar.row.setAttribute('role','group');
    this.slide = choices(SLIDE_SHAPES, (tube) => a.slideTube(tube));
    this.slideColor = choices(SLIDE_COLOR_CHOICES, (color) => a.slideColor(color));
    this.escalator = choices(ESCALATOR_DIRECTIONS, (down) => a.escalatorDown(down));
    this.escalator.row.setAttribute('aria-label', 'Escalator direction');
    this.escalator.row.setAttribute('role', 'group');
    this.object = objectPicker((id) => a.objectId(id));
    this.shapeRow = h('div', { class: 'segmented' }, [...this.shapeButtons.values()]);
    this.brushRow = h(
      'div',
      { class: 'brush-row' },
      h('span', { text: 'Brush size' }),
      h(
        'div',
        { class: 'stepper', title: 'Brush size ([ and ])' },
        h('button', { type: 'button', text: '−', onclick: () => a.brush(-1) }),
        this.brushLabel,
        h('button', { type: 'button', text: '+', onclick: () => a.brush(1) }),
      ),
    );
    this.hint = h('p', { class: 'side-hint', text: HINT });
    this.el = section(
      'Tools',
      true,
      ...this._groups(),
      h('div', { class: 'tool-options' }, this.shapeRow, this.brushRow, this.zoneRow, this.finishRow, this.door.row, this.corner.row, this.pillar.row, this.slide.row, this.slideColor.row, this.escalator.row, this.object.row),
      this.hint,
    );
  }

  /** Verktøyknappene i grupper med overskrift (TOOL_GROUPS); resten havner i den siste gruppen. */
  _groups() {
    const grouped = new Set(TOOL_GROUPS.flatMap(([, ids]) => ids));
    const rest = [...this.toolButtons.keys()].filter((id) => !grouped.has(id));
    return TOOL_GROUPS.map(([label, ids], i) => {
      const buttons = [...ids, ...(i === TOOL_GROUPS.length - 1 ? rest : [])].map((id) => this.toolButtons.get(id)).filter(Boolean);
      return h('div', { class: 'tool-group' }, h('p', { class: 'tool-group-label', text: label }), h('div', { class: 'tool-grid' }, buttons));
    });
  }

  /** @param s editorens verktøytilstand: { tool, shape, brush, zone, doorState, slideTube, slideColor } */
  sync({ tool, shape, brush, zone, doorState, cornerKind, pillarDiameter, slideTube, slideColor, objectId, escalatorDown }) {
    for (const [id, b] of this.toolButtons) b.classList.toggle('active', id === tool.id);
    for (const [id, b] of this.shapeButtons) b.classList.toggle('active', id === shape);
    this.door.select(doorState);
    this.corner.select(cornerKind);
    this.pillar.select(pillarDiameter);
    this.pillar.row.hidden = tool.id !== 'pillar';
    this.finishRow.hidden = tool.layer !== 'finish';
    this.finish.value = String(zone.finish);
    this.slide.select(slideTube);
    this.slideColor.select(slideColor);
    this.escalator.select(escalatorDown);
    this.escalator.row.hidden = !tool.escalator;
    this.object.select(objectId);
    this.brushLabel.textContent = `${brush} m`;
    const { kind } = tool;
    // Dør og gjenstand virker på én rute, trapp og sklie på en dragning: formvalget gjelder ikke dem.
    this.shapeRow.hidden = kind === 'door' || kind === 'object' || kind === 'stairs' || kind === 'slide' || kind === 'corner';
    this.brushRow.hidden = kind === 'door' || kind === 'object' || kind === 'slide' || kind === 'corner';
    this.corner.row.hidden = kind !== 'corner';
    this.object.row.hidden = kind !== 'object';
    this.door.row.hidden = kind !== 'door';
    this.slide.row.hidden = this.slideColor.row.hidden = kind !== 'slide';
    const z = tool.kind === 'zone' ? ZONE[tool.layer] : null;
    this.layer = z ? tool.layer : null;
    this.zoneRow.hidden = !z?.label; // Belegg har egen meny i stedet for meterfelt.
    this.hint.textContent = z ? z.hint : (HINTS[tool.id] ?? HINTS[tool.kind] ?? HINT);
    if (!z?.label) return;
    const input = this.zoneInput.firstChild;
    this.zoneLabel.textContent = z.label;
    Object.assign(input, { min: z.min, max: z.max });
    if (document.activeElement !== input) input.value = zone[tool.layer].toFixed(1);
  }

  syncTheme(theme) {
    for (const [id, b] of this.toolButtons) {
      b.querySelector('.swatch').style.background = id === 'floor' ? theme.plan.floor : SWATCH[id];
    }
  }
}
