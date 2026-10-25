// Om programmet starter i fullskjerm (standard) eller i et vindu: valget med F11 / View-menyen
// huskes i window.json i programmets brukermappe. Bare Node (fs), ingen Electron – testes i
// test/desktop-files.test.js.
import fs from 'node:fs';
import path from 'node:path';

const FILE = 'window.json';
export const DEFAULT_STATE = Object.freeze({ fullscreen: true });

export function loadWindowState(dir) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, FILE), 'utf8'));
    return { fullscreen: typeof data?.fullscreen === 'boolean' ? data.fullscreen : DEFAULT_STATE.fullscreen };
  } catch {
    return { ...DEFAULT_STATE }; // første oppstart, eller en ødelagt fil
  }
}

export function saveWindowState(dir, state) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, FILE), JSON.stringify({ fullscreen: !!state.fullscreen }));
    return true;
  } catch {
    return false; // f.eks. skrivebeskyttet mappe: valget gjelder bare denne gangen
  }
}
