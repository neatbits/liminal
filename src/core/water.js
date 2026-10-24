// Bakgrunnsbølger: 1 beholder temaets uttrykk, 0 gir stille vann mellom plask og bevegelse.
export function waveStrength(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
}
