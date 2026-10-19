// Venstre sidepanel: verktøy, rommets egenskaper, atmosfære, nøkkeltall og tegnehjelp.
import { THEMES, THEME_IDS, getTheme } from '../core/themes.js';
import { SKIES } from '../core/windows.js';
import { STRENGTHS } from '../gen/wrong.js';
import { MIN_SIZE, MAX_SIZE, HEIGHT_MIN, HEIGHT_MAX, DEPTH_MIN, DEPTH_MAX } from '../core/level.js';
import { h } from './dom.js';
import { section, range, unitInput } from './fields.js';
import { ToolPanel } from './tool-panel.js';

const metres = (v) => `${+v.toFixed(1)} m`;
const span = ([lo, hi]) => (Math.abs(hi - lo) < 1e-6 ? metres(lo) : `${+lo.toFixed(1)}–${metres(hi)}`);

export class Sidebar {
  /**
   * @param a handlinger: tool, shape, brush, zoneValue, doorState, rename, theme, size, height,
   *          waterDepth, bright, fog, fillLights, clearLights, generate, grid, rulers
   */
  constructor(root, a) {
    this.a = a;
    this.tools = new ToolPanel(a);

    this.name = h('input', { class: 'field', maxlength: 80, oninput: (e) => a.rename(e.target.value) });
    this.theme = h(
      'select',
      { class: 'field', onchange: (e) => a.theme(e.target.value) },
      THEME_IDS.map((id) => h('option', { value: id, text: THEMES[id].label })),
    );
    this.themeHint = h('p', { class: 'side-hint' });
    const size = { min: MIN_SIZE, max: MAX_SIZE, step: 1 };
    this.w = unitInput('m', { ...size, onchange: () => a.size(+this.w.firstChild.value, +this.h.firstChild.value) });
    this.h = unitInput('m', { ...size, onchange: () => a.size(+this.w.firstChild.value, +this.h.firstChild.value) });
    this.height = unitInput('m', { min: HEIGHT_MIN, max: HEIGHT_MAX, step: 0.1, onchange: (e) => a.height(+e.target.value) });
    this.depth = unitInput('m', { min: DEPTH_MIN, max: DEPTH_MAX, step: 0.1, onchange: (e) => a.waterDepth(+e.target.value) });
    // Tiden på døgnet for lyset i vinduene (verktøyet Window).
    this.sky = h('select', { class: 'field', onchange: (e) => a.sky(e.target.value) }, Object.entries(SKIES).map(([id, s]) => h('option', { value: id, text: s.label })));
    const room = section(
      'Room',
      true,
      h('div', { class: 'row' }, h('label', { text: 'Name' }), this.name),
      h('div', { class: 'row' }, h('label', { text: 'Theme' }), this.theme),
      this.themeHint,
      h('div', { class: 'row-2' }, h('div', {}, h('label', { text: 'Width' }), this.w), h('div', {}, h('label', { text: 'Depth' }), this.h)),
      h(
        'div',
        { class: 'row-2' },
        h('div', {}, h('label', { text: 'Ceiling height' }), this.height),
        h('div', {}, h('label', { text: 'Water depth' }), this.depth),
      ),
      h('p', { class: 'side-hint', text: 'Use the Ceiling and Depth tools to give parts of the room their own height or depth.' }),
      h('div', { class: 'row' }, h('label', { text: 'Window light' }), this.sky),
    );

    this.bright = range('Brightness', 0.3, 2, 0.05, (v) => a.bright(v));
    this.fog = range('Fog', 0, 2.5, 0.05, (v) => a.fog(v));
    const atmosphere = section(
      'Atmosphere',
      true,
      this.bright.row,
      this.fog.row,
      h(
        'div',
        { class: 'side-actions' },
        h('button', { type: 'button', class: 'btn', text: 'Fill with lights', onclick: () => a.fillLights() }),
        h('button', { type: 'button', class: 'btn', text: 'Remove all lights', onclick: () => a.clearLights() }),
      ),
      h('button', { type: 'button', class: 'btn', style: { width: '100%', marginTop: '6px', justifyContent: 'center' }, text: '🎲 Generate random room', onclick: () => a.generate() }),
      // «Make it wrong»: mange små endringer som gjør at noe føles galt (gen/wrong.js).
      h(
        'div',
        { class: 'row wrong-row' },
        (this.wrongStrength = h('select', { class: 'field', title: 'How wrong' }, Object.entries(STRENGTHS).map(([id, s]) => h('option', { value: id, text: s.label, selected: id === 'wrong' })))),
        h('button', { type: 'button', class: 'btn', text: 'Make it wrong', title: 'Make 5–20 small changes that make the room feel subtly wrong (undo with Ctrl+Z)', onclick: () => a.makeWrong(this.wrongStrength.value) }),
      ),
    );

    this.stats = h('dl', { class: 'stats' });
    const keys = section('Key figures', true, this.stats);

    this.gridToggle = h('input', { type: 'checkbox', class: 'switch', onchange: (e) => a.grid(e.target.checked) });
    this.rulerToggle = h('input', { type: 'checkbox', class: 'switch', onchange: (e) => a.rulers(e.target.checked) });
    const helpers = section(
      'Drawing aids',
      false,
      h('label', { class: 'row-toggle' }, h('span', { text: 'Grid' }), this.gridToggle),
      h('label', { class: 'row-toggle' }, h('span', { text: 'Rulers' }), this.rulerToggle),
      h('p', { class: 'side-hint', text: '1 cell = 1 × 1 metre. Hold Space and drag to pan; the wheel zooms.' }),
    );
    root.append(this.tools.el, room, atmosphere, keys, helpers);
  }

  /** @param s editorens verktøytilstand (se ToolPanel.sync) */
  syncTool(s) {
    this.tools.sync(s);
  }

  syncLevel(level) {
    const theme = getTheme(level.theme);
    if (document.activeElement !== this.name) this.name.value = level.name;
    this.theme.value = level.theme;
    this.themeHint.textContent = theme.description;
    this.w.firstChild.value = level.w;
    this.h.firstChild.value = level.h;
    this.height.firstChild.value = level.height;
    this.depth.firstChild.value = level.waterDepth;
    this.sky.value = level.sky ?? 'day';
    this.bright.input.value = level.bright;
    this.bright.out.textContent = `${Math.round(level.bright * 100)} %`;
    this.fog.input.value = level.fog;
    this.fog.out.textContent = `${Math.round(level.fog * 100)} %`;
    this.tools.syncTheme(theme);
  }

  syncStats(stats) {
    const rows = [
      ['Floor area', `${stats.floorArea} m²`],
      ['Volume', `${stats.volume} m³`],
      ['Ceiling', span(stats.ceiling)],
      ...(stats.floor[1] > 0 ? [['Floor', span(stats.floor)]] : []),
      ['Water', stats.depth ? `${stats.waterArea} m² · ${span(stats.depth)} deep` : '0 m²'],
      ['Lights', `${stats.lights}`],
      ['Flickering / broken', `${stats.flicker} / ${stats.broken}`],
    ];
    this.stats.replaceChildren(...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
  }

  syncHelpers({ grid, rulers }) {
    this.gridToggle.checked = grid;
    this.rulerToggle.checked = rulers;
  }
}
