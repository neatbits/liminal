// Rutespesifikke vindusflagg beholdes for editor, lys og lagring. Poolrooms tegner
// sammenhengende flagg med like høyder som én glassflate, uten stolper mellom rutene.
import { getTheme } from './themes.js';
import { windows, sameWindow } from './windows.js';

export function windowPanes(level) {
  const wins = windows(level);
  if (!getTheme(level.theme).window?.merge) return wins;
  const byCell = new Map(wins.map((w) => [`${w.x},${w.z}`, w]));
  const out = [];
  for (const first of wins) {
    if (first.left === 0) continue;
    const [ux, uz] = [-first.n[1], first.n[0]];
    let last = first, width = 1;
    while (last.right === 0) {
      const next = byCell.get(`${last.x + ux},${last.z + uz}`);
      if (!sameWindow(last, next)) break;
      last = next;
      width++;
    }
    out.push({ ...first, x: (first.x + last.x) / 2, z: (first.z + last.z) / 2, right: last.right, width });
  }
  return out;
}
