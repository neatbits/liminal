// Sidene før og etter Spot the wrong og The Descent, i samme stil som de andre spillsidene (ui/game-dialog.js).
import { h } from './dom.js';
import { startPage } from './game-dialog.js';
import { formatTime } from '../gen/daily.js';
import { SPOT } from '../gen/spot.js';

const page = (title, ...rest) => h('div', { class: 'daily start-body' },
  h('p', { class: 'start-kicker', text: 'REC ● 03:14 AM' }), h('h1', { class: 'start-title', text: title }), ...rest);

/** @param o { records ({ wins, bestTime, bestStreak }), onStart, onBack } */
export function spotDialog({ records = {}, onStart, onBack }) {
  const { wins = 0, bestTime = null, bestStreak = 0 } = records;
  const body = page('Spot the wrong',
    h('p', { text: 'The same corridor, again and again. If everything is as it was, go on through the far door. If anything is wrong, turn around and leave through the door behind you.' }),
    h('p', { text: `${SPOT.GOAL} right in a row and you are out. One mistake, and you start from zero.` }),
    bestStreak ? h('p', { class: 'daily-best', text: wins ? `Escaped ${wins} ${wins > 1 ? 'times' : 'time'} · best ${formatTime(bestTime)}` : `Your best: ${bestStreak} in a row` }) : null);
  startPage({ title: 'Spot the wrong', body, start: 'Start', onStart, onBack });
}

/** @param o { records ({ runs, bestDepth, tapes }), onStart, onBack } */
export function descentDialog({ records = {}, onStart, onBack }) {
  const body = page('The Descent',
    h('p', { text: 'One life. Find the tapes to open the door, and keep going down. Every level is darker than the last.' }),
    h('p', { text: 'Your flashlight (F) runs on a battery, so look for new ones. From level 4, something down there can end the run. Hide in the crawlways (C): it cannot follow you in.' }),
    records.bestDepth ? h('p', { class: 'daily-best', text: `Deepest so far: level ${records.bestDepth} · ${records.runs} ${records.runs > 1 ? 'runs' : 'run'}` }) : null);
  startPage({ title: 'The Descent', body, start: 'Go down', onStart, onBack });
}

/** @param o { records ({ runs, bestDepth }), onStart, onBack } */
export function noclipDialog({ records = {}, onStart, onBack }) {
  const body = page('Noclip',
    h('p', { text: 'A furniture store on an ordinary afternoon. Look around. Somewhere in the storeroom, a square is drawn on the wall – lean against it.' }),
    h('p', { text: 'Behind it the yellow rooms begin, and they never end – no doors out, just further in. Go as far as you can, or find your way back. The further you go, the stranger it gets.' }),
    records.bestDepth ? h('p', { class: 'daily-best', text: `Furthest so far: ${records.bestDistance ?? 0} m, level ${records.bestDepth} · ${records.runs} ${records.runs > 1 ? 'runs' : 'run'}` }) : null);
  startPage({ title: 'Noclip', body, start: 'Go to the store', onStart, onBack });
}

/** Resultatet (view3d/spot.js, view3d/descent.js). again: spill på nytt; onBack: Close. */
export function runResultDialog(r, { again, onBack }) {
  const unsaved = r.saved ? null : h('p', { class: 'side-hint', text: 'Your result could not be saved – storage is blocked or full.' });
  const body = r.mode === 'spot'
    ? page('You got out',
      h('p', { class: 'daily-time', text: formatTime(r.time) }),
      h('p', { text: `${SPOT.GOAL} in a row, in ${r.turns} walks.` }),
      r.bestTime < r.time ? h('p', { class: 'daily-best', text: `Your best: ${formatTime(r.bestTime)}` }) : h('p', { class: 'daily-best', text: 'A new best!' }),
      unsaved)
    : page('It got you',
      h('p', { class: 'daily-time', text: `Level ${r.depth}` }),
      h('p', { text: `📼 ${r.tapes} tapes · ⏱ ${formatTime(r.time)}` }),
      h('p', { class: 'daily-best', text: r.record ? 'Your deepest yet!' : `Your deepest: level ${r.bestDepth}` }),
      unsaved);
  startPage({ title: r.mode === 'spot' ? 'Spot the wrong complete' : 'The Descent is over', body, start: 'Play again', onStart: again, onBack, cancel: 'Close' });
}
