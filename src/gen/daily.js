// Daily level: ett nytt nivå hver dag, likt for alle med samme dato. Tema, rom, det som er «feil» og
// tilfeldighetene videre (kassettene, view3d/daily.js) kommer fra et frø laget av datoen. Stemningen
// og størrelsen er faste, så alle har de samme vilkårene. Rekordene (beste tid per dag) lagres lokalt
// (core/storage.js); her er bare regnestykkene. Ren logikk.
import { THEME_IDS, getTheme } from '../core/themes.js';
import { mulberry32 } from '../core/rng.js';
import { generateLevel } from './index.js';
import { levelDims } from './sizes.js';
import { moodLevel } from './moods.js';

export const DAILY_MOOD = 'liminal';
const SITE = 'liminalsimulator.com';

/** Datoen som nøkkel, «2026-10-29» (lokal tid: dagen man spiller på). */
export function dailyKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** «29 Oct 2026». */
export function dailyLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
}

/** Tilfeldighetene for datoen (FNV-1a av nøkkelen som frø). */
export function dailyRand(key) {
  let h = 0x811c9dc5;
  for (const c of `liminal-daily:${key}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  return mulberry32(h >>> 0);
}

/** Nivået for datoen: { level, rand (videre, til kassettene), theme, label }. */
export function dailyLevel(key) {
  const rand = dailyRand(key);
  const theme = THEME_IDS[Math.floor(rand() * THEME_IDS.length)];
  const [w, h] = levelDims(theme, 1);
  const generated = generateLevel({ theme, w, h, seed: 1 + Math.floor(rand() * 1e9), name: `Daily ${key}` });
  const level = moodLevel(generated, DAILY_MOOD, rand) || generated;
  return { level, rand, theme, label: getTheme(theme).label };
}

/** «4:07» (eller «1:02:07»). */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n) => String(n).padStart(2, '0');
  const [h, m] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60)];
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Rekordene etter en fullført runde: { [key]: { best, plays } } (ny liste, den gamle er urørt). */
export function recordRun(records, key, seconds) {
  const old = records[key];
  return { ...records, [key]: { best: old ? Math.min(old.best, seconds) : seconds, plays: (old?.plays ?? 0) + 1 } };
}

/** Dager på rad med en fullført runde, til og med `key` (eller til og med i går, om ikke i dag ennå). */
export function streak(records, key) {
  const day = (k, d) => {
    const [y, m, dd] = k.split('-').map(Number);
    return dailyKey(new Date(y, m - 1, dd + d));
  };
  let k = records[key] ? key : day(key, -1);
  let n = 0;
  while (records[k]) {
    n++;
    k = day(k, -1);
  }
  return n;
}

/** Teksten man kan dele. */
export function shareText(key, seconds, tapes, days = 0) {
  const parts = [`Liminal Simulator · Daily ${key}`, `📼 ${tapes}/${tapes} in ${formatTime(seconds)}`];
  if (days > 1) parts.push(`${days} days in a row`);
  return `${parts.join(' · ')}\n${SITE}`;
}
