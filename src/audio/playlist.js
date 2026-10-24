// Spillelisten for musikken: sangene i music/ (tittel fra filnavnet), spilt i tilfeldig rekkefølge –
// alle én gang per runde, så stokkes de på nytt. Ren logikk – avspillingen ligger i music.js.

/** { 'path/Liminal Jazz.mp3': url, … } → [{ title, url }] sortert etter tittel. */
export function tracksFrom(files) {
  return Object.entries(files)
    .map(([path, url]) => ({ title: path.split('/').pop().replace(/\.[^.]+$/, ''), url }))
    .sort((a, b) => a.title.localeCompare(b.title, 'en', { numeric: true }));
}

/**
 * En runde: alle sangene én gang i tilfeldig rekkefølge (Fisher–Yates). last = sangen som nettopp
 * ble spilt – den kommer ikke først, så ingen sang spilles to ganger på rad.
 */
export function shuffled(count, rand = Math.random, last = -1) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (count > 1 && order[0] === last) [order[0], order[1]] = [order[1], order[0]];
  return order;
}
