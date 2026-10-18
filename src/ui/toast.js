// Korte beskjeder nederst på skjermen.
import { h } from './dom.js';

export function toast(message, { error = false, ms = 2600 } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = h('div', { class: error ? 'toast error' : 'toast', text: message });
  root.append(el);
  setTimeout(() => el.remove(), ms);
}
