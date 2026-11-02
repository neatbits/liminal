// Venstre sidepanel med to faner: Tools (verktøyene) og Room (rommets egenskaper, lys og stemning,
// generering, nøkkeltall og tegnehjelp), så rommet kan nås uten å bla forbi verktøyene.
import { THEMES, THEME_IDS, getTheme } from '../core/themes.js';
import { SKIES } from '../core/windows.js';
import { TINTS } from '../core/tints.js';
import { looksOf } from '../core/looks.js';
import { STRENGTHS } from '../gen/wrong.js';
import { MIN_SIZE, MAX_SIZE, HEIGHT_MIN, HEIGHT_MAX, DEPTH_MIN, DEPTH_MAX } from '../core/level.js';
import { h } from './dom.js';
import { section, range, unitInput } from './fields.js';
import { ToolPanel } from './tool-panel.js';

const metres = (v) => `${+v.toFixed(1)} m`;
const TAB_KEY = 'liminal.sidebar-tab';
const TABS = [['tools', 'Tools'], ['room', 'Room']];
const span = ([lo, hi]) => (Math.abs(hi - lo) < 1e-6 ? metres(lo) : `${+lo.toFixed(1)}–${metres(hi)}`);

// Generate: hvor mye som lages (app/actions.js, generateInto).
const GEN_FLOORS = [['random', 'Random (1–3)'], ['1', '1 floor'], ['2', '2 floors'], ['3', '3 floors'], ['this', 'This floor only']];

