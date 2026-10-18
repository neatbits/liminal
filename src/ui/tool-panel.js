// Verktøyseksjonen i sidepanelet: verktøy, form, penselstørrelse, høyden soneverktøyene
// (tak, dybde, gulv) maler, tilstanden dørverktøyet setter inn og formen på nye sklier.
// Tekstene ligger i tool-info.js.
import { TOOLS, SHAPES } from '../editor/tools.js';
import { h } from './dom.js';
import { section, unitInput } from './fields.js';
import { SWATCH, HINT, HINTS, ZONE, DOOR_STATES, SLIDE_SHAPES, SLIDE_COLOR_CHOICES, OBJECT_CHOICES } from './tool-info.js';

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
    this.door = choices(DOOR_STATES, (state) => a.doorState(state));
    this.slide = choices(SLIDE_SHAPES, (tube) => a.slideTube(tube));
    this.slideColor = choices(SLIDE_COLOR_CHOICES, (color) => a.slideColor(color));
    this.object = choices(OBJECT_CHOICES, (id) => a.objectId(id));
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
      h('div', { class: 'tool-grid' }, [...this.toolButtons.values()]),
      h('div', { class: 'tool-options' }, this.shapeRow, this.brushRow, this.zoneRow, this.door.row, this.slide.row, this.slideColor.row, this.object.row),
      this.hint,
    );
  }

  /** @param s editorens verktøytilstand: { tool, shape, brush, zone, doorState, slideTube, slideColor } */
  sync({ tool, shape, brush, zone, doorState, slideTube, slideColor, objectId }) {
    for (const [id, b] of this.toolButtons) b.classList.toggle('active', id === tool.id);
    for (const [id, b] of this.shapeButtons) b.classList.toggle('active', id === shape);
    this.door.select(doorState);
    this.slide.select(slideTube);
    this.slideColor.select(slideColor);
    this.object.select(objectId);
    this.brushLabel.textContent = `${brush} m`;
    const { kind } = tool;
    // Dør og gjenstand virker på én rute, trapp og sklie på en dragning: formvalget gjelder ikke dem.
    this.shapeRow.hidden = kind === 'door' || kind === 'object' || kind === 'stairs' || kind === 'slide';
    this.brushRow.hidden = kind === 'door' || kind === 'object' || kind === 'slide';
    this.object.row.hidden = kind !== 'object';
    this.door.row.hidden = kind !== 'door';
    this.slide.row.hidden = this.slideColor.row.hidden = kind !== 'slide';
    const z = tool.kind === 'zone' ? ZONE[tool.layer] : null;
    this.layer = z ? tool.layer : null;
    this.zoneRow.hidden = !z?.label; // fliser har ingen verdi å velge
    this.hint.textContent = z ? z.hint : (HINTS[tool.kind] ?? HINT);
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
