// Etasjevelgeren over 2D-skissen: ▼ Floor 2 / 3 ▲, ny etasje, kopi av etasjen og fjern.
// Med én etasje vises bare «+ Floor».
import { h } from './dom.js';

export class StoreyBar {
  /** @param a handlinger: go(k), add(), copy(), remove() */
  constructor(a) {
    this.k = 0;
    const chip = (text, title, onclick) => h('button', { type: 'button', class: 'chip', text, title, 'aria-label': title, onclick });
    this.down = chip('▼', 'Floor below (Page Down)', () => a.go(this.k - 1));
    this.label = h('span', { class: 'storey-label', 'aria-live': 'polite' });
    this.up = chip('▲', 'Floor above (Page Up)', () => a.go(this.k + 1));
    this.add = chip('+ Floor', 'Add an empty floor on top', () => a.add());
    this.copy = chip('⧉', 'Duplicate this floor (the copy goes right above it)', () => a.copy());
    this.remove = chip('✕', 'Remove this floor', () => a.remove());
    this.root = h('div', { class: 'storey-bar', role: 'group', 'aria-label': 'Floors' }, this.down, this.label, this.up, this.add, this.copy, this.remove);
  }

  /** k: etasjen som tegnes (0 = nederst), n: antall etasjer. */
  sync(k, n) {
    this.k = k;
    const many = n > 1;
    this.label.textContent = `Floor ${k + 1} / ${n}`;
    for (const el of [this.down, this.label, this.up, this.remove]) el.hidden = !many;
    this.down.disabled = k === 0;
    this.up.disabled = k === n - 1;
    this.add.textContent = many ? '+' : '+ Floor';
  }
}
