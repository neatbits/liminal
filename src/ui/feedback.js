// Felles tilbakemeldingsdialog på forsiden, About og i simulatoren.
import '../styles/overlays.css';
import '../styles/feedback.css';
import { h } from './dom.js';
import { openModal } from './modal.js';

const EMAIL = 'hello@liminalsimulator.com';
let draft = { category: 'suggestion', email: '', message: '' };

export function feedbackDialog({ endpoint, page }) {
  let controller = null;
  let sending = false;
  let closed = false;
  const category = h('select', { name: 'category' },
    [['suggestion', 'Suggestion'], ['bug', 'Bug report'], ['comment', 'Comment']].map(([value, text]) => h('option', { value, text, selected: value === draft.category })));
  const email = h('input', { name: 'email', type: 'email', maxlength: 254, autocomplete: 'email', value: draft.email, placeholder: 'Only if you would like a reply' });
  const message = h('textarea', { name: 'message', required: true, minlength: 10, maxlength: 4000, rows: 6, autofocus: true, placeholder: 'What could be better? If something broke, what happened?', text: draft.message });
  const website = h('input', { name: 'website', type: 'text', tabindex: '-1', autocomplete: 'off' });
  const status = h('p', { class: 'feedback-status', role: 'status', 'aria-live': 'polite' });
  const field = (label, input) => h('label', { class: 'feedback-field' }, h('span', { text: label }), input);
  const form = h('form', { class: 'feedback-form' },
    h('p', { text: 'Share an idea, leave a comment or report a bug.' }),
    field('Type', category), field('Your email (optional)', email), field('Message', message),
    h('label', { class: 'feedback-trap', 'aria-hidden': 'true' }, 'Leave this field empty', website),
    h('p', { class: 'feedback-note' }, `Your message and optional reply address will be emailed to ${EMAIL}. Your room is not included. `,
      h('a', { href: `mailto:${EMAIL}`, text: 'You can also email us directly.' })), status);
  const remember = () => { draft = { category: category.value, email: email.value, message: message.value }; };
  form.addEventListener('input', remember);
  form.addEventListener('change', remember);
  const modal = openModal({
    title: 'Suggestions & feedback', body: form,
    actions: [
      { label: 'Close' },
      { label: 'Send feedback', primary: true, onClick: () => { form.requestSubmit(); return false; } },
    ],
    onClose: () => { closed = true; controller?.abort(); },
  });
  const sendButton = modal.backdrop.querySelector('.btn-accent');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || closed) return;
    // HTML minlength gjelder bare brukerredigert tekst; sjekk også programmatisk fylte verdier.
    const length = Array.from(message.value.trim()).length;
    if (length < 10 || length > 4000) {
      status.textContent = 'Write between 10 and 4000 characters.';
      status.classList.add('error');
      message.focus();
      return;
    }
    sending = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Sending…';
    category.disabled = true;
    email.readOnly = message.readOnly = true;
    status.textContent = '';
    status.classList.remove('error');
    remember();
    const request = new AbortController();
    controller = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'omit', signal: request.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...draft, website: website.value, page }),
      });
      const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
      if (!response.ok || data?.ok !== true) throw new Error(data?.message || `Could not send right now. Please email ${EMAIL} instead.`);
      if (closed) return;
      draft = { category: 'suggestion', email: '', message: '' };
      form.replaceChildren(h('p', { role: 'status', text: 'Thanks! Your feedback has been submitted.' }), h('p', {}, h('a', { href: `mailto:${EMAIL}`, text: EMAIL })));
      sendButton.hidden = true;
    } catch (error) {
      if (!closed) {
        status.textContent = error.name === 'AbortError' ? `The request timed out. Please try again later or email ${EMAIL}.` : error.message;
        status.classList.add('error');
      }
    } finally {
      clearTimeout(timeout);
      sending = false;
      sendButton.disabled = false;
      sendButton.textContent = 'Send feedback';
      category.disabled = false;
      email.readOnly = message.readOnly = false;
      controller = null;
    }
  });
}

export function bindFeedback(options) {
  for (const button of document.querySelectorAll('[data-feedback]')) button.addEventListener('click', () => feedbackDialog(options));
}
