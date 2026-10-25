// Adressene i programmet (desktop/main.mjs): bygget i dist/ vises under app://liminal/, så
// lagring (localStorage), henting av modeller og musikk og relative lenker virker som på nettsiden.
// Ren logikk – ingen Electron, så den kan testes i Node (test/desktop-files.test.js).
import path from 'node:path';

export const SCHEME = 'app';
export const HOST = 'liminal';
export const START = `${SCHEME}://${HOST}/app/index.html`; // rett i simulatoren, ikke forsiden
export const FEEDBACK = 'https://liminalsimulator.com/api/feedback.php';

/** Filen i bygget for en app://-adresse, eller null (annen vert, eller utenfor bygget). Mappe → index.html. */
export function fileFor(url, root) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== `${SCHEME}:` || u.host !== HOST) return null;
  let p;
  try {
    p = decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(root, `.${p}`);
  const rel = path.relative(root, file);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? file : null;
}

/** Tilbakemeldingsskjemaet (../api/feedback.php): sendes videre til nettstedet. */
export const isFeedback = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === `${SCHEME}:` && u.host === HOST && u.pathname === '/api/feedback.php';
  } catch {
    return false;
  }
};

/** Lenker ut av programmet (krediteringer, kilder, e-post) åpnes i nettleseren, ikke i vinduet. */
export const isExternal = (url) => /^(https?:|mailto:)/i.test(url);
