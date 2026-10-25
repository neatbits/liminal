// Åpne en delt lenke i programmet (File → Open shared link …): lim inn lenken man har fått, så
// åpnes rommet her. På nettsiden åpner man bare lenken. core/share-link.js leser koden.
import { decodeLevel } from '../core/serialize.js';
import { shareCode } from '../core/share-link.js';
import { h } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';

/** @param open (level) → åpner rommet (spør først om ulagret arbeid; actions.js) */
export function openSharedLinkDialog(open) {
  const input = h('input', { class: 'field share-link', placeholder: 'https://liminalsimulator.com/app/#room=…', autofocus: true });
  const error = h('p', { class: 'side-hint', role: 'alert' });
  const go = async () => {
    const code = shareCode(input.value);
    if (!code) {
      error.textContent = 'That does not look like a room link.';
      return false;
    }
    try {
      const level = await decodeLevel(code);
      await open(level);
      return true;
    } catch (e) {
      error.textContent = e.message;
      return false;
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    go().then((ok) => ok && modal.close());
  });
  const modal = openModal({
    title: 'Open shared link',
    body: h('div', {}, h('p', { text: 'Paste a room link someone has shared with you.' }), input, error),
    actions: [{ label: 'Cancel' }, { label: 'Open room', primary: true, onClick: go }],
  });
  return modal;
}
