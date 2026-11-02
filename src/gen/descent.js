// The Descent: ett forsøk, stadig dypere. Lykten har et batteri som tømmes, og det blir verre for hvert nivå: mørkere,
// flere kassetter å finne, og fra et visst dyp tar skikkelsen deg, og da er forsøket over. Ren logikk.
export const DESCENT = {
  BATTERY: 200, // s med lykten på, på fullt batteri
  CHARGE: 0.45, // et nytt batteri fyller så mye
  LETHAL: 4, // fra dette nivået tar skikkelsen deg
  SCALE: 0.8, // nivåene er litt mindre enn vanlig: man skal videre
};

const MOODS = [[1, 'abandoned'], [2, 'liminal'], [4, 'uncanny'], [7, 'nightmare']];

/** Stemningen på nivået. */
export function descentMood(depth) {
  return MOODS.filter(([from]) => depth >= from).at(-1)[1];
}

/** Kassetter som må finnes før døren åpner seg. */
export const descentTapes = (depth) => Math.min(3, 1 + Math.floor(depth / 3));

/** Batterier på nivået: flere i starten, så man rekker å lære, og sjeldnere etter hvert. */
export const descentBatteries = (depth) => (depth < 3 ? 2 : 1);

/** Tar skikkelsen deg her? */
export const descentLethal = (depth) => depth >= DESCENT.LETHAL;

/** Batteriet etter dt sekunder med lykten på (0..1). */
export const drained = (battery, dt) => Math.max(0, battery - dt / DESCENT.BATTERY);

/** Et nytt batteri. */
export const charged = (battery) => Math.min(1, battery + DESCENT.CHARGE);

/** Rekorden: { runs, bestDepth, bestTime (raskeste til det dypeste nivået), tapes (mest i ett forsøk) }. */
export function recordDescent(records = {}, { depth, time, tapes }) {
  const deeper = depth > (records.bestDepth ?? 0);
  const same = depth === records.bestDepth;
  return {
    runs: (records.runs ?? 0) + 1,
    bestDepth: Math.max(records.bestDepth ?? 0, depth),
    bestTime: deeper ? time : same ? Math.min(records.bestTime ?? Infinity, time) : records.bestTime ?? null,
    tapes: Math.max(records.tapes ?? 0, tapes),
  };
}