export class Sidebar {
  /**
   * @param a handlinger: tool, shape, brush, zoneValue, doorState, rename, theme, size, height,
   *          waterDepth, bright, fog, fillLights, clearLights, generate(seed | null), grid, rulers
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
      h('div', { class: 'row' }, (this.themeLabel = h('label', { text: 'Theme' })), this.theme),
      this.themeHint,
      h('div', { class: 'row-2' }, h('div', {}, h('label', { text: 'Width' }), this.w), h('div', {}, h('label', { text: 'Depth' }), this.h)),
      h(
        'div',
        { class: 'row-2' },
        h('div', {}, h('label', { text: 'Ceiling height' }), this.height),
        h('div', {}, h('label', { text: 'Water depth' }), this.depth),
      ),
      h('p', { class: 'side-hint', text: 'Use the Ceiling and Depth tools to give parts of the room their own height or depth.' }),
    );

    this.bright = range('Brightness', 0.3, 2, 0.05, (v) => a.bright(v));
    this.fog = range('Fog', 0, 2.5, 0.05, (v) => a.fog(v));
    // Lysfargen (core/tints.js) – kan overstyres av velgeren over 3D-panelet.
    this.tint = h('select', { class: 'field', onchange: (e) => a.tint(e.target.value) }, Object.entries(TINTS).map(([id, t]) => h('option', { value: id, text: t.label })));
    // Bygningens tapet og teppe (core/looks.js), for temaene som har det.
    this.look = h('select', { class: 'field', 'aria-label': 'Style', onchange: (e) => a.look(+e.target.value) });
    this.lookRow = h('div', { class: 'row', hidden: true }, h('label', { text: 'Style' }), this.look);
    const atmosphere = section(
      'Light & atmosphere',
      true,
      this.bright.row,
      this.fog.row,
      this.lookRow,
      h('div', { class: 'row' }, h('label', { text: 'Light colour' }), this.tint),
      h('div', { class: 'row' }, h('label', { text: 'Window light' }), this.sky),
      h(
        'div',
        { class: 'side-actions' },
        h('button', { type: 'button', class: 'btn', text: 'Fill with lights', onclick: () => a.fillLights() }),
        h('button', { type: 'button', class: 'btn', text: 'Remove all lights', onclick: () => a.clearLights() }),
      ),
    );

    const generate = section(
      'Generate',
      true,
      h('p', { class: 'side-hint', text: 'Replaces the room with a new one in the same theme and size. Ctrl+Z undoes it.' }),
      h(
        'div',
        { class: 'row' },
        h('label', { text: 'Floors' }),
        (this.genFloors = h('select', { class: 'field', title: 'How many floors to generate, joined by stairs or ladders' }, GEN_FLOORS.map(([value, text]) => h('option', { value, text })))),
      ),
      // Generering: frøet bestemmer rommet (samme frø og tema = samme rom). Tomt felt = tilfeldig.
      h(
        'div',
        { class: 'row seed-row' },
        (this.seed = h('input', { class: 'field', type: 'number', min: 0, step: 1, placeholder: 'Seed', title: 'The same seed and theme always give the same room' })),
        h('button', { type: 'button', class: 'btn', text: 'Generate', title: 'Generate a room from this seed', onclick: () => a.generate(this.seed.value, this.genFloors.value) }),
        h('button', { type: 'button', class: 'btn', text: '🎲 Random', title: 'Generate a room from a new random seed', onclick: () => a.generate(null, this.genFloors.value) }),
      ),
      // «Make it wrong»: mange små endringer som gjør at noe føles galt (gen/wrong.js).
      h(
        'div',
        { class: 'row wrong-row' },
        (this.wrongStrength = h('select', { class: 'field', title: 'How wrong' }, Object.entries(STRENGTHS).map(([id, s]) => h('option', { value: id, text: s.label, selected: id === 'wrong' })))),
        h('button', { type: 'button', class: 'btn', text: 'Make it wrong', title: 'Make 5–20 small changes that make the room feel subtly wrong (undo with Ctrl+Z)', onclick: () => a.makeWrong(this.wrongStrength.value) }),
      ),
    );

    this.stats = h('dl', { class: 'stats' });
    const keys = section('Key figures', false, this.stats);

    this.gridToggle = h('input', { type: 'checkbox', class: 'switch', onchange: (e) => a.grid(e.target.checked) });
    this.rulerToggle = h('input', { type: 'checkbox', class: 'switch', onchange: (e) => a.rulers(e.target.checked) });
    const helpers = section(
      'Drawing aids',
      false,
      h('label', { class: 'row-toggle' }, h('span', { text: 'Grid' }), this.gridToggle),
      h('label', { class: 'row-toggle' }, h('span', { text: 'Rulers' }), this.rulerToggle),
      h('p', { class: 'side-hint', text: '1 cell = 1 × 1 metre. Hold Space and drag to pan; the wheel zooms.' }),
    );
    this.root = root;
    this.tabs = Object.fromEntries(TABS.map(([id, text]) => [id, h('button', {
      type: 'button', role: 'tab', class: 'side-tab', id: `side-tab-${id}`, 'aria-controls': `side-panel-${id}`, text, onclick: () => this.showTab(id),
    })]));
    const tablist = h('div', { class: 'side-tabs', role: 'tablist', 'aria-label': 'Sidebar' }, Object.values(this.tabs));
    tablist.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const next = TABS[(TABS.findIndex(([id]) => id === this.tab) + 1) % TABS.length][0];
      this.showTab(next, { focus: true });
      e.preventDefault();
    });
    const panel = (id, ...children) => h('div', { class: 'side-panel', role: 'tabpanel', id: `side-panel-${id}`, 'aria-labelledby': `side-tab-${id}` }, ...children);
    this.panels = { tools: panel('tools', this.tools.el), room: panel('room', room, atmosphere, generate, keys, helpers) };
    root.append(tablist, ...Object.values(this.panels));
    let saved = null;
    try {
      saved = localStorage.getItem(TAB_KEY);
    } catch {
      /* ikke kritisk */
    }
    this.showTab(this.panels[saved] ? saved : 'tools');
  }

  /** Viser fanen id ('tools' | 'room'). focus: flytt tastaturfokus til fanen. */
  showTab(id, { focus = false } = {}) {
    this.tab = id;
    for (const [key, tab] of Object.entries(this.tabs)) {
      tab.setAttribute('aria-selected', String(key === id));
      tab.tabIndex = key === id ? 0 : -1;
      this.panels[key].hidden = key !== id;
    }
    if (focus) this.tabs[id].focus();
    this.root.scrollTop = 0;
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {
      /* ikke kritisk */
    }
  }

  /** Rominnstillingene (navnet i toppfeltet): Room-fanen med navnefeltet i fokus. */
  openRoom() {
    this.showTab('room');
    this.name.focus();
    this.name.select();
  }

  /** @param s editorens verktøytilstand (se ToolPanel.sync) */
  syncTool(s) {
    this.tools.sync(s);
  }

  /** Med flere etasjer gjelder temaet etasjen som tegnes: «Theme · floor 2». */
  syncFloor(storey, count) {
    this.themeLabel.textContent = count > 1 ? `Theme · floor ${storey + 1}` : 'Theme';
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
    this.tint.value = level.tint ?? 'theme';
    const looks = looksOf(level.theme);
    this.lookRow.hidden = !looks;
    if (looks && this.look.dataset.theme !== level.theme) {
      this.look.dataset.theme = level.theme;
      this.look.replaceChildren(...looks.map((l, i) => h('option', { value: i, text: l.label })));
    }
    if (looks) this.look.value = level.look ?? 0;
    if (document.activeElement !== this.seed) this.seed.value = level.seed ?? '';
    this.bright.input.value = level.bright;
    this.bright.out.textContent = `${Math.round(level.bright * 100)} %`;
    this.fog.input.value = level.fog;
    this.fog.out.textContent = `${Math.round(level.fog * 100)} %`;
    this.tools.syncTheme(theme);
  }

  /** 3D-byggingen ({ ms, vertices, lights }, eller null uten 3D) under Key figures. */
  syncBuild(s) {
    this.build = s ? [['3D build', `${s.ms} ms`], ['Vertices', s.vertices.toLocaleString('en-US')]] : [['3D', 'Unavailable – 2D editor ready']];
    if (this.lastStats) this.syncStats(this.lastStats);
  }

  syncStats(stats) {
    this.lastStats = stats;
    const rows = [
      ['Floor area', `${stats.floorArea} m²`],
      ['Volume', `${stats.volume} m³`],
      ['Ceiling', span(stats.ceiling)],
      ...(stats.floor[1] > 0 ? [['Floor', span(stats.floor)]] : []),
      ['Water', stats.depth ? `${stats.waterArea} m² · ${span(stats.depth)} deep` : '0 m²'],
      ['Lights', `${stats.lights}`],
      ['Flickering / broken', `${stats.flicker} / ${stats.broken}`],
      ...(this.build ?? []),
    ];
    this.stats.replaceChildren(...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
  }

  syncHelpers({ grid, rulers }) {
    this.gridToggle.checked = grid;
    this.rulerToggle.checked = rulers;
  }
}
