// Generisk modal dialog.
import { h } from './dom.js';

let current = null;

/**
 * @param o { title, body (Node), actions: [{ label, primary, onClick }] }
 *          onClick kan returnere false for å holde dialogen åpen.
 */
export function openModal({ title, body, actions = [], onClose }) {
  current?.close();
  const previousFocus = document.activeElement;
  let closed = false;
  const root = document.getElementById('modal-root');
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('focusin', onFocus);
    if (current?.backdrop === backdrop) current = null;
    if (!current && previousFocus?.isConnected) previousFocus.focus();
    onClose?.();
  };
  const focusable = () => [...modal.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
    .filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
  const onFocus = (e) => {
    if (!modal.contains(e.target)) (focusable()[0] ?? modal).focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    } else if (e.key === 'Tab') {
      const items = focusable();
      const at = items.indexOf(document.activeElement);
      if (!items.length || at < 0 || (!e.shiftKey && at === items.length - 1) || (e.shiftKey && at === 0)) {
        e.preventDefault();
        (items[e.shiftKey ? items.length - 1 : 0] ?? modal).focus();
      }
    }
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
    { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' },
    h('header', { class: 'modal-head' }, h('h2', { text: title }), h('button', { type: 'button', class: 'modal-close', 'aria-label': 'Close', text: '×', onclick: () => close() })),
    h('div', { class: 'modal-body' }, body),
    foot,
  );
  const backdrop = h('div', { class: 'modal-backdrop', onmousedown: (e) => e.target === backdrop && close() }, modal);
  root.append(backdrop);
  document.addEventListener('keydown', onKey);
  document.addEventListener('focusin', onFocus);
  current = { close, backdrop };
  (modal.querySelector('[autofocus]') ?? modal.querySelector('.btn-accent') ?? focusable()[0] ?? modal).focus();
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
