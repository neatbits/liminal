import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { START, fileFor, isFeedback, isExternal } from '../desktop/files.mjs';
import { loadWindowState, saveWindowState } from '../desktop/window-state.mjs';
import fs from 'node:fs';
import os from 'node:os';

const root = path.resolve('dist');

describe('programmet (Electron): adressene', () => {
  it('app://liminal/ er bygget i dist/, mapper gir index.html, og programmet starter i simulatoren', () => {
    expect(fileFor(START, root)).toBe(path.join(root, 'app', 'index.html'));
    expect(fileFor('app://liminal/', root)).toBe(path.join(root, 'index.html'));
    expect(fileFor('app://liminal/about/', root)).toBe(path.join(root, 'about', 'index.html'));
    expect(fileFor('app://liminal/assets/app-1.js?v=2#x', root)).toBe(path.join(root, 'assets', 'app-1.js'));
    expect(fileFor('app://liminal/assets/My%20Font.woff2', root)).toBe(path.join(root, 'assets', 'My Font.woff2'));
  });

  it('ingenting utenfor bygget eller fra andre verter', () => {
    // «..» normaliseres bort eller blir værende inne i bygget – aldri en fil utenfor dist/.
    for (const url of ['app://liminal/../package.json', 'app://liminal/%2e%2e/package.json', 'app://liminal/assets/..%2f..%2fpackage.json', 'app://liminal/assets/..%5c..%5cpackage.json']) {
      const file = fileFor(url, root);
      expect(file === null || file.startsWith(root + path.sep), `${url} → ${file}`).toBe(true);
    }
    for (const url of [
      'app://other/app/index.html',
      'file:///C:/Windows/win.ini',
      'https://liminalsimulator.com/',
      'app://liminal/%E0%A4%A',
      'not a url',
    ]) {
      expect(fileFor(url, root), url).toBeNull();
    }
  });

  it('tilbakemeldinger går til nettstedet, og lenker ut åpnes i nettleseren', () => {
    expect(isFeedback('app://liminal/api/feedback.php')).toBe(true);
    expect(isFeedback('app://other/api/feedback.php')).toBe(false);
    expect(isFeedback('app://liminal/api/feedback-lib.php')).toBe(false);
    expect(isExternal('https://sketchfab.com/3d-models/x')).toBe(true);
    expect(isExternal('mailto:hello@liminalsimulator.com')).toBe(true);
    expect(isExternal('app://liminal/about/')).toBe(false);
  });
});

describe('programmet (Electron): fullskjerm', () => {
  it('starter i fullskjerm, husker F11-valget, og en ødelagt fil gir standard', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liminal-window-'));
    try {
      expect(loadWindowState(dir)).toEqual({ fullscreen: true }); // første oppstart
      expect(saveWindowState(dir, { fullscreen: false })).toBe(true);
      expect(loadWindowState(dir)).toEqual({ fullscreen: false });
      saveWindowState(dir, { fullscreen: true });
      expect(loadWindowState(dir)).toEqual({ fullscreen: true });
      fs.writeFileSync(path.join(dir, 'window.json'), '{ ødelagt');
      expect(loadWindowState(dir)).toEqual({ fullscreen: true });
      fs.writeFileSync(path.join(dir, 'window.json'), '{"fullscreen":"ja"}');
      expect(loadWindowState(dir)).toEqual({ fullscreen: true });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
