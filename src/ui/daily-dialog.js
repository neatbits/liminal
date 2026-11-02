// Daily level (gen/daily.js): dialogen før man starter (dato, beste tid i dag, dager på rad) og
// resultatet etterpå (tid, beste, rekke og teksten man kan dele).
import { h } from './dom.js';
import { startPage } from './game-dialog.js';
import { formatTime } from '../gen/daily.js';

/** @param o { date, best (sekunder eller null), days, onStart, onBack } */
export function dailyDialog({ date, best, days, onStart, onBack }) {
  const body = h(
    'div',
    { class: 'daily start-body' },
    h('p', { class: 'start-kicker', text: 'REC ● 03:14 AM' }),
    h('h1', { class: 'start-title', text: 'Daily level' }),
    h('p', { class: 'daily-date', text: date }),
    h('p', { text: 'One new level every day – the same for everyone. Find every VHS tape, then get out through the door. The clock runs until you are through (not while paused).' }),
    best !== null ? h('p', { class: 'daily-best', text: `Your best today: ${formatTime(best)}${days > 1 ? ` · ${days} days in a row` : ''}` })
      : days > 0 ? h('p', { class: 'daily-best', text: `${days} ${days > 1 ? 'days' : 'day'} in a row – keep it going` }) : null,
    h('p', { class: 'side-hint', text: 'Mood: Liminal, the same for everybody.' }),
  );
  startPage({ title: 'Daily level', body, start: best !== null ? 'Play again' : 'Start', onStart, onBack });
}

/** @param r resultatet fra view3d/daily.js; again: spill på nytt; onBack: Close (ellers lukkes siden) */
export function dailyResultDialog(r, { again, onBack }) {
  const copy = h('button', { type: 'button', class: 'btn', text: 'Copy result' });
  const text = h('textarea', { class: 'field daily-share', readonly: true, rows: 3, 'aria-label': 'Result to share' });
  text.value = r.share;
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(r.share);
      copy.textContent = 'Copied';
    } catch {
      text.select(); // uten tilgang til utklippstavlen: merk teksten, så kan man kopiere selv
    }
  };
  const best = r.best < r.time ? `Your best today: ${formatTime(r.best)}` : r.plays > 1 ? 'A new best for today!' : null;
  const body = h(
    'div',
    { class: 'daily start-body' },
    h('h1', { class: 'start-title', text: 'Daily level' }),
    h('p', { class: 'daily-date', text: `${r.date} – ${r.label}` }),
    h('p', { class: 'daily-time', text: formatTime(r.time) }),
    h('p', { text: `📼 ${r.tapes}/${r.tapes} tapes${r.days > 1 ? ` · ${r.days} days in a row` : ''}` }),
    best ? h('p', { class: 'daily-best', text: best }) : null,
    r.saved ? null : h('p', { class: 'side-hint', text: 'Your time could not be saved – browser storage is blocked or full.' }),
    text,
    copy,
  );
  startPage({ title: 'Daily level complete', body, start: 'Play again', onStart: again, onBack, cancel: 'Close' });
}
