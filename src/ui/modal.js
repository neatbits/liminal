// Generisk modal dialog.
import { h } from './dom.js';

let current = null;

/**
 * @param o { title, body (Node), actions: [{ label, primary, onClick }] }
 *          onClick kan returnere false for å holde dialogen åpen.
 */
export function openModal({ title, body, actions = [], onClose }) {
  current?.close();
  const root = document.getElementById('modal-root');
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    if (current?.backdrop === backdrop) current = null;
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  const foot = actions.length
    ? h(
        'footer',
        { class: 'modal-foot' },
        actions.map((a) =>
          h('button', {
            type: 'button',
            class: a.primary ? 'btn btn-accent' : 'btn',
            text: a.label,
            onclick: async () => {
              if ((await a.onClick?.()) !== false) close();
            },
          }),
        ),
      )
    : null;
  const modal = h(
    'div',
    { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('header', { class: 'modal-head' }, h('h2', { text: title }), h('button', { type: 'button', class: 'modal-close', 'aria-label': 'Close', text: '×', onclick: () => close() })),
    h('div', { class: 'modal-body' }, body),
    foot,
  );
  const backdrop = h('div', { class: 'modal-backdrop', onmousedown: (e) => e.target === backdrop && close() }, modal);
  root.append(backdrop);
  document.addEventListener('keydown', onKey);
  current = { close, backdrop };
  (modal.querySelector('[autofocus]') ?? modal.querySelector('.btn-accent'))?.focus();
  return current;
}

/** Enkel ja/nei-dialog. */
export function confirmDialog(title, text, okLabel = 'Continue') {
  return new Promise((resolve) => {
    let answered = false;
    openModal({
      title,
      body: h('p', { text }),
      actions: [
        { label: 'Cancel', onClick: () => ((answered = true), resolve(false)) },
        { label: okLabel, primary: true, onClick: () => ((answered = true), resolve(true)) },
      ],
      onClose: () => !answered && resolve(false),
    });
  });
}
