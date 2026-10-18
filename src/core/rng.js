// Deterministisk tilfeldighet (mulberry32) slik at generatorer og teksturer kan gjenskapes.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Heltall i [min, max] (begge inkludert). */
export function randInt(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

export function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

export function randomSeed() {
  return (Math.random() * 2 ** 31) >>> 0;
}
